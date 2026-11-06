import assert from 'node:assert/strict';
import http from 'node:http';
import {createHmac} from 'node:crypto';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore,createService,secret,limits} from './service.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const filename=resolve(root,'state.sqlite');
const results=[];const traces=[];let server,db,child;
const seconds=()=>String(Math.floor(Date.now()/1000));
const sign=(raw,time)=>createHmac('sha256',secret).update(time+'.').update(raw).digest('hex');
let port;
async function request(raw,{time=seconds(),signature=sign(Buffer.from(raw),time),headers={},chunked=false,duplicates=false,method='POST',path='/webhooks/carrier'}={}) {
  raw=Buffer.from(raw);
  return new Promise((resolve,reject)=>{
    const h={'content-type':'application/json','x-carrier-time':time,'x-carrier-signature':signature,...headers};
    if(!chunked) h['content-length']=raw.length;
    if(duplicates) h['x-carrier-signature']=[signature,signature];
    const req=http.request({host:'127.0.0.1',port,path,method,headers:h,agent:false},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString(),headers:res.headers}));
    });
    req.setTimeout(7000,()=>req.destroy(new Error('client timeout')));req.on('error',reject);
    if(chunked) {req.write(raw.subarray(0,4000));req.end(raw.subarray(4000));} else req.end(raw);
  });
}
const payload=(id,orderId='o1',extra={})=>JSON.stringify({id,type:'order.shipped',orderId,...extra});
const snapshot=()=>({orders:db.prepare('SELECT * FROM orders ORDER BY tenant,id').all(),receipts:db.prepare('SELECT event_id,hex(payload) AS bytes FROM receipts ORDER BY event_id').all(),effects:db.prepare('SELECT * FROM effect_audit ORDER BY rowid').all()});
async function check(name,fn) {
  const start=Date.now();
  try {await fn();results.push({name,status:'PASS',elapsedMs:Date.now()-start});}
  catch(error) {results.push({name,status:'FAIL',message:error.stack,elapsedMs:Date.now()-start});}
}
async function denied(name,raw,status,options={}) {
  await check(name,async()=>{const before=snapshot(),response=await request(raw,options);traces.push({name,response});assert.equal(response.status,status);assert.deepEqual(snapshot(),before);assert.ok(response.body.length<256);assert.ok(!response.body.includes(secret));});
}
try {
  db=openStore(filename);
  db.exec(`CREATE TABLE effect_audit(tenant TEXT,id TEXT,state TEXT);CREATE TRIGGER audit_change AFTER UPDATE ON orders WHEN OLD.state<>NEW.state BEGIN INSERT INTO effect_audit VALUES(NEW.tenant,NEW.id,NEW.state);END;
    INSERT INTO orders VALUES('north','fault','created'),('north','shared','created'),('south','shared','created'),('north','boundary','created');`);
  let fault=true;
  server=createService(db,{beforeCommit:event=>{if(event.id==='fault-event' && fault) throw new Error('private injected precommit failure');}});
  server.listen(0,'127.0.0.1');await once(server,'listening');port=server.address().port;
  await denied('invalid signature cannot mutate',payload('bad-signature'),401,{signature:'0'.repeat(64)});
  await denied('signature binds exact raw bytes',' '+payload('altered'),401,{signature:sign(Buffer.from(payload('altered')),seconds())});
  await denied('stale timestamp',payload('stale'),401,{time:String(Number(seconds())-301)});
  await denied('future timestamp',payload('future'),401,{time:String(Number(seconds())+301)});
  await denied('noncanonical timestamp',payload('time'),401,{time:'1e9'});
  await denied('malformed hex signature',payload('hex'),401,{signature:'z'.repeat(64)});
  await denied('duplicate signature header',payload('duplicate-header'),401,{duplicates:true});
  await denied('missing signature',payload('missing-signature'),401,{headers:{'x-carrier-signature':''}});
  await denied('signed malformed JSON','{',400);
  await denied('signed null','null',400);
  await denied('signed array','[]',400);
  await denied('unknown event type',JSON.stringify({id:'unknown',type:'order.cancelled',orderId:'o1'}),400);
  await denied('unknown field',payload('field','o1',{tenant:'south'}),400);
  await denied('empty event id',payload(''),400);
  await denied('overlong event id',payload('a'.repeat(81)),400);
  await denied('nonstring order id',JSON.stringify({id:'badorder',type:'order.shipped',orderId:2}),400);
  await denied('invalid UTF8',Buffer.from([0xff]),400);
  await denied('wrong tenant order',payload('south','o2'),404);
  await denied('missing order',payload('missing','absent'),404);
  await denied('oversized content length',Buffer.alloc(8193,32),413);
  await denied('oversized chunked body',Buffer.alloc(8193,32),413,{chunked:true});
  await denied('unsupported compression',payload('compressed'),415,{headers:{'content-encoding':'gzip'}});
  await denied('unsupported method',payload('method'),404,{method:'PUT'});
  await denied('unsupported route',payload('route'),404,{path:'/other'});
  await denied('precommit fault rolls back receipt and effect',payload('fault-event','fault'),503);
  fault=false;
  await check('retry after rolled back precommit failure',async()=>{const r=await request(payload('fault-event','fault'));traces.push({name:'fault retry',response:r});assert.equal(r.status,200);assert.equal(db.prepare("SELECT count(*) AS n FROM effect_audit WHERE id='fault'").get().n,1);});
  const exact=Buffer.from(' { "orderId": "o1", "type": "order.shipped", "id": "event-1" }\n');
  await check('exact whitespace signed body persists before ACK',async()=>{const r=await request(exact);traces.push({name:'exact raw bytes',response:r});assert.equal(r.status,200);assert.equal(db.prepare("SELECT state FROM orders WHERE tenant='north' AND id='o1'").get().state,'shipped');assert.ok(Buffer.from(db.prepare("SELECT payload FROM receipts WHERE event_id='event-1'").get().payload).equals(exact));});
  await check('identical replay no second effect',async()=>{const before=snapshot(),r=await request(exact);traces.push({name:'replay',response:r});assert.equal(r.status,200);assert.equal(JSON.parse(r.body).replay,true);assert.deepEqual(snapshot(),before);});
  await denied('conflicting event id different parameters',payload('event-1','shared'),409);
  await denied('conflicting event id different raw formatting',payload('event-1'),409);
  await check('north scope with colliding tenant object id',async()=>{const r=await request(payload('same-id','shared'));assert.equal(r.status,200);assert.equal(db.prepare("SELECT state FROM orders WHERE tenant='south' AND id='shared'").get().state,'created');assert.equal(db.prepare("SELECT state FROM orders WHERE tenant='north' AND id='shared'").get().state,'shipped');});
  await check('body at 8192 byte boundary accepted',async()=>{const text=payload('at-limit','boundary');const r=await request(text+' '.repeat(8192-Buffer.byteLength(text)));assert.equal(r.status,200);});
  for(let run=1;run<=3;run++) await check('concurrent replay run '+run,async()=>{const before=snapshot();const responses=await Promise.all(Array.from({length:12},()=>request(exact)));traces.push({name:'concurrent replay '+run,statuses:responses.map(r=>r.status)});assert.ok(responses.every(r=>r.status===200));assert.deepEqual(snapshot(),before);});
  await check('finite body deadline closes slow request',async()=>{const before=snapshot();const time=seconds(),raw=payload('slow');const response=await new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path:'/webhooks/carrier',method:'POST',headers:{'x-carrier-time':time,'x-carrier-signature':sign(Buffer.from(raw),time),'transfer-encoding':'chunked'},agent:false},res=>{res.resume();res.on('end',()=>{req.destroy();resolve(res.statusCode);});});req.on('error',reject);req.write(raw.slice(0,1));});assert.equal(response,408);assert.deepEqual(snapshot(),before);});
  writeFileSync(resolve(root,'before-restart.json'),JSON.stringify(snapshot(),null,2));
  await new Promise(resolve=>server.close(resolve));server=null;db.close();db=null;
  child=spawn(process.execPath,[resolve(root,'artifact/service.mjs')],{env:{...process.env,DB_FILE:filename,PORT:'0'},stdio:['ignore','pipe','pipe']});
  let output='',errors='';child.stderr.on('data',c=>{errors+=c;});
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('child startup deadline')),5000);child.stdout.on('data',c=>{output+=c;const line=output.split('\n')[0];try{port=JSON.parse(line).port;clearTimeout(t);resolve();}catch{}});child.on('error',reject);child.once('exit',code=>{if(!port){clearTimeout(t);reject(new Error('child exit '+code));}});});
  db=openStore(filename);
  await check('actual process restart retains replay and effects',async()=>{const before=snapshot(),r=await request(exact);traces.push({name:'process restart replay',response:r});assert.equal(r.status,200);assert.equal(JSON.parse(r.body).replay,true);assert.deepEqual(snapshot(),before);assert.equal(db.prepare("SELECT count(*) AS n FROM effect_audit WHERE id='o1'").get().n,1);});
  await denied('conflict after actual process restart',payload('event-1','shared'),409);
  await check('SQLite integrity after restart',()=>{assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');});
  writeFileSync(resolve(root,'after-restart.json'),JSON.stringify(snapshot(),null,2));
  writeFileSync(resolve(root,'child-output.json'),JSON.stringify({stdout:output,stderr:errors},null,2));
} catch(error) {results.push({name:'harness',status:'FAIL',message:error.stack});}
finally {
  if(server) {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  if(child) {child.kill('SIGTERM');if(child.exitCode===null) await Promise.race([once(child,'exit'),new Promise(resolve=>setTimeout(resolve,6500))]);if(child.exitCode===null) child.kill('SIGKILL');}
  if(db) db.close();
  const evidence={runtime:process.version,sqlite:'Node native node:sqlite',transport:'real loopback HTTP/1.1',database:filename,limits,results,traces};
  writeFileSync(resolve(root,'verification.json'),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,results},null,2));
  if(results.some(r=>r.status==='FAIL')) process.exitCode=1;
}
