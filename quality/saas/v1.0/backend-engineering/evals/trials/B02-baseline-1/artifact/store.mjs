import { DatabaseSync } from 'node:sqlite';
export function openStore(file=':memory:'){
 const db=new DatabaseSync(file);db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=200; CREATE TABLE IF NOT EXISTS stock(tenant TEXT,item TEXT,available INTEGER NOT NULL CHECK(available>=0),version INTEGER NOT NULL,PRIMARY KEY(tenant,item));CREATE TABLE IF NOT EXISTS allocations(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL,item TEXT NOT NULL,quantity INTEGER NOT NULL);INSERT OR IGNORE INTO stock VALUES('north','part-7',5,1);INSERT OR IGNORE INTO stock VALUES('south','part-7',100,1);`);return db;
}
export async function reserve(db,{tenant,item,quantity,version},{afterRead=async()=>{},afterWrite=()=>{}}={}){
 const row=db.prepare('SELECT available,version FROM stock WHERE tenant=? AND item=?').get(tenant,item);
 if(!row)return {status:404}; if(!Number.isSafeInteger(quantity)||quantity<=0)return {status:400};
 if(row.version!==version||row.available<quantity)return {status:409};
 await afterRead();
 // Never await while holding SQLite's writer lock. Recheck all stock
 // preconditions in the conditional UPDATE after the interleaving hook.
 let begun=false;
 try {
  db.exec('BEGIN IMMEDIATE'); begun=true;
  const updated=db.prepare('UPDATE stock SET available=available-?,version=version+1 WHERE tenant=? AND item=? AND version=? AND available>=? RETURNING available,version').get(quantity,tenant,item,version,quantity);
  if(!updated){
   const exists=db.prepare('SELECT 1 FROM stock WHERE tenant=? AND item=?').get(tenant,item);
   db.exec('ROLLBACK');begun=false;return {status:exists?409:404};
  }
  afterWrite(); // Synchronous fault hook; a throw rolls back both mutations.
  db.prepare('INSERT INTO allocations(tenant,item,quantity) VALUES(?,?,?)').run(tenant,item,quantity);
  db.exec('COMMIT');begun=false;
  return {status:201,available:updated.available,version:updated.version};
 }catch(error){
  if(begun)db.exec('ROLLBACK');
  // SQLite has one writer. A >200ms lock wait is a retryable conflict.
  if(error.errcode===5||error.errcode===6)return {status:409};
  throw error;
 }
}
