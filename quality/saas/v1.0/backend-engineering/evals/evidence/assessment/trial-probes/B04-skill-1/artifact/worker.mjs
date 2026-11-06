import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
export const MAX_ATTEMPTS = 3;
export class JobError extends Error {
  constructor(code,message) { super(message); this.name='JobError'; this.code=code; }
}
const invalid = message => { throw new JobError('INVALID_JOB',message); };
function validate({id,account,amount}={}) {
  if(typeof id!=='string'||!id.trim()||Buffer.byteLength(id)>256) invalid('id must be nonempty and at most 256 bytes');
  if(typeof account!=='string'||!account.trim()||Buffer.byteLength(account)>128) invalid('account must be nonempty and at most 128 bytes');
  if(!Number.isSafeInteger(amount)||amount<=0) invalid('amount must be a positive safe integer');
}
function transaction(db,fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const result=fn(); db.exec('COMMIT'); return result; }
  catch(error) { if(db.isTransaction) db.exec('ROLLBACK'); throw error; }
}
export function openStore(file=':memory:') {
  const db=new DatabaseSync(file);
  try {
    db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=250; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS balances(account TEXT PRIMARY KEY,total INTEGER NOT NULL);
      INSERT OR IGNORE INTO balances VALUES('north',0);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,account TEXT NOT NULL,amount INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,error TEXT);
      CREATE TABLE IF NOT EXISTS credits(job_id TEXT PRIMARY KEY REFERENCES jobs(id),account TEXT NOT NULL REFERENCES balances(account),amount INTEGER NOT NULL CHECK(amount>0));
      CREATE INDEX IF NOT EXISTS jobs_pending ON jobs(state,id);`);
    const columns=db.prepare('PRAGMA table_info(jobs)').all().map(row=>row.name);
    if(!columns.includes('attempts')) db.exec('ALTER TABLE jobs ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0');
    if(!columns.includes('error')) db.exec('ALTER TABLE jobs ADD COLUMN error TEXT');
    return db;
  } catch(error) { db.close(); throw error; }
}
export function enqueue(db,payload) {
  validate(payload);
  const {id,account,amount}=payload;
  return transaction(db,()=>{
    if(!db.prepare('SELECT 1 FROM balances WHERE account=?').get(account)) invalid('unknown account');
    const existing=db.prepare('SELECT account,amount FROM jobs WHERE id=?').get(id);
    if(existing&&(existing.account!==account||existing.amount!==amount)) throw new JobError('JOB_CONFLICT','job id is already bound to different parameters');
    if(!existing) db.prepare('INSERT INTO jobs(id,account,amount) VALUES(?,?,?)').run(id,account,amount);
    return {accepted:true,id};
  });
}
export function runOne(db,{afterEffect=()=>{}}={}) {
  const job=db.prepare("SELECT * FROM jobs WHERE state='pending' ORDER BY id LIMIT 1").get();
  if(!job) return false;
  const prior=db.prepare('SELECT account,amount FROM credits WHERE job_id=?').get(job.id);
  if(prior) {
    if(prior.account!==job.account||prior.amount!==job.amount) throw new JobError('LEDGER_CONFLICT','stored credit and job disagree; manual reconciliation required');
    db.prepare("UPDATE jobs SET state='done',error=NULL WHERE id=?").run(job.id); return true;
  }
  if(job.attempts>=MAX_ATTEMPTS) { db.prepare("UPDATE jobs SET state='failed',error='RETRY_LIMIT' WHERE id=?").run(job.id); return true; }
  db.prepare('UPDATE jobs SET attempts=attempts+1 WHERE id=?').run(job.id);
  try {
    transaction(db,()=>{
      validate(job);
      const balance=db.prepare('SELECT total FROM balances WHERE account=?').get(job.account);
      if(!balance) invalid('unknown account');
      if(!Number.isSafeInteger(balance.total)||!Number.isSafeInteger(balance.total+job.amount)) invalid('balance would exceed safe integer range');
      db.prepare('UPDATE balances SET total=total+? WHERE account=?').run(job.amount,job.account);
      db.prepare('INSERT INTO credits(job_id,account,amount) VALUES(?,?,?)').run(job.id,job.account,job.amount);
    });
  } catch(error) {
    db.prepare('UPDATE jobs SET state=?,error=? WHERE id=?').run(error instanceof JobError||job.attempts+1>=MAX_ATTEMPTS?'failed':'pending',error.code??'STORAGE_ERROR',job.id);
    if(!(error instanceof JobError)) throw error;
    return true;
  }
  // Real fault boundary: durable local effect and ledger committed; acknowledgement remains pending.
  afterEffect(job);
  db.prepare("UPDATE jobs SET state='done',error=NULL WHERE id=?").run(job.id);
  return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  let db;
  try {
    db=openStore(process.argv[2]??'worker.sqlite');
    if(process.argv.includes('--seed')) enqueue(db,{id:'credit-1',account:'north',amount:7});
    runOne(db,{afterEffect:()=>{if(process.argv.includes('--crash-after-effect')) process.exit(73);}});
    console.log(JSON.stringify({jobs:db.prepare('SELECT * FROM jobs ORDER BY id LIMIT 100').all(),balances:db.prepare('SELECT * FROM balances ORDER BY account LIMIT 100').all(),credits:db.prepare('SELECT * FROM credits ORDER BY job_id LIMIT 100').all(),snapshotLimit:100}));
  } catch(error) { console.error(JSON.stringify({error:error.code??'WORKER_ERROR',message:error.message})); process.exitCode=1; }
  finally { db?.close(); }
}
