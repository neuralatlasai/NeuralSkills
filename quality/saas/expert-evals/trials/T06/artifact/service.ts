import {DatabaseSync} from 'node:sqlite';

// One short-lived connection per operation; SQLite bounds lock waits to 250ms.
function withDb<T>(path:string, operation:(d:DatabaseSync)=>T):T {
  const d=new DatabaseSync(path);
  try { d.exec('PRAGMA busy_timeout=250'); return operation(d); }
  finally { d.close(); }
}
export function init(path:string) {
  return withDb(path,d=>d.exec('CREATE TABLE jobs(id TEXT PRIMARY KEY,payload TEXT,dueAt INTEGER,status TEXT,worker TEXT,token INTEGER,leaseUntil INTEGER,result TEXT)'));
}
export function enqueue(path:string,j:{id:string;payload:string;dueAt:number}) {
  withDb(path,d=>d.prepare("INSERT INTO jobs VALUES(?,?,?,'pending',NULL,0,NULL,NULL)").run(j.id,j.payload,j.dueAt));
}
export async function claim(path:string,o:{now:number;worker:string;leaseMs:number}) {
  if(!Number.isSafeInteger(o.leaseMs)||o.leaseMs<=0) throw new RangeError('leaseMs must be a positive safe integer');
  const leaseUntil=o.now+o.leaseMs;
  if(!Number.isFinite(o.now)||!Number.isFinite(leaseUntil)||leaseUntil<=o.now) throw new RangeError('lease time must be finite and advance now');
  return withDb(path,d=>{
    // A single write statement owns candidate selection and mutation. No unlocked read.
    // Tokens remain exactly representable as JS numbers; exhausted jobs are skipped without changing their fence.
    const row=d.prepare(`UPDATE jobs SET status='processing',worker=?,token=token+1,leaseUntil=?
      WHERE id=(SELECT id FROM jobs
        WHERE ((status='pending' AND dueAt<=?) OR (status='processing' AND leaseUntil<=?))
          AND token<9007199254740991
        ORDER BY dueAt,id LIMIT 1)
      AND token<9007199254740991
      RETURNING id,worker,token,leaseUntil,payload`).get(o.worker,leaseUntil,o.now,o.now);
    return row ? {id:row.id,worker:row.worker,token:row.token,leaseUntil:row.leaseUntil,payload:row.payload} : null;
  });
}
export function complete(path:string,c:{id:string;worker:string;token:number},result:string,o:{now:number}) {
  if(!Number.isFinite(o.now)) throw new RangeError('now must be finite');
  return withDb(path,d=>Number(d.prepare(`UPDATE jobs SET status='done',result=?
    WHERE id=? AND status='processing' AND worker=? AND token=? AND leaseUntil>?`)
    .run(result,c.id,c.worker,c.token,o.now).changes)>0);
}
export function readJobs(path:string) {
  return withDb(path,d=>d.prepare('SELECT * FROM jobs ORDER BY id').all());
}

