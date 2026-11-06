import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createHmac} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import {openStore,createService,secret} from './service.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const db=openStore(resolve(root,'concurrency.sqlite'));
const clock=Math.floor(Date.now()/1000);
const server=createService(db,{now:()=>clock*1000});
const results=[],traces=[];let port;
const raw=(id,orderId)=>Buffer.from(JSON.stringify({id,type:'order.shipped',orderId}));
const signature=(body,time)=>createHmac('sha256',secret).update(time+'.').update(body).digest('hex');
function call(body,time=String(clock),extra={}) {return new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path:'/webhooks/carrier',method:'POST',agent:false,headers:{'x-carrier-time':time,'x-carrier-signature':signature(body,time),'content-length':body.length,...extra}},res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>resolve({status:res.statusCode,body:data}));});req.on('error',reject);req.end(body);});}
async function check(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',message:error.stack});}}
try {
  db.exec(`CREATE TABLE effects(tenant TEXT,id TEXT);CREATE TRIGGER audit AFTER UPDATE ON orders WHEN NEW.state<>OLD.state BEGIN INSERT INTO effects VALUES(NEW.tenant,NEW.id);END;`);
  server.listen(0,'127.0.0.1');await once(server,'listening');port=server.address().port;
  for(let run=1;run<=3;run++) await check('simultaneous first delivery race '+run,async()=>{
    const id='race-'+run;db.prepare('INSERT INTO orders VALUES(?,?,?)').run('north',id,'created');
    const responses=await Promise.all(Array.from({length:12},()=>call(raw(id,id))));traces.push({name:id,responses});
    assert.ok(responses.every(r=>r.status===200));assert.equal(responses.filter(r=>!JSON.parse(r.body).replay).length,1);
    assert.equal(db.prepare('SELECT count(*) AS n FROM receipts WHERE event_id=?').get(id).n,1);
    assert.equal(db.prepare('SELECT count(*) AS n FROM effects WHERE id=?').get(id).n,1);
  });
  for(const delta of [-300,300]) await check('inclusive timestamp window '+delta,async()=>{const r=await call(raw('time-'+delta,'o1'),String(clock+delta));traces.push({name:'timestamp boundary '+delta,response:r});assert.equal(r.status,200);});
  await check('duplicate timestamp header rejected',async()=>{const body=raw('duplicate-time','o1');const r=await call(body,String(clock),{'x-carrier-time':[String(clock),String(clock)]});traces.push({name:'duplicate time',response:r});assert.equal(r.status,401);assert.equal(db.prepare("SELECT count(*) AS n FROM receipts WHERE event_id='duplicate-time'").get().n,0);});
  await check('active body admission cap rejects and recovers',async()=>{
    const held=[];
    try {
      for(let i=0;i<16;i++) {
        const body=raw('held-'+i,'o1'),time=String(clock);
        const req=http.request({host:'127.0.0.1',port,path:'/webhooks/carrier',method:'POST',agent:false,headers:{'x-carrier-time':time,'x-carrier-signature':signature(body,time),'transfer-encoding':'chunked'}},res=>res.resume());
        req.on('error',()=>{});held.push(req);req.write('{');
      }
      await new Promise(resolve=>setTimeout(resolve,150));
      const overloaded=await call(raw('overload','o1'));traces.push({name:'overload response',response:overloaded});assert.equal(overloaded.status,503);
      assert.equal(db.prepare("SELECT count(*) AS n FROM receipts WHERE event_id='overload'").get().n,0);
    } finally {held.forEach(req=>req.destroy());}
    await new Promise(resolve=>setTimeout(resolve,150));
    const recovered=await call(raw('after-overload','o1'));assert.equal(recovered.status,200);traces.push({name:'recovered',response:recovered});
  });
  writeFileSync(resolve(root,'query-plans.json'),JSON.stringify({sqlite:db.prepare('SELECT sqlite_version() AS version').get(),order:db.prepare('EXPLAIN QUERY PLAN SELECT state FROM orders WHERE tenant=? AND id=?').all('north','o1'),receipt:db.prepare('EXPLAIN QUERY PLAN SELECT payload FROM receipts WHERE event_id=?').all('race-1')},null,2));
} finally {
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close();
  writeFileSync(resolve(root,'extra-verification.json'),JSON.stringify({results,traces},null,2));
  console.log(JSON.stringify({results},null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
}
