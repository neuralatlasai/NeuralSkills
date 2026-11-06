import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { createService, openStore } from './service.mjs';
const directory=await mkdtemp(join(dirname(fileURLToPath(import.meta.url)),'.verification-'));
const file=join(directory,'tickets.sqlite');
let db,server,port,checks=0;
const report=(name)=>{checks++;console.log(JSON.stringify({check:name,status:'PASS'}));};
async function start(){db=openStore(file);server=createService(db);server.listen(0,'127.0.0.1');await once(server,'listening');port=server.address().port;}
async function stop(){if(server){await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));server=undefined;}if(db){db.close();db=undefined;}}
function request(method='GET',path='/tickets/t1',body,headers={},chunked=false){
 return new Promise((resolve,reject)=>{
  const payload=body===undefined?undefined:typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body);
  const req=http.request({hostname:'127.0.0.1',port,path,method,headers:{authorization:'Bearer north-editor',...(payload!==undefined?{'content-type':'application/json',...(chunked?{}:{'content-length':Buffer.byteLength(payload)})}:{}),...headers}},res=>{
   const parts=[];res.on('data',x=>parts.push(x));res.on('end',()=>{try{assert.match(res.headers['content-type'],/^application\/json/);resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(parts)),headers:res.headers});}catch(e){reject(e);}});
  });req.on('error',reject);if(payload!==undefined){if(chunked){req.write(payload.slice(0,100));req.end(payload.slice(100));}else req.end(payload);}else req.end();
 });
}
async function expect(name,status,...args){const result=await request(...args);assert.equal(result.status,status,name);report(name);return result.body;}
try {
 await start();
 const initial=await expect('GET existing public projection',200);assert.deepEqual(initial,{id:'t1',title:'Printer jam',note:'Call support',version:1});assert.deepEqual(Object.keys(initial).sort(),['id','note','title','version']);
 await expect('GET unauthenticated',401,'GET','/tickets/t1',undefined,{authorization:''});
 await expect('PATCH unauthenticated',401,'PATCH','/tickets/t1',{version:1,title:'bad'},{authorization:''});
 await expect('PATCH reader denied',403,'PATCH','/tickets/t1',{version:1,title:'bad'},{authorization:'Bearer north-reader'});
 db.prepare('INSERT INTO tickets VALUES(?,?,?,?,?)').run('south','south-only','Hidden',null,1);
 await expect('GET tenant boundary',404,'GET','/tickets/south-only');
 await expect('PATCH tenant boundary',404,'PATCH','/tickets/south-only',{version:1,title:'bad'},{'x-tenant':'south'});
 await expect('PATCH missing object',404,'PATCH','/tickets/missing',{version:1,title:'bad'});
 const title=await expect('trim title and ignore spoofed tenant',200,'PATCH','/tickets/t1',{version:1,title:'  Updated title  '},{'x-tenant':'south','x-tenant-id':'south'});assert.deepEqual(title,{id:'t1',title:'Updated title',note:'Call support',version:2});
 const cleared=await expect('null only clears note and absent title preserved',200,'PATCH','/tickets/t1',{version:2,note:null});assert.deepEqual(cleared,{id:'t1',title:'Updated title',note:null,version:3});
 const note=await expect('note string preserved and title absent',200,'PATCH','/tickets/t1',{version:3,note:'  note  '});assert.equal(note.note,'  note  ');assert.equal(note.title,'Updated title');
 await expect('stale version',409,'PATCH','/tickets/t1',{version:1,title:'bad'});
 const invalid=[null,[],{}, {version:0},{version:-1},{version:1.5},{version:'4'},{version:null},{version:Number.MAX_SAFE_INTEGER+1},{version:4,title:null},{version:4,title:''},{version:4,title:'  '},{version:4,title:'x'.repeat(121)},{version:4,note:23},{version:4,note:'x'.repeat(501)},{version:4,tenant:'south'},{version:4,id:'other'},{version:4,write:true},{version:4,role:'editor'}];
 for(const [i,body] of invalid.entries())await expect(`invalid schema ${i}`,400,'PATCH','/tickets/t1',body);
 await expect('prototype field rejected',400,'PATCH','/tickets/t1','{"version":4,"__proto__":{}}');
 await expect('malformed JSON',400,'PATCH','/tickets/t1','{"version":');
 await expect('malformed UTF-8',400,'PATCH','/tickets/t1',Buffer.concat([Buffer.from('{"version":4,"title":"'),Buffer.from([255]),Buffer.from('"}')]));
 await expect('empty JSON',400,'PATCH','/tickets/t1','');
 await expect('unsupported media type',415,'PATCH','/tickets/t1','{"version":4}',{'content-type':'text/plain'});
 await expect('missing media type',415,'PATCH','/tickets/t1',undefined);
 await expect('oversized declared body',413,'PATCH','/tickets/t1',' '.repeat(2049));
 await expect('oversized chunked multibyte body',413,'PATCH','/tickets/t1','"'+'😀'.repeat(600)+'"',{},true);
 const before=await request();assert.equal(before.body.version,4);assert.equal(before.body.title,'Updated title');report('all rejected mutations leave state unchanged');
 const boundary=JSON.stringify({version:4,title:'x'.repeat(120),note:'n'.repeat(500)});
 await expect('exact body limit and maximum field lengths',200,'PATCH','/tickets/t1',boundary+' '.repeat(2048-Buffer.byteLength(boundary)),{'content-type':'application/json; charset=utf-8'});
 const noFields=await expect('version only retains absent fields',200,'PATCH','/tickets/t1',{version:5});assert.equal(noFields.title,'x'.repeat(120));assert.equal(noFields.note,'n'.repeat(500));
 const race=await Promise.all([request('PATCH','/tickets/t1',{version:6,title:'race A'}),request('PATCH','/tickets/t1',{version:6,title:'race B'})]);
 assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);const winner=race.find(r=>r.status===200).body;assert.equal(winner.version,7);assert.deepEqual((await request()).body,winner);report('concurrent same-version edit one winner one conflict');
 const south=await expect('south projection unchanged',200,'GET','/tickets/t1',undefined,{authorization:'Bearer south-editor'});assert.deepEqual(south,{id:'t1',title:'Private account',note:null,version:1});
 await stop();await start();assert.deepEqual((await request()).body,winner);report('file database persisted after service and SQLite close/reopen');
 assert.deepEqual((await request('GET','/tickets/t1',undefined,{authorization:'Bearer south-editor'})).body,south);report('tenant persistence after reopen');
 await expect('reader GET compatibility after reopen',200,'GET','/tickets/t1',undefined,{authorization:'Bearer north-reader'});
 await expect('method compatibility',405,'POST','/tickets/t1');
 console.log(JSON.stringify({status:'PASS',checks,node:process.version,transport:'actual loopback HTTP',database:'native node:sqlite file close/reopen',final:winner}));
} finally {await stop();await rm(directory,{recursive:true,force:true});}

