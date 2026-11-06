import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {init,enqueue,claim,complete,readJobs} from './service.ts';
const directory=mkdtempSync(join(tmpdir(),'lease-exhausted-'));
try {
  for(const status of ['pending','processing']) {
    const path=join(directory,`${status}.db`);init(path);
    enqueue(path,{id:'exhausted',payload:'old',dueAt:0});
    enqueue(path,{id:'ordinary',payload:'next',dueAt:1});
    const db=new DatabaseSync(path);
    try {db.prepare('UPDATE jobs SET status=?,token=?,worker=?,leaseUntil=? WHERE id=?').run(status,Number.MAX_SAFE_INTEGER,'old',5,'exhausted');}finally{db.close();}
    const before=readJobs(path).find(row=>row.id==='exhausted');
    const next=await claim(path,{now:10,worker:'new',leaseMs:10});
    console.log(JSON.stringify({scenario:status,expectedClaim:'ordinary',actualClaim:next,exhaustedBefore:before}));
    assert.equal(next?.id,'ordinary','an exhausted oldest row must not block normal due work');
    assert.equal(next.token,1);assert.equal(complete(path,next,'normal-result',{now:11}),true);
    assert.equal(complete(path,{id:'exhausted',worker:'old',token:Number.MAX_SAFE_INTEGER},'stale',{now:11}),false);
    assert.deepEqual(readJobs(path).find(row=>row.id==='exhausted'),before);
    assert.equal(await claim(path,{now:100,worker:'later',leaseMs:10}),null);
    assert.equal(readJobs(path).find(row=>row.id==='ordinary').result,'normal-result');
  }
  console.log('PASS exhausted pending and expired processing heads are skipped; ordinary completion and old-owner fencing preserved');
} finally {rmSync(directory,{recursive:true,force:true});}
