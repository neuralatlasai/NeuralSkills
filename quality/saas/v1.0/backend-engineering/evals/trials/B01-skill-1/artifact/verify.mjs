import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { writeFileSync,rmSync } from 'node:fs';
import { openStore,createService } from './service.mjs';
const evidence={runtime:process.version,startedUtc:new Date().toISOString(),checks:[]};
const file=resolve(import.meta.dirname,'../verification.sqlite');
rmSync(file,{force:true});
let db,server,base;
async function start(){db=openStore(file);server=createService(db);server.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;}
async function stop(){if(server){await new Promise((r,j)=>server.close(e=>e?j(e):r()));server=null;}if(db){db.close();db=null;}}
async function request(method='GET',body,opts={}){
 const headers={...(opts.token===null?{}:{authorization:`Bearer ${opts.token??'north-editor'}`}),...(method==='PATCH'?{'content-type':'application/json'}:{}),...opts.headers};
 const response=await fetch(base+(opts.path??'/tickets/t1'),{method,headers,body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});
 const value=await response.json();assert.match(response.headers.get('content-type'),/application\/json/);return {status:response.status,value};
}
async function check(name,fn){try{const detail=await fn();evidence.checks.push({name,status:'PASS',detail});console.log(`PASS ${name}`);}catch(error){evidence.checks.push({name,status:'FAIL',error:error.stack});throw error;}}
async function expect(status,body,opts={}){const r=await request('PATCH',body,opts);assert.equal(r.status,status,JSON.stringify(r));return r;}
try{
 await start();
 await check('GET baseline and projection',async()=>{const r=await request();assert.deepEqual(r,{status:200,value:{id:'t1',title:'Printer jam',note:'Call support',version:1}});return r;});
 await check('identity and function denial',async()=>{assert.equal((await request('GET',undefined,{token:null})).status,401);await expect(401,{version:1},{token:'unknown'});await expect(403,{version:1,title:'denied'},{token:'north-reader'});});
 await check('PATCH trim absence null and version-only',async()=>{let r=await expect(200,{version:1,title:'  Changed  '});assert.deepEqual(r.value,{id:'t1',title:'Changed',note:'Call support',version:2});r=await expect(200,{version:2,note:null});assert.deepEqual(r.value,{id:'t1',title:'Changed',note:null,version:3});r=await expect(200,{version:3});assert.equal(r.value.version,4);return r;});
 await check('schema rejects without mutation',async()=>{const bad=[null,[],{}, {version:0},{version:-1},{version:1.1},{version:'4'},{version:9007199254740992},{version:4,title:null},{version:4,title:''},{version:4,title:'  '},{version:4,title:'x'.repeat(121)},{version:4,note:3},{version:4,note:'x'.repeat(501)},{version:4,tenant:'south'},{version:4,id:'t2'},{version:4,write:true}];for(const body of bad)await expect(400,body);await expect(400,'{"version":4,"__proto__":{}}');assert.equal((await request()).value.version,4);return {rejected:bad.length+1};});
 await check('malformed media and oversized bytes',async()=>{await expect(400,'{');await expect(415,'{}',{headers:{'content-type':'text/plain'}});await expect(415,'{}',{headers:{'content-encoding':'gzip'}});await expect(413,{version:4,note:'a'.repeat(2048)});await expect(413,JSON.stringify({version:4,note:'é'.repeat(1100)}));});
 await check('invalid UTF8 rejected',async()=>new Promise((done,reject)=>{const req=http.request(new URL(base+'/tickets/t1'),{method:'PATCH',headers:{authorization:'Bearer north-editor','content-type':'application/json'}},res=>{res.resume();res.on('end',()=>{try{assert.equal(res.statusCode,400);done({status:res.statusCode});}catch(e){reject(e);}});});req.on('error',reject);req.end(Buffer.concat([Buffer.from('{"version":4,"title":"'),Buffer.from([0xff]),Buffer.from('"}')]));}));
 await check('chunked oversized body',async()=>new Promise((done,reject)=>{const url=new URL(base+'/tickets/t1');const req=http.request(url,{method:'PATCH',headers:{authorization:'Bearer north-editor','content-type':'application/json','transfer-encoding':'chunked'}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{try{assert.equal(res.statusCode,413);done({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks))});}catch(e){reject(e);}});});req.on('error',reject);req.write('{"version":4,"note":"');req.write('a'.repeat(2100));req.end('"}');}));
 await check('tenant comes from registry and absent object',async()=>{const r=await expect(200,{version:4,note:'north only'},{headers:{'x-tenant-id':'south',tenant:'south','x-tenant':'south'}});assert.equal(r.value.version,5);const south=await request('GET',undefined,{token:'south-editor'});assert.deepEqual(south.value,{id:'t1',title:'Private account',note:null,version:1});await expect(404,{version:1},{path:'/tickets/absent'});db.prepare('INSERT INTO tickets VALUES(?,?,?,?,?)').run('south','south-only','Hidden',null,1);await expect(404,{version:1,title:'attack'},{path:'/tickets/south-only'});assert.equal((await request('GET',undefined,{path:'/tickets/south-only'})).status,404);return south;});
 await check('atomic concurrent same-version edits',async()=>{const results=await Promise.all([request('PATCH',{version:5,title:'Winner A'}),request('PATCH',{version:5,title:'Winner B'})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const stored=db.prepare('SELECT * FROM tickets WHERE tenant=? AND id=?').get('north','t1');assert.equal(stored.version,6);assert.equal(stored.title,results.find(r=>r.status===200).value.title);return {results,stored};});
 await check('maximum valid fields',async()=>{const r=await expect(200,{version:6,title:'t'.repeat(120),note:'n'.repeat(500)});assert.equal(r.value.version,7);return {titleLength:r.value.title.length,noteLength:r.value.note.length};});
 await check('selected engine schema and query path',async()=>{const schema=db.prepare("SELECT sql FROM sqlite_master WHERE name='tickets'").get();assert.match(schema.sql,/PRIMARY KEY\(tenant,id\)/);const plan=db.prepare('EXPLAIN QUERY PLAN SELECT id,title,note,version FROM tickets WHERE tenant=? AND id=?').all('north','t1');assert.ok(plan.some(row=>/INDEX/.test(row.detail)));return {schema,plan,rows:db.prepare('SELECT count(*) AS count FROM tickets').get()};});
 const before=(await request()).value;
 await check('real SQLite persistence after close/reopen',async()=>{await stop();await start();const after=(await request()).value;assert.deepEqual(after,before);const south=await request('GET',undefined,{token:'south-editor'});assert.equal(south.value.version,1);const raw=db.prepare('SELECT tenant,id,version FROM tickets ORDER BY tenant,id').all();return {after,raw,sqlite:db.prepare('SELECT sqlite_version() AS version').get()};});
 evidence.status='PASS';
}catch(error){evidence.status='FAIL';evidence.error=error.stack;process.exitCode=1;}finally{await stop();evidence.endedUtc=new Date().toISOString();writeFileSync(resolve(import.meta.dirname,'../evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({status:evidence.status,checks:evidence.checks.length}));}


