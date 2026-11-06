import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Worker} from 'node:worker_threads';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {init,enqueue,claim,complete,readJobs} from './service.ts';
const directory=mkdtempSync(join(tmpdir(),'lease-fixed-')); let sequence=0;
const fixture=()=>{const path=join(directory,`${sequence++}.db`);init(path);return path;};
const add=(path,id,dueAt=0)=>enqueue(path,{id,payload:`payload:${id}`,dueAt});
const options=(now=0,worker='a',leaseMs=10)=>({now,worker,leaseMs});
const child=(action,path,data={})=>{const result=spawnSync(process.execPath,[fileURLToPath(new URL('./worker.mjs',import.meta.url)),action,path,JSON.stringify(data)],{encoding:'utf8',timeout:5000});assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);};
const tests=[]; async function test(name,fn){await fn();tests.push(name);console.log(`PASS ${name}`);}
try{
  const v=new DatabaseSync(':memory:');console.log(JSON.stringify({node:process.version,sqlite:v.prepare('SELECT sqlite_version() AS version').get().version}));v.close();
  await test('B2-R1: Promise callers and eligibility/order/future starvation',async()=>{
    const p=fixture();add(p,'future',100);add(p,'b',0);add(p,'a',0);
    const [a,b]=await Promise.all([claim(p,options()),claim(p,options(0,'b'))]);
    assert.equal(a.id,'a');assert.equal(b.id,'b');assert.equal(a.payload,'payload:a');assert.deepEqual(Object.keys(a),['id','worker','token','leaseUntil','payload']);
    assert.equal(await claim(p,options()),null);assert.equal((await claim(p,options(100))).id,'a');
    const q=fixture();add(q,'one');const pair=await Promise.all([claim(q,options()),claim(q,options(0,'b'))]);assert.equal(pair.filter(Boolean).length,1);
  });
  await test('B2-R1: three real 8-connection synchronized races',async()=>{
    for(let run=0;run<3;run++){
      const p=fixture();add(p,'one');let release;const gate=new Promise(r=>release=r);let ready=0;
      const outcomes=await Promise.all(Array.from({length:8},(_,i)=>new Promise((resolve,reject)=>{
        const w=new Worker(new URL('./worker.mjs',import.meta.url),{workerData:{path:p,options:options(0,`worker-${i}`)}});
        const timer=setTimeout(()=>{w.terminate();reject(new Error('worker timeout'));},8000);
        w.on('error',reject);w.on('message',async message=>{if(message.ready){ready++;if(ready===8)release();await gate;w.postMessage('claim');}else{clearTimeout(timer);if(message.error)reject(new Error(message.error));else resolve(message.value);}});
      })));
      const winners=outcomes.filter(Boolean);assert.equal(winners.length,1);const stored=readJobs(p)[0];assert.equal(stored.worker,winners[0].worker);assert.equal(stored.token,1);console.log(JSON.stringify({run,attempts:8,winner:winners[0],stored}));
    }
  });
  await test('B2-R2: expiry boundary, fresh fencing, wrong owner/token, immutable done',async()=>{
    const p=fixture();add(p,'one');const a=await claim(p,options());
    assert.equal(complete(p,{...a,worker:'forged'},'bad',{now:1}),false);
    assert.equal(complete(p,{...a,token:2},'bad',{now:1}),false);
    assert.equal(complete(p,a,'expired',{now:10}),false);assert.equal(readJobs(p)[0].result,null);
    const b=await claim(p,options(10,'b'));assert.equal(b.token,a.token+1);
    const before=readJobs(p);assert.equal(complete(p,a,'stale',{now:11}),false);assert.deepEqual(readJobs(p),before);
    assert.equal(complete(p,b,'good',{now:19}),true);assert.equal(complete(p,b,'overwrite',{now:19}),false);
    assert.equal(await claim(p,options(1000)),null);assert.equal(readJobs(p)[0].result,'good');
  });
  await test('B2-R3: independent process restarts persist ownership and completion',()=>{
    const p=fixture();add(p,'one');const a=child('claim',p,options(0,'old'));
    assert.equal(child('claim',p,options(9,'new')),null);
    const b=child('claim',p,options(10,'new'));assert.equal(b.token,a.token+1);
    assert.equal(complete(p,a,'stale',{now:11}),false);
    assert.equal(child('complete',p,{claim:b,result:'persisted',options:{now:11}}),true);
    assert.equal(child('read',p)[0].result,'persisted');assert.equal(child('claim',p,options(100)),null);
  });
  await test('B2-R3: invalid leases reject and injected now governs time',async()=>{
    const p=fixture();add(p,'one',100);
    for(const leaseMs of [0,-1,0.1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) await assert.rejects(claim(p,options(99,'a',leaseMs)),RangeError);
    assert.equal(await claim(p,options(99)),null);assert.equal((await claim(p,options(100))).leaseUntil,110);
    assert.equal(await claim(p,options(109,'b')),null);assert.equal((await claim(p,options(110,'b'))).token,2);
  });
  await test('B2-R3: busy wait bounded; recovery and error exits close connections',async()=>{
    const p=fixture();add(p,'one');const lock=new DatabaseSync(p);lock.exec('BEGIN IMMEDIATE');const start=performance.now();
    try{await assert.rejects(claim(p,options()),/locked/);}finally{lock.exec('ROLLBACK');lock.close();}
    const elapsedMs=performance.now()-start;assert.ok(elapsedMs<2000,`${elapsedMs}ms`);console.log(JSON.stringify({busyWaitMs:elapsedMs,configuredTimeoutMs:250,retries:0}));
    assert.ok(await claim(p,options()));assert.throws(()=>init(p),/already exists/);
    assert.throws(()=>enqueue(p,{id:'one',payload:'duplicate',dueAt:0}),/UNIQUE/);assert.equal(readJobs(p).length,1);
    const broken=join(directory,'missing-schema.db');await assert.rejects(claim(broken,options()),/no such table/);rmSync(broken);
  });
  console.log(JSON.stringify({status:'PASS',tests:tests.length,passed:tests}));
}finally{rmSync(directory,{recursive:true,force:true});}
