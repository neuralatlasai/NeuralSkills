import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, reserve } from './store.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const work=mkdtempSync(join(root,'verification-'));
const evidence={runtime:process.version,work,sqlite:null,checks:[]};
const request={tenant:'north',item:'part-7',quantity:4,version:1};
const plain=value=>JSON.parse(JSON.stringify(value));
const state=db=>plain({stock:db.prepare('SELECT * FROM stock ORDER BY tenant,item').all(),allocations:db.prepare('SELECT * FROM allocations ORDER BY id').all()});
function record(name,details){evidence.checks.push({name,status:'PASS',...details});}
async function race(label,separateConnections){
 const file=join(work,`${label}.sqlite`),a=openStore(file),b=separateConnections?openStore(file):a;
 let count=0,release;const gate=new Promise(resolve=>release=resolve);
 const afterRead=async()=>{if(++count===2)release();await gate;};
 const results=await Promise.all([reserve(a,request,{afterRead}),reserve(b,request,{afterRead})]);
 assert.equal(count,2);assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);
 const actual=state(a);
 assert.deepEqual(actual.stock,[{tenant:'north',item:'part-7',available:1,version:2},{tenant:'south',item:'part-7',available:100,version:1}]);
 assert.equal(actual.allocations.length,1);assert.equal(actual.allocations[0].quantity,4);
 if(separateConnections)b.close();a.close();
 const reopened=openStore(file);assert.deepEqual(state(reopened),actual);reopened.close();
 record(label,{separateConnections,afterReadCalls:count,results,state:actual,reopened:true});
}
try {
 for(let run=1;run<=3;run++){await race(`same-connection-${run}`,false);await race(`two-connections-${run}`,true);}
 const db=openStore(join(work,'fault-and-validation.sqlite'));
 evidence.sqlite=db.prepare('SELECT sqlite_version() AS version').get().version;
 const initial=state(db);let faultCalls=0;
 await assert.rejects(reserve(db,request,{afterWrite:()=>{faultCalls++;assert.equal(db.prepare('SELECT available FROM stock WHERE tenant=? AND item=?').get('north','part-7').available,1);throw new Error('injected afterWrite');}}),/injected afterWrite/);
 assert.equal(faultCalls,1);assert.deepEqual(state(db),initial);
 record('afterWrite-rollback',{faultCalls,state:state(db)});
 const retried=await reserve(db,request);assert.deepEqual(retried,{status:201,available:1,version:2});
 assert.equal(state(db).allocations.length,1);
 record('retry-after-rollback',{result:retried,state:state(db)});
 for(const quantity of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'1',null,undefined]){
  assert.equal((await reserve(db,{...request,quantity})).status,400);
 }
 for(const version of [0,-1,1,1.5,'1',null,undefined]){
  assert.equal((await reserve(db,{...request,quantity:1,version})).status,409);
 }
 assert.equal((await reserve(db,{...request,item:'absent'})).status,404);
 assert.equal((await reserve(db,{...request,tenant:'absent'})).status,404);
 assert.equal((await reserve(db,{...request,quantity:2,version:2})).status,409);
 const south=await reserve(db,{...request,tenant:'south',quantity:1});
 assert.deepEqual(south,{status:201,available:99,version:2});
 const beforeHookThrow=state(db);
 await assert.rejects(reserve(db,{...request,quantity:1,version:2},{afterRead:async()=>{throw new Error('read hook');}}),/read hook/);
 assert.deepEqual(state(db),beforeHookThrow);
 record('validation-scope-contract',{invalidQuantityCases:9,invalidOrStaleVersionCases:7,missingItem:404,missingTenant:404,insufficient:409,south,state:state(db),afterReadThrowUnchanged:true});
 const queryPlan=db.prepare('EXPLAIN QUERY PLAN SELECT available,version FROM stock WHERE tenant=? AND item=?').all('north','part-7');
 record('sqlite-index-and-integrity',{plan:plain(queryPlan),integrity:db.prepare('PRAGMA integrity_check').get()});
 assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');db.close();
 const reopened=openStore(join(work,'fault-and-validation.sqlite'));
 assert.deepEqual(state(reopened),beforeHookThrow);reopened.close();
 record('reopen-after-fault-retry',{state:beforeHookThrow});
 const contentionFile=join(work,'contention.sqlite');
 const owner=openStore(contentionFile),contender=openStore(contentionFile);
 owner.exec('BEGIN IMMEDIATE');
 let busyError;
 try{await reserve(contender,request);}catch(error){busyError={message:error.message,code:error.code,errcode:error.errcode};}
 assert.match(busyError?.message??'',/locked|busy/i);
 assert.equal(state(owner).stock[0].available,5);assert.equal(state(owner).allocations.length,0);
 owner.exec('ROLLBACK');
 const retryAfterBusy=await reserve(contender,request);
 assert.deepEqual(retryAfterBusy,{status:201,available:1,version:2});
 assert.equal(state(owner).allocations.length,1);
 record('lock-contention-and-explicit-retry',{busyTimeoutMs:200,busyError,retryAfterBusy,state:state(owner)});
 contender.close();owner.close();
 const insertionFault=openStore(join(work,'insertion-fault.sqlite')),beforeInsertionFault=state(insertionFault);
 insertionFault.exec("CREATE TRIGGER deny_allocation BEFORE INSERT ON allocations BEGIN SELECT RAISE(ABORT,'injected insertion failure'); END;");
 await assert.rejects(reserve(insertionFault,request),/injected insertion failure/);
 assert.deepEqual(state(insertionFault),beforeInsertionFault);
 insertionFault.exec('DROP TRIGGER deny_allocation');
 assert.equal((await reserve(insertionFault,request)).status,201);
 record('allocation-insert-failure-rollback',{rolledBack:true,retryStatus:201,state:state(insertionFault)});insertionFault.close();
 evidence.status='PASS';
}catch(error){evidence.status='FAIL';evidence.error={message:error.message,stack:error.stack};process.exitCode=1;}
writeFileSync(join(root,'verification.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
