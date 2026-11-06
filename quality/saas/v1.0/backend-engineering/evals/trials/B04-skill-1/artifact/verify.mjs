import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {openStore,enqueue,runOne,MAX_ATTEMPTS} from './worker.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const evidence=resolve(here,'../evidence'); mkdirSync(evidence,{recursive:true});
const tag=Date.now(); const checks=[];
function check(name,fn) { try { checks.push({name,status:'PASS',observations:fn()}); } catch(error) { checks.push({name,status:'FAIL',error:error.stack}); } }
function cli(file,...args) { const r=spawnSync(process.execPath,[resolve(here,'worker.mjs'),file,...args],{encoding:'utf8',timeout:10000}); return {status:r.status,signal:r.signal,stdout:r.stdout,stderr:r.stderr,error:r.error?.message}; }
check('durable duplicate and conflicting enqueue',()=>{
  const file=resolve(evidence,`${tag}-identity.sqlite`); let db=openStore(file); const job={id:'identity',account:'north',amount:7};
  assert.deepEqual(enqueue(db,job),{accepted:true,id:'identity'}); db.close(); db=openStore(file);
  assert.deepEqual(enqueue(db,job),{accepted:true,id:'identity'});
  assert.throws(()=>enqueue(db,{...job,amount:8}),{code:'JOB_CONFLICT'});
  db.prepare("INSERT INTO balances VALUES('south',0)").run(); assert.throws(()=>enqueue(db,{...job,account:'south'}),{code:'JOB_CONFLICT'});
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,1); assert.equal(db.isTransaction,false); db.close(); return {file,rows:1};
});
for(let run=1;run<=3;run++) check(`real process crash and restart ${run}`,()=>{
  const file=resolve(evidence,`${tag}-crash-${run}.sqlite`); const crashed=cli(file,'--seed','--crash-after-effect');
  writeFileSync(resolve(evidence,`${tag}-crash-${run}-child.json`),JSON.stringify(crashed,null,2)); assert.equal(crashed.status,73);
  let db=openStore(file); const before={job:db.prepare('SELECT * FROM jobs').get(),balance:db.prepare('SELECT total FROM balances').get().total,credits:db.prepare('SELECT COUNT(*) AS n FROM credits').get().n};
  assert.equal(before.job.state,'pending'); assert.equal(before.balance,7); assert.equal(before.credits,1); db.close();
  const restarted=cli(file,'--seed'); assert.equal(restarted.status,0); const idle=cli(file); assert.equal(idle.status,0);
  db=openStore(file); const after={job:db.prepare('SELECT * FROM jobs').get(),balance:db.prepare('SELECT total FROM balances').get().total,credits:db.prepare('SELECT COUNT(*) AS n FROM credits').get().n,integrity:db.prepare('PRAGMA integrity_check').get().integrity_check};
  assert.equal(after.job.state,'done'); assert.equal(after.balance,7); assert.equal(after.credits,1); assert.equal(after.integrity,'ok'); db.close(); return {file,crashed,restarted,idle,before,after};
});
check('normal completion, callback failure and bounded per-call work',()=>{
  const db=openStore(resolve(evidence,`${tag}-normal.sqlite`)); enqueue(db,{id:'a',account:'north',amount:3}); enqueue(db,{id:'b',account:'north',amount:4});
  assert.throws(()=>runOne(db,{afterEffect:()=>{throw Error('injected acknowledgement failure');}}),/injected/);
  assert.equal(db.isTransaction,false); assert.equal(db.prepare('SELECT total FROM balances').get().total,3); assert.equal(db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE state='pending'").get().n,2);
  runOne(db); runOne(db); assert.equal(runOne(db),false); assert.equal(db.prepare('SELECT total FROM balances').get().total,7); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM credits').get().n,2);
  const jobs=db.prepare('SELECT * FROM jobs ORDER BY id').all(); db.close(); return {jobs,total:7};
});
check('invalid enqueue and legacy poison jobs reject without silent completion',()=>{
  const file=resolve(evidence,`${tag}-invalid.sqlite`); let db=new DatabaseSync(file);
  db.exec("CREATE TABLE jobs(id TEXT PRIMARY KEY,account TEXT NOT NULL,amount INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'pending'); INSERT INTO jobs VALUES('bad-account','absent',7,'pending'),('bad-zero','north',0,'pending'),('bad-fraction','north',1.5,'pending');"); db.close(); db=openStore(file);
  for(const payload of [{id:'',account:'north',amount:1},{id:' ',account:'north',amount:1},{id:'x',account:'absent',amount:1},...[0,-1,1.5,NaN,Infinity,'7',Number.MAX_SAFE_INTEGER+1].map(amount=>({id:'x',account:'north',amount}))]) { assert.throws(()=>enqueue(db,payload),{code:'INVALID_JOB'}); assert.equal(db.isTransaction,false); }
  for(let i=0;i<3;i++) runOne(db); const failed=db.prepare('SELECT id,state,error FROM jobs ORDER BY id').all(); assert.ok(failed.every(job=>job.state==='failed'&&job.error==='INVALID_JOB')); assert.equal(db.prepare('SELECT total FROM balances').get().total,0);
  enqueue(db,{id:'good',account:'north',amount:2}); runOne(db); assert.equal(db.prepare('SELECT total FROM balances').get().total,2); assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok'); db.close(); return {failed,recoveredTotal:2};
});
check('transaction rollback, retry cap, and subsequent healthy work',()=>{
  const db=openStore(resolve(evidence,`${tag}-retry.sqlite`)); enqueue(db,{id:'a-fault',account:'north',amount:5}); db.exec("CREATE TRIGGER reject_credit BEFORE INSERT ON credits BEGIN SELECT RAISE(ABORT,'injected ledger failure'); END;");
  for(let attempt=1;attempt<=MAX_ATTEMPTS;attempt++) { assert.throws(()=>runOne(db),/injected ledger failure/); assert.equal(db.isTransaction,false); assert.equal(db.prepare('SELECT total FROM balances').get().total,0); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM credits').get().n,0); }
  const failed=db.prepare('SELECT * FROM jobs').get(); assert.equal(failed.state,'failed'); assert.equal(failed.attempts,3);
  db.exec('DROP TRIGGER reject_credit'); enqueue(db,{id:'b-good',account:'north',amount:6}); runOne(db); assert.equal(db.prepare('SELECT total FROM balances').get().total,6); assert.equal(runOne(db),false); db.close(); return {failed,recoveredTotal:6};
});
const report={runtime:process.version,sqlite:process.versions.sqlite,platform:process.platform,arch:process.arch,checks};
writeFileSync(resolve(evidence,'verification.json'),JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2)); if(checks.some(c=>c.status==='FAIL')) process.exitCode=1;
