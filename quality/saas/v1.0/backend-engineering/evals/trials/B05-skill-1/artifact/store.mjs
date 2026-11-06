import {DatabaseSync} from 'node:sqlite';
import {existsSync, renameSync, unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
export function openStore(file, options = {}) { const db = new DatabaseSync(file, options); db.exec('PRAGMA busy_timeout=1000;'); return db; }
export function seed(db) { db.exec("BEGIN IMMEDIATE; PRAGMA user_version=1; CREATE TABLE customers(tenant TEXT NOT NULL,id TEXT NOT NULL,name TEXT NOT NULL,PRIMARY KEY(tenant,id)); INSERT INTO customers VALUES('north','c1','Aster'),('north','c2','Birch'),('south','c1','Cedar'),('north','erased','Delete requested'); COMMIT;"); }
function transaction(db, work) { db.exec('BEGIN IMMEDIATE;'); try { const result = work(); db.exec('COMMIT;'); return result; } catch (error) { db.exec('ROLLBACK;'); throw error; } }
export function migrate(db, {afterBatch = () => {}} = {}) {
  if (typeof afterBatch !== 'function') throw new TypeError('afterBatch must be a function');
  transaction(db, () => {
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (version !== 1 && version !== 2) throw new Error('Only schema 1 or 2 is supported');
    const columns = db.prepare('PRAGMA table_info(customers)').all();
    if (!columns.some(c => c.name === 'state')) { if (version === 2) throw new Error('Schema 2 is missing state'); db.exec('ALTER TABLE customers ADD COLUMN state TEXT;'); }
    if (db.prepare("SELECT 1 FROM customers WHERE state IS NOT NULL AND state <> 'active' LIMIT 1").get()) throw new Error('Unexpected customer state');
  });
  let batch = 0, updated = 0;
  for (;;) {
    const rows = transaction(db, () => {
      const selected = db.prepare('SELECT tenant,id FROM customers WHERE state IS NULL ORDER BY tenant,id LIMIT 2').all();
      if (!selected.length) { db.exec('PRAGMA user_version=2;'); return selected; }
      db.exec('PRAGMA user_version=1;');
      const update = db.prepare("UPDATE customers SET state='active' WHERE tenant=? AND id=? AND state IS NULL");
      for (const row of selected) update.run(row.tenant, row.id);
      return selected;
    });
    if (!rows.length) return {batches: batch, updated, schema: 2};
    updated += rows.length;
    afterBatch({batch: ++batch, updated: rows.length, totalUpdated: updated, rows});
  }
}
function freshTarget(source, target) { if (typeof target !== 'string' || resolve(source) === resolve(target) || existsSync(target)) throw new Error('Target must be a new, different file'); }
export function createBackup(source, target) {
  freshTarget(source, target);
  const db = openStore(source, {readOnly: true});
  try {
    if (db.prepare('PRAGMA user_version').get().user_version !== 1 || db.prepare('PRAGMA table_info(customers)').all().some(c => c.name === 'state')) throw new Error('Backup requires pristine v1 schema');
    db.prepare('VACUUM INTO ?').run(resolve(target));
  } finally { db.close(); }
  const check = openStore(target, {readOnly: true});
  try { if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Backup integrity failure'); } finally { check.close(); }
  return target;
}
export function validateDeletions(deletions) {
  if (!Array.isArray(deletions) || deletions.length > 10000) throw new Error('Deletion journal must be an array of at most 10000 entries');
  for (const row of deletions) if (!row || !['tenant', 'id'].every(k => typeof row[k] === 'string' && Buffer.byteLength(row[k]) > 0 && Buffer.byteLength(row[k]) <= 1024)) throw new Error('Invalid deletion key');
}
export function restore(source, target, {deletions} = {}) {
  validateDeletions(deletions); freshTarget(source, target);
  const temporary = `${resolve(target)}.restoring-${randomUUID()}`;
  let db;
  try {
    createBackup(source, temporary); db = openStore(temporary);
    transaction(db, () => { const remove = db.prepare('DELETE FROM customers WHERE tenant=? AND id=?'); for (const row of deletions) remove.run(row.tenant, row.id); });
    migrate(db);
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Restore integrity failure');
    const denied = db.prepare('SELECT 1 FROM customers WHERE tenant=? AND id=?');
    for (const row of deletions) if (denied.get(row.tenant, row.id)) throw new Error('Deletion reconciliation failed');
    db.close(); db = undefined;
    if (existsSync(target)) throw new Error('Target appeared during restore');
    renameSync(temporary, target); return openStore(target);
  } catch (error) { if (db) db.close(); if (existsSync(temporary)) unlinkSync(temporary); throw error; }
}
