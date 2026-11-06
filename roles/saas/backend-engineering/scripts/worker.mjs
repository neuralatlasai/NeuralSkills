import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Privileged local worker adapter. No untrusted tenant/job payload is accepted here. */
try{
  const path=process.argv[2];const mode=process.argv[3];
  if(!path||!existsSync(path)||!['--crash-after-effect','--ack'].includes(mode))throw new Error('Usage: node scripts/worker.mjs <existing-fixture.sqlite> <--crash-after-effect|--ack>');
  const db=new DatabaseSync(resolve(path));db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=100');
  const job=db.prepare("SELECT * FROM jobs WHERE state='pending' ORDER BY id LIMIT 1").get();
  if(!job){db.close();console.log(JSON.stringify({status:'PASS',job:null}));}
  else{
    db.exec('BEGIN IMMEDIATE');
    try{db.prepare('UPDATE jobs SET attempts=attempts+1 WHERE id=?').run(job.id);db.prepare('INSERT OR IGNORE INTO effects VALUES(?,?,?)').run(job.id,job.tenant,`created:${job.item_id}`);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
    console.log(JSON.stringify({status:mode==='--ack'?'PASS':'INJECTED_CRASH',jobId:job.id,tenant:job.tenant,effectCommitted:true}));
    if(mode==='--crash-after-effect')process.exit(77);
    db.prepare("UPDATE jobs SET state='acked' WHERE id=?").run(job.id);db.close();
  }
}catch(error){console.error(error.message);process.exitCode=1;}
