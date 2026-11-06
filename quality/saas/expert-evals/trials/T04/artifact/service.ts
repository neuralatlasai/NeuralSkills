import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
export type Command={tenant:string;key:string;sku:string;qty:number};
type Outcome={status:'reserved'|'sold_out'|'conflict';reservationId?:string};
function open(path:string){const db=new DatabaseSync(path);try{db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=250;');return db;}catch(error){db.close();throw error;}}
export function init(path:string,stock=5){
 if(!Number.isSafeInteger(stock)||stock<0)throw new TypeError('invalid stock');
 const db=open(path);let active=false;
 try{db.exec('BEGIN IMMEDIATE');active=true;db.exec(`
 CREATE TABLE inventory(tenant TEXT NOT NULL,sku TEXT NOT NULL,qty INTEGER NOT NULL CHECK(qty>=0),PRIMARY KEY(tenant,sku)) STRICT;
 CREATE TABLE receipts(tenant TEXT NOT NULL,operation TEXT NOT NULL CHECK(operation='reserve'),key TEXT NOT NULL,sku TEXT NOT NULL,qty INTEGER NOT NULL CHECK(qty>0),status TEXT NOT NULL CHECK(status IN ('reserved','sold_out')),reservationId TEXT UNIQUE,PRIMARY KEY(tenant,operation,key),CHECK((status='reserved' AND reservationId IS NOT NULL) OR (status='sold_out' AND reservationId IS NULL))) STRICT;
 CREATE TABLE events(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL,operation TEXT NOT NULL,key TEXT NOT NULL,reservationId TEXT NOT NULL UNIQUE,UNIQUE(tenant,operation,key),FOREIGN KEY(tenant,operation,key) REFERENCES receipts(tenant,operation,key),FOREIGN KEY(reservationId) REFERENCES receipts(reservationId)) STRICT;
 `);const put=db.prepare('INSERT INTO inventory VALUES(?,?,?)');for(const tenant of ['red','blue'])put.run(tenant,'widget',stock);db.exec('COMMIT');active=false;
 }catch(error){if(active)db.exec('ROLLBACK');throw error;}finally{db.close();}
}
export async function reserve(path:string,c:Command,hooks:{failBeforeCommit?:boolean;failAfterCommit?:boolean}={}):Promise<Outcome>{
 if(!c||typeof c.tenant!=='string'||typeof c.key!=='string'||typeof c.sku!=='string'||!Number.isSafeInteger(c.qty)||c.qty<=0)throw new TypeError('tenant/key/sku must be strings and qty a positive safe integer');
 const db=open(path);let active=false;
 try{
 // Acquire SQLite writer authority before reading replay or stock. No await holds this lock.
 db.exec('BEGIN IMMEDIATE');active=true;
 const seen=db.prepare("SELECT sku,qty,status,reservationId FROM receipts WHERE tenant=? AND operation='reserve' AND key=?").get(c.tenant,c.key);
 if(seen){const result:Outcome=seen.sku!==c.sku||seen.qty!==c.qty?{status:'conflict'}:seen.status==='reserved'?{status:'reserved',reservationId:String(seen.reservationId)}:{status:'sold_out'};db.exec('COMMIT');active=false;return result;}
 const changed=db.prepare('UPDATE inventory SET qty=qty-? WHERE tenant=? AND sku=? AND qty>=?').run(c.qty,c.tenant,c.sku,c.qty);
 const reservationId=changed.changes===1?randomUUID():null;const status=reservationId?'reserved':'sold_out';
 db.prepare("INSERT INTO receipts(tenant,operation,key,sku,qty,status,reservationId) VALUES(?,'reserve',?,?,?,?,?)").run(c.tenant,c.key,c.sku,c.qty,status,reservationId);
 if(reservationId)db.prepare("INSERT INTO events(tenant,operation,key,reservationId) VALUES(?,'reserve',?,?)").run(c.tenant,c.key,reservationId);
 if(hooks.failBeforeCommit)throw new Error('before commit fixture');
 db.exec('COMMIT');active=false;
 // Only simulates an exception after local COMMIT returns, before caller acknowledgement.
 if(hooks.failAfterCommit)throw new Error('ack lost fixture');
 return reservationId?{status:'reserved',reservationId}:{status:'sold_out'};
 }catch(error){if(active)db.exec('ROLLBACK');throw error;}finally{db.close();}
}
export function readState(path:string){const db=open(path);try{db.exec('BEGIN');const state={stock:db.prepare('SELECT * FROM inventory ORDER BY tenant,sku').all(),receipts:db.prepare('SELECT * FROM receipts ORDER BY tenant,operation,key').all(),events:db.prepare('SELECT * FROM events ORDER BY id').all()};db.exec('COMMIT');return state;}finally{db.close();}}
