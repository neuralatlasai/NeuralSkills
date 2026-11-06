import { DatabaseSync } from 'node:sqlite';
export function openStore(file=':memory:'){
 const db=new DatabaseSync(file);db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=200; CREATE TABLE IF NOT EXISTS stock(tenant TEXT,item TEXT,available INTEGER NOT NULL CHECK(available>=0),version INTEGER NOT NULL,PRIMARY KEY(tenant,item));CREATE TABLE IF NOT EXISTS allocations(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL,item TEXT NOT NULL,quantity INTEGER NOT NULL);INSERT OR IGNORE INTO stock VALUES('north','part-7',5,1);INSERT OR IGNORE INTO stock VALUES('south','part-7',100,1);`);return db;
}
export async function reserve(db,{tenant,item,quantity,version},{afterRead=async()=>{},afterWrite=()=>{}}={}){
 if(!Number.isSafeInteger(quantity)||quantity<=0)return {status:400};
 const row=db.prepare('SELECT available,version FROM stock WHERE tenant=? AND item=?').get(tenant,item);
 if(!row)return {status:404};
 if(row.version!==version||row.available<quantity)return {status:409};
 // The asynchronous observation hook holds no SQLite transaction or write lock.
 await afterRead();
 // Revalidate at the write boundary. No await may split this transaction.
 db.exec('BEGIN IMMEDIATE');
 try {
  const updated=db.prepare('UPDATE stock SET available=available-?,version=version+1 WHERE tenant=? AND item=? AND version=? AND available>=? RETURNING available,version').get(quantity,tenant,item,version,quantity);
  if(!updated){
   const exists=db.prepare('SELECT 1 FROM stock WHERE tenant=? AND item=?').get(tenant,item);
   db.exec('ROLLBACK');
   return {status:exists?409:404};
  }
  afterWrite();
  db.prepare('INSERT INTO allocations(tenant,item,quantity) VALUES(?,?,?)').run(tenant,item,quantity);
  db.exec('COMMIT');
  return {status:201,available:updated.available,version:updated.version};
 } catch(error) {
  db.exec('ROLLBACK');
  throw error;
 }
}
