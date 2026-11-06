import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { openStore, reserve } from './store.mjs';

const root = fileURLToPath(new URL('./', import.meta.url));
mkdirSync(join(root, 'runs'), { recursive: true });
const run = mkdtempSync(join(root, 'runs', 'verification-'));
const checks = [];
const input = { tenant: 'north', item: 'part-7', quantity: 4, version: 1 };
const snapshot = db => ({stock: db.prepare('SELECT * FROM stock ORDER BY tenant,item').all(), allocations: db.prepare('SELECT * FROM allocations ORDER BY id').all()});
const plain = value => JSON.parse(JSON.stringify(value));
const check = async (id, fn) => {
  const start = performance.now();
  try { const evidence = await fn(); checks.push({id,status:'PASS',milliseconds:performance.now()-start,evidence}); }
  catch (error) { checks.push({id,status:'FAIL',milliseconds:performance.now()-start,error:{message:error.message,stack:error.stack}}); }
};
const metaDb = openStore(join(run, 'runtime.sqlite'));
const runtime = { node:process.version, sqlite:metaDb.prepare('SELECT sqlite_version() version').get().version, platform:process.platform, arch:process.arch,
  pragmas:{busyTimeout:plain(metaDb.prepare('PRAGMA busy_timeout').get()), journalMode:plain(metaDb.prepare('PRAGMA journal_mode').get()), synchronous:plain(metaDb.prepare('PRAGMA synchronous').get()),foreignKeys:plain(metaDb.prepare('PRAGMA foreign_keys').get())} };
metaDb.close();

for (let repetition = 1; repetition <= 3; repetition++) {
  await check(`race-two-connections-${repetition}`, async () => {
    const file = join(run, `race-${repetition}.sqlite`);
    const a = openStore(file), b = openStore(file);
    let count = 0, release;
    const gate = new Promise(resolve => release = resolve);
    const afterRead = async () => { if (++count === 2) release(); await gate; };
    const results = await Promise.all([reserve(a,input,{afterRead}), reserve(b,input,{afterRead})]);
    assert.deepEqual(results.map(r => r.status).sort(), [201,409]);
    assert.deepEqual(results.find(r=>r.status===201), {status:201,available:1,version:2});
    const state = snapshot(a);
    assert.deepEqual(plain(state.stock), [{tenant:'north',item:'part-7',available:1,version:2},{tenant:'south',item:'part-7',available:100,version:1}]);
    assert.equal(state.allocations.length,1); assert.equal(state.allocations[0].quantity,4);
    assert.equal(state.allocations[0].tenant,'north');
    a.close(); b.close();
    const reopened = openStore(file); assert.deepEqual(plain(snapshot(reopened)),plain(state)); reopened.close();
    return {file,hookCalls:count,results,state,reopen:'same persistent state'};
  });
}

await check('race-same-connection', async () => {
  const db=openStore(join(run,'same-connection.sqlite')); let count=0, release;
  const gate=new Promise(resolve=>release=resolve);
  const afterRead=async()=>{if(++count===2)release();await gate;};
  const results=await Promise.all([reserve(db,input,{afterRead}),reserve(db,input,{afterRead})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]); assert.equal(snapshot(db).allocations.length,1);
  const state=snapshot(db);db.close();return {results,state};
});

await check('fault-rollback-reopen-retry', async () => {
  const file=join(run,'fault.sqlite'),db=openStore(file),before=plain(snapshot(db));let provisional;
  await assert.rejects(reserve(db,input,{afterWrite:()=>{provisional=plain(snapshot(db));assert.equal(provisional.stock[0].available,1);throw new Error('injected afterWrite');}}),/injected afterWrite/);
  const rolledBack=plain(snapshot(db)); assert.deepEqual(rolledBack,before);
  db.close();const reopened=openStore(file);assert.deepEqual(plain(snapshot(reopened)),before);
  const retry=await reserve(reopened,input);assert.deepEqual(retry,{status:201,available:1,version:2});
  assert.equal(snapshot(reopened).allocations.length,1);const final=plain(snapshot(reopened));reopened.close();
  return {before,provisional,rolledBack,reopen:'unchanged',retry,final};
});

