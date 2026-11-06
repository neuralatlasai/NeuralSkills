import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore,reserve } from './store.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const runDir=mkdtempSync(join(root,'verification-'));
const checks=[];
const request={tenant:'north',item:'part-7',quantity:4,version:1};
const snapshot=db=>({stock:db.prepare('SELECT * FROM stock ORDER BY tenant,item').all(),allocations:db.prepare('SELECT * FROM allocations ORDER BY id').all()});
async function check(id,fn) {
 try{checks.push({id,status:'PASS',evidence:await fn()});}
 catch(error){checks.push({id,status:'FAIL',evidence:{message:error.message,stack:error.stack}});}
}
await check('runtime',async()=>{
 const db=openStore(join(runDir,'runtime.sqlite'));const result={node:process.version,sqlite:db.prepare('select sqlite_version() version').get().version,platform:process.platform,arch:process.arch,journal:db.prepare('PRAGMA journal_mode').get(),busyTimeout:db.prepare('PRAGMA busy_timeout').get()};db.close();return result;
});
for(const connections of [1,2])await check(`forced-race-${connections}-connection`,async()=>{
 const file=join(runDir,`race-${connections}.sqlite`);const db=openStore(file),other=connections===1?db:openStore(file);
 let arrivals=0,release;const gate=new Promise(r=>release=r);const afterRead=async()=>{if(++arrivals===2)release();await gate;};
 const results=await Promise.all([reserve(db,request,{afterRead}),reserve(other,request,{afterRead})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal(arrivals,2);const state=snapshot(db);
 assert.equal(state.stock[0].available,1);assert.equal(state.stock[0].version,2);assert.equal(state.stock[1].available,100);assert.equal(state.stock[1].version,1);assert.equal(state.allocations.length,1);assert.equal(state.allocations[0].quantity,4);
 if(other!==db)other.close();db.close();const reopened=openStore(file);assert.deepEqual(snapshot(reopened),state);reopened.close();return{file,arrivals,results,state,reopen:'identical'};
});
await check('fault-rollback-reopen-retry',async()=>{
 const file=join(runDir,'fault.sqlite');let db=openStore(file);const before=snapshot(db);let observed;const injected=new Error('injected afterWrite fault');
 await assert.rejects(reserve(db,{...request,quantity:2},{afterWrite:()=>{observed=snapshot(db);throw injected;}}),e=>e===injected);
 assert.equal(observed.stock[0].available,3);assert.equal(observed.allocations.length,0);assert.deepEqual(snapshot(db),before);
 const retry=await reserve(db,{...request,quantity:2});assert.deepEqual(retry,{status:201,available:3,version:2});const after=snapshot(db);db.close();db=openStore(file);assert.deepEqual(snapshot(db),after);db.close();
 return{file,injected:injected.message,insideFault:observed,rolledBack:before,retry,after,reopen:'identical'};
});
await check('validation-and-tenant-scope',async()=>{
 const db=openStore(join(runDir,'validation.sqlite'));const before=snapshot(db);const results=[];
 for(const quantity of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'4',null,NaN,Infinity]){const r=await reserve(db,{...request,quantity});assert.equal(r.status,400);results.push({quantity:String(quantity),status:r.status});}
 for(const change of [{version:0},{version:2},{version:'1'},{quantity:6}])assert.equal((await reserve(db,{...request,...change})).status,409);
 for(const change of [{tenant:'unknown'},{item:'unknown'}])assert.equal((await reserve(db,{...request,...change})).status,404);
 assert.deepEqual(snapshot(db),before);const south=await reserve(db,{...request,tenant:'south',quantity:2});assert.deepEqual(south,{status:201,available:98,version:2});const after=snapshot(db);assert.equal(after.stock[0].available,5);assert.equal(after.allocations[0].tenant,'south');db.close();return{invalidQuantities:results,staleAndInsufficient:409,missing:404,south,after};
});
await check('busy-lock-acquisition-retry',async()=>{
 const file=join(runDir,'busy.sqlite'),owner=openStore(file),contender=openStore(file);owner.exec('BEGIN IMMEDIATE');let actualBusy;
 try{contender.exec('BEGIN IMMEDIATE');assert.fail('Expected SQLite lock contention');}catch(error){actualBusy={code:error.code,errcode:error.errcode,message:error.message};assert.equal(error.errcode&255,5);}
 let released=false;setTimeout(()=>{owner.exec('ROLLBACK');released=true;},20);const started=performance.now();const result=await reserve(contender,{...request,quantity:1});const elapsedMs=performance.now()-started;
 assert.equal(released,true);assert.equal(result.status,201);const state=snapshot(contender);assert.equal(state.allocations.length,1);owner.close();contender.close();return{file,actualBusy,released,result,elapsedMs,state};
});
await check('busy-exhaustion-no-mutation',async()=>{
 const file=join(runDir,'busy-exhausted.sqlite'),owner=openStore(file),contender=openStore(file);const before=snapshot(owner);owner.exec('BEGIN IMMEDIATE');const started=performance.now();const result=await reserve(contender,{...request,quantity:1});const elapsedMs=performance.now()-started;
 assert.equal(result.status,409);owner.exec('ROLLBACK');assert.deepEqual(snapshot(contender),before);const retry=await reserve(contender,{...request,quantity:1});assert.equal(retry.status,201);owner.close();contender.close();return{file,result,elapsedMs,retry};
});
const report={runDir,checks};writeFileSync(join(root,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(checks.some(c=>c.status==='FAIL'))process.exitCode=1;
