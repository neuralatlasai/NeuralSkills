import https from 'node:https';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {generateCerts} from '../../../scripts/cert-gen.mjs';
import {startFixture} from '../../../scripts/service.mjs';
import {request} from '../../../scripts/client.mjs';
const outputDirectory=resolve(process.argv[2]||'evals/evidence/independent-review');
const directory=join(outputDirectory,'race-'+new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(directory,{recursive:true});
const certs=generateCerts(join(directory,'certs'));const f=await startFixture({directory,certs});f.certs=certs;
const results=[];const startedAt=new Date().toISOString();const start=performance.now();
try {
for(let attempt=1;attempt<=3;attempt++){
const created=await request(f,'/v1/items',{method:'POST',token:'fixture-token-limited',body:{name:'race',quantity:5},headers:{'idempotency-key':`race-${attempt}`}});const path=`/v1/items/${created.body.id}`;
let socketReady;const ready=new Promise(r=>socketReady=r);let slowReq;const payload=JSON.stringify({quantity:777});
const pending=new Promise(resolveResponse=>{
slowReq=https.request({host:'127.0.0.1',port:f.port,path,method:'PATCH',servername:'localhost',ca:certs.ca,rejectUnauthorized:true,agent:false,headers:{authorization:'Bearer fixture-token-limited','content-type':'application/json','content-length':Buffer.byteLength(payload),'if-match':'2'}},res=>{const parts=[];res.on('data',x=>parts.push(x));res.on('end',()=>resolveResponse({status:res.statusCode,body:JSON.parse(Buffer.concat(parts).toString())}));});
slowReq.on('error',e=>resolveResponse({status:0,error:e.message}));slowReq.write(payload.slice(0,1),socketReady);
});
await ready;await new Promise(r=>setTimeout(r,25));
const transfer=await request(f,path,{method:'PATCH',token:'fixture-token-admin',body:{owner:'alice'},headers:{'if-match':'1'}});
slowReq.end(payload.slice(1));const mutation=await pending;const final=await request(f,path,{token:'fixture-token-admin'});
results.push({attempt,transferStatus:transfer.status,transferOwner:transfer.body.owner,transferVersion:transfer.body.version,limitedMutationStatus:mutation.status,finalOwner:final.body.owner,finalQuantity:final.body.quantity,finalVersion:final.body.version,status:transfer.status===200&&mutation.status===200&&final.body.owner==='limited'&&final.body.quantity===777?'FAIL':'UNVERIFIED'});
}
}finally{await f.stop();}
const result={claim:'Object authorization and omitted PATCH fields survive concurrent owner revocation during body parsing',startedAt,finishedAt:new Date().toISOString(),durationMs:performance.now()-start,results,httpsRequests:12,directory,source:'scripts/service.mjs:165,183-187',method:'Three independent real HTTPS streamed-body interleavings; client sends If-Match2 before existing version1 is transferred to version2.'};
writeFileSync(join(directory,'race-results.json'),JSON.stringify(result,null,2));writeFileSync(join(outputDirectory,'race-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
