import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { openStore,createService } from './service.mjs';
const dir=dirname(fileURLToPath(import.meta.url));
const runDir=join(dir,'verification-'+Date.now());mkdirSync(runDir);
const file=join(runDir,'tickets.sqlite');
let db=openStore(file),server=createService(db),base;
const evidence={started:new Date().toISOString(),node:process.version,sqlite:db.prepare('select sqlite_version() version').get().version,platform:process.platform,arch:process.arch,database:file,checks:[],requests:[]};
async function listen(){server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;}
async function close(){await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));db.close();}
async function call(method,path='/tickets/t1',body,token='north-editor',headers={}) {
 const init={method,headers:{...(token?{authorization:'Bearer '+token}:{}),...headers}};
 if(body!==undefined){init.body=typeof body==='string'?body:JSON.stringify(body);if(!Object.keys(headers).some(k=>k.toLowerCase()==='content-type'))init.headers['content-type']='application/json';}
 const res=await fetch(base+path,init);const text=await res.text();const json=JSON.parse(text);
 assert.match(res.headers.get('content-type'),/^application\/json/);
 evidence.requests.push({method,path,body,token,headers,status:res.status,response:json});return {status:res.status,body:json};
}
async function check(id,fn){try{await fn();evidence.checks.push({id,status:'PASS'});console.log('PASS '+id);}catch(error){evidence.checks.push({id,status:'FAIL',error:error.stack});console.error('FAIL '+id,error.stack);throw error;}}
try {
 await listen();
 await check('GET-compatibility',async()=>assert.deepEqual(await call('GET'),{status:200,body:{id:'t1',title:'Printer jam',note:'Call support',version:1}}));
 await check('authentication-permission',async()=>{
  assert.equal((await call('GET','/tickets/t1',undefined,null)).status,401);
  assert.equal((await call('PATCH','/tickets/t1',{version:1,title:'blocked'},null)).status,401);
  assert.equal((await call('PATCH','/tickets/t1',{version:1,title:'blocked'},'north-reader')).status,403);
 });
 await check('schema-errors',async()=>{
  for(const body of [null,[],{}, {version:0},{version:-1},{version:1.5},{version:'1'},{version:9007199254740992},{version:1,title:null},{version:1,title:2},{version:1,title:' '},{version:1,title:'x'.repeat(121)},{version:1,note:42},{version:1,note:'x'.repeat(501)},{version:1,tenant:'south'},{version:1,id:'t2'},{version:1,write:true},JSON.parse('{"version":1,"__proto__":{}}')])assert.equal((await call('PATCH','/tickets/t1',JSON.stringify(body))).status,400);
  assert.equal((await call('PATCH','/tickets/t1','{')).status,400);
  assert.equal((await call('PATCH','/tickets/t1','')).status,400);
  const result=await new Promise((resolve,reject)=>{
   const req=request(base+'/tickets/t1',{method:'PATCH',headers:{authorization:'Bearer north-editor','content-type':'application/json'}},res=>{let value='';res.on('data',c=>value+=c);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(value)}));});
   req.on('error',reject);req.end(Buffer.from([123,34,120,34,58,34,255,34,125]));
  });assert.equal(result.status,400);evidence.requests.push({method:'PATCH',transport:'actual HTTP invalid UTF-8',...result});
 });
 await check('media-type-and-byte-limit',async()=>{
  assert.equal((await call('PATCH','/tickets/t1',{version:1},'north-editor',{'content-type':'text/plain'})).status,415);
  const exact=JSON.stringify({version:1})+' '.repeat(2048-JSON.stringify({version:1}).length);
  assert.equal((await call('PATCH','/tickets/t1',exact)).status,200);
  assert.equal((await call('PATCH','/tickets/t1',exact+' ')).status,413);
  assert.equal((await call('PATCH','/tickets/t1',JSON.stringify({version:2,note:'é'.repeat(1100)}))).status,413);
  const url=new URL(base+'/tickets/t1');
  const result=await new Promise((resolve,reject)=>{
   const req=request(url,{method:'PATCH',headers:{authorization:'Bearer north-editor','content-type':'application/json','transfer-encoding':'chunked'}},res=>{let value='';res.on('data',c=>value+=c);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(value)}));});
   req.on('error',reject);req.write(' '.repeat(1024));req.write(' '.repeat(1024));req.end(' ');
  });assert.equal(result.status,413);evidence.requests.push({method:'PATCH',transport:'actual chunked HTTP',bytes:2049,...result});
 });
 await check('title-note-absence-null-projection',async()=>{
  const first=await call('PATCH','/tickets/t1',{version:2,title:'  Repaired  '},'north-editor',{'x-tenant':'south'});
  assert.deepEqual(first,{status:200,body:{id:'t1',title:'Repaired',note:'Call support',version:3}});
  const cleared=await call('PATCH','/tickets/t1',{version:3,note:null});assert.deepEqual(cleared.body,{id:'t1',title:'Repaired',note:null,version:4});
  const boundary=await call('PATCH','/tickets/t1',{version:4,title:'a'.repeat(120),note:'b'.repeat(500)});assert.equal(boundary.status,200);assert.equal(boundary.body.version,5);
  assert.deepEqual(Object.keys(boundary.body).sort(),['id','note','title','version']);
 });
 await check('tenant-object-boundaries',async()=>{
  assert.deepEqual((await call('GET','/tickets/t1',undefined,'south-editor',{'x-tenant':'north'})).body,{id:'t1',title:'Private account',note:null,version:1});
  db.prepare('INSERT INTO tickets(tenant,id,title) VALUES(?,?,?)').run('south','south-only','Hidden');
  assert.equal((await call('GET','/tickets/south-only',undefined,'north-editor',{'x-tenant':'south'})).status,404);
  assert.equal((await call('PATCH','/tickets/south-only',{version:1,title:'stolen'},'north-editor',{'x-tenant':'south'})).status,404);
  assert.equal((await call('PATCH','/tickets/missing',{version:1,title:'new'})).status,404);
 });
 await check('same-version-concurrency',async()=>{
  const results=await Promise.all([call('PATCH','/tickets/t1',{version:5,title:'Winner A'}),call('PATCH','/tickets/t1',{version:5,title:'Winner B'})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const winner=results.find(r=>r.status===200);assert.equal(winner.body.version,6);assert.deepEqual((await call('GET')).body,winner.body);
  assert.equal((await call('PATCH','/tickets/t1',{version:5,note:'stale'})).status,409);
  evidence.winner=winner.body;
 });
 await check('persistence-close-reopen',async()=>{
  await close();db=openStore(file);server=createService(db);await listen();
  assert.deepEqual((await call('GET')).body,evidence.winner);
  assert.equal((await call('GET','/tickets/t1',undefined,'south-editor')).body.title,'Private account');
  assert.equal((await call('GET','/tickets/south-only',undefined,'north-editor')).status,404);
  assert.equal((await call('GET','/tickets/south-only',undefined,'south-editor')).body.title,'Hidden');
  assert.equal((await call('PATCH','/tickets/t1',{version:5,title:'stale after reopen'})).status,409);
 });
 await check('bounded-parser-config',async()=>{
  assert.equal(server.requestTimeout,10000);assert.equal(server.headersTimeout,5000);assert.equal(server.timeout,15000);
 });
} catch(error) {evidence.failure=error.stack;process.exitCode=1;}
finally {
 try{await close();}catch(error){evidence.closeFailure=error.stack;process.exitCode=1;}
 evidence.finished=new Date().toISOString();writeFileSync(join(dir,'verification.json'),JSON.stringify(evidence,null,2));
 console.log(JSON.stringify({node:evidence.node,sqlite:evidence.sqlite,platform:evidence.platform,arch:evidence.arch,checks:evidence.checks,database:file}));
}