await check('contracts-and-tenant-scope', async () => {
  const db=openStore(join(run,'contracts.sqlite'));const before=plain(snapshot(db));const invalid=[];
  for(const quantity of [0,-1,1.5,NaN,Infinity,'4',null,undefined,Number.MAX_SAFE_INTEGER+1]) {
    const result=await reserve(db,{...input,quantity});assert.equal(result.status,400);invalid.push({quantity:String(quantity),result});
  }
  assert.equal((await reserve(db,{...input,item:'missing'})).status,404);
  assert.equal((await reserve(db,{...input,tenant:'missing'})).status,404);
  assert.equal((await reserve(db,{...input,version:0})).status,409);
  assert.equal((await reserve(db,{...input,version:'1'})).status,409);
  assert.equal((await reserve(db,{...input,quantity:6})).status,409);
  assert.equal((await reserve(db,{...input,tenant:"north' OR 1=1 --"})).status,404);
  assert.deepEqual(plain(snapshot(db)),before);
  let afterReadFaultCalls=0;
  await assert.rejects(reserve(db,input,{afterRead:async()=>{afterReadFaultCalls++;throw new Error('read hook fault');}}),/read hook fault/);
  assert.equal(afterReadFaultCalls,1);assert.deepEqual(plain(snapshot(db)),before);
  const south=await reserve(db,{...input,tenant:'south'}); assert.deepEqual(south,{status:201,available:96,version:2});
  assert.equal(db.prepare("SELECT available FROM stock WHERE tenant='north'").get().available,5);
  const north=await reserve(db,{...input,quantity:5});assert.deepEqual(north,{status:201,available:0,version:2});
  const state=snapshot(db);db.close();return {invalid,missing:404,stale:409,insufficient:409,afterReadFaultCalls,south,north,state};
});

await check('sqlite-busy-release-retry', async () => {
  const file=join(run,'busy.sqlite'),holder=openStore(file),contender=openStore(file);const before=plain(snapshot(contender));
  holder.exec('BEGIN IMMEDIATE');let failure;
  const start=performance.now();
  try {await reserve(contender,input);}catch(error){failure={message:error.message,code:error.code,errcode:error.errcode,errstr:error.errstr};}
  const waitedMilliseconds=performance.now()-start;
  assert.ok(failure);assert.match(failure.message,/locked|busy/i);assert.deepEqual(plain(snapshot(contender)),before);
  holder.exec('ROLLBACK');const retry=await reserve(contender,input);assert.equal(retry.status,201);
  const state=snapshot(contender);assert.equal(state.allocations.length,1);holder.close();contender.close();
  return {failure,waitedMilliseconds,retry,state,automaticRetries:0};
});

await check('allocation-insert-failure-rolls-back', async () => {
  const db=openStore(join(run,'insert-failure.sqlite'));const before=plain(snapshot(db));
  db.exec("CREATE TRIGGER allocation_fail BEFORE INSERT ON allocations BEGIN SELECT RAISE(ABORT,'injected insertion failure'); END");
  await assert.rejects(reserve(db,input),/injected insertion failure/);assert.deepEqual(plain(snapshot(db)),before);
  db.exec('DROP TRIGGER allocation_fail');const retry=await reserve(db,input);assert.equal(retry.status,201);const state=snapshot(db);db.close();return {before,retry,state};
});

await check('fault-same-connection-retry-and-item-scope', async () => {
  const db=openStore(join(run,'usable.sqlite'));
  db.prepare('INSERT INTO stock VALUES(?,?,?,?)').run('north','part-8',7,1);
  const before=plain(snapshot(db));
  await assert.rejects(reserve(db,input,{afterWrite:()=>{throw new Error('same connection fault');}}),/same connection fault/);
  assert.deepEqual(plain(snapshot(db)),before);
  const retry=await reserve(db,input);assert.equal(retry.status,201);
  assert.deepEqual(plain(db.prepare('SELECT * FROM stock WHERE tenant=? AND item=?').get('north','part-8')),{tenant:'north',item:'part-8',available:7,version:1});
  const plan=plain(db.prepare('EXPLAIN QUERY PLAN SELECT available,version FROM stock WHERE tenant=? AND item=?').all('north','part-7'));
  const state=plain(snapshot(db));db.close();return {retry,state,plan};
});

const raceTimes=checks.filter(c=>c.id.startsWith('race-two')).map(c=>c.milliseconds).sort((a,b)=>a-b);
const output={runtime,run,checks,raceElapsedMs:{samples:raceTimes,median:raceTimes[1],range:[raceTimes[0],raceTimes.at(-1)]},status:checks.every(c=>c.status==='PASS')?'PASS':'FAIL'};
writeFileSync(join(root,'verification.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
if(output.status!=='PASS') process.exitCode=1;
