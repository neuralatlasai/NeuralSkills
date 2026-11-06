import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { openStore,createService } from './service.mjs';
const db=openStore(new URL('../evidence/faults.sqlite',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const server=createService(db);server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;
const start=performance.now();
try{
 const response=await new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path:'/tickets/t1',method:'PATCH',headers:{authorization:'Bearer north-editor','content-type':'application/json'}},res=>{let raw='';res.on('data',x=>raw+=x);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(raw)}));});req.on('error',reject);req.setTimeout(7000,()=>req.destroy(new Error('client timeout')));req.write('{');});
 const elapsedMs=performance.now()-start;assert.deepEqual(response,{status:400,body:{code:'request_timeout'}});assert(elapsedMs>=4900&&elapsedMs<6500);assert.equal(db.prepare('SELECT version FROM tickets WHERE tenant=? AND id=?').get('north','t1').version,1);
 console.log(JSON.stringify({id:'slow-body-total-deadline',status:'PASS',elapsedMs,response,storedVersion:1}));
}finally{await new Promise(resolve=>server.close(resolve));db.close();}
