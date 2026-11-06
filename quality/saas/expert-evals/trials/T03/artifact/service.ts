import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';

export type Command = {tenant:string;key:string;sku:string;qty:number};
type Result = {status:'reserved'|'sold_out'|'conflict';reservationId?:string};
type Hooks = {failBeforeCommit?:boolean;failAfterCommit?:boolean};
const BUSY_MS = 250;
const MAX_ATTEMPTS = 3;

function open(path:string) {
  const db = new DatabaseSync(path);
  try {
    db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=${BUSY_MS}; PRAGMA synchronous=FULL;`);
    return db;
  } catch (error) { db.close(); throw error; }
}
function validate(c:Command) {
  if (!c || !Number.isSafeInteger(c.qty) || c.qty <= 0) throw new TypeError('qty must be a positive safe integer');
  for (const name of ['tenant','key','sku'] as const) {
    if (typeof c[name] !== 'string' || c[name].length === 0) throw new TypeError(`${name} must be a nonempty string`);
  }
}
export function init(path:string, stock=5) {
  if (!Number.isSafeInteger(stock) || stock < 0) throw new TypeError('stock must be a nonnegative safe integer');
  const db = open(path);
  try {
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE inventory(tenant TEXT NOT NULL,sku TEXT NOT NULL,qty INTEGER NOT NULL CHECK(qty>=0),PRIMARY KEY(tenant,sku)) STRICT;
      CREATE TABLE receipts(
        tenant TEXT NOT NULL,operation TEXT NOT NULL CHECK(operation='reserve'),key TEXT NOT NULL,
        sku TEXT NOT NULL,qty INTEGER NOT NULL CHECK(qty>0),
        status TEXT NOT NULL CHECK(status IN ('reserved','sold_out')),reservationId TEXT UNIQUE,
        PRIMARY KEY(tenant,operation,key),UNIQUE(tenant,operation,key,reservationId),
        CHECK((status='reserved' AND reservationId IS NOT NULL) OR (status='sold_out' AND reservationId IS NULL))
      ) STRICT;
      CREATE TABLE events(
        id INTEGER PRIMARY KEY,tenant TEXT NOT NULL,operation TEXT NOT NULL,key TEXT NOT NULL,reservationId TEXT NOT NULL,
        UNIQUE(tenant,operation,key),
        FOREIGN KEY(tenant,operation,key,reservationId) REFERENCES receipts(tenant,operation,key,reservationId)
      ) STRICT;`);
    const put = db.prepare('INSERT INTO inventory VALUES(?,?,?)');
    for (const tenant of ['red','blue']) put.run(tenant,'widget',stock);
    db.exec('COMMIT');
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw error;
  } finally { db.close(); }
}
function busy(error:unknown) {
  return typeof error === 'object' && error !== null && 'errcode' in error &&
    typeof error.errcode === 'number' && [5,6].includes(error.errcode & 255);
}
export async function reserve(path:string,c:Command,hooks:Hooks={}):Promise<Result> {
  validate(c);
  for (let attempt=0; attempt<MAX_ATTEMPTS; attempt++) {
    let db:DatabaseSync|undefined;
    let retry = false;
    let committed = false;
    try {
      db = open(path);
      // Acquire the SQLite writer lock before checking a durable receipt or stock.
      // No await occurs while a transaction owns this lock.
      db.exec('BEGIN IMMEDIATE');
      const seen = db.prepare('SELECT sku,qty,status,reservationId FROM receipts WHERE tenant=? AND operation=? AND key=?').get(c.tenant,'reserve',c.key);
      if (seen) {
        const result:Result = seen.sku !== c.sku || seen.qty !== c.qty
          ? {status:'conflict'}
          : seen.status === 'reserved' ? {status:'reserved',reservationId:String(seen.reservationId)} : {status:'sold_out'};
        db.exec('COMMIT');
        committed = true;
        return result;
      }
      const changed = db.prepare('UPDATE inventory SET qty=qty-? WHERE tenant=? AND sku=? AND qty>=?').run(c.qty,c.tenant,c.sku,c.qty);
      const status = changed.changes === 1 ? 'reserved' : 'sold_out';
      const reservationId = status === 'reserved' ? randomUUID() : null;
      db.prepare('INSERT INTO receipts(tenant,operation,key,sku,qty,status,reservationId) VALUES(?,?,?,?,?,?,?)').run(c.tenant,'reserve',c.key,c.sku,c.qty,status,reservationId);
      if (reservationId) db.prepare('INSERT INTO events(tenant,operation,key,reservationId) VALUES(?,?,?,?)').run(c.tenant,'reserve',c.key,reservationId);
      if (hooks.failBeforeCommit) throw new Error('before commit fixture');
      db.exec('COMMIT');
      committed = true;
      // Only a lost local acknowledgement: committed SQLite work is never retried here.
      if (hooks.failAfterCommit) throw new Error('ack lost fixture');
      return reservationId ? {status,reservationId} : {status};
    } catch (error) {
      if (db?.isTransaction) db.exec('ROLLBACK');
      if (!committed && busy(error) && attempt+1 < MAX_ATTEMPTS) retry = true;
      else throw error;
    } finally { db?.close(); }
    if (retry) await delay(10*(attempt+1));
  }
  throw new Error('retry budget exhausted');
}
export function readState(path:string) {
  const db = open(path);
  try {
    db.exec('BEGIN');
    const result = {
      stock:db.prepare('SELECT * FROM inventory ORDER BY tenant,sku').all(),
      receipts:db.prepare('SELECT * FROM receipts ORDER BY tenant,operation,key').all(),
      events:db.prepare('SELECT * FROM events ORDER BY id').all()
    };
    db.exec('COMMIT');
    return result;
  } finally { if (db.isTransaction) db.exec('ROLLBACK'); db.close(); }
}
