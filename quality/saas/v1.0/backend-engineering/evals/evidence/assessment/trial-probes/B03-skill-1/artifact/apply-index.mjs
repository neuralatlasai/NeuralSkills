import {DatabaseSync} from 'node:sqlite';
import {performance} from 'node:perf_hooks';
import {statSync} from 'node:fs';
const file = process.argv[2] ?? 'parcels.sqlite';
const db = new DatabaseSync(file);
db.exec('PRAGMA busy_timeout=5000');
const storage = () => ({pageCount: db.prepare('PRAGMA page_count').get().page_count,
  pageSize: db.prepare('PRAGMA page_size').get().page_size,
  freePages: db.prepare('PRAGMA freelist_count').get().freelist_count,
  databaseFileBytes: statSync(file).size,
  walFileBytes: (() => {try {return statSync(file+'-wal').size;} catch {return 0;}})()});
try {
  const before = storage();
  const started = performance.now();
  db.exec("BEGIN IMMEDIATE; CREATE INDEX IF NOT EXISTS parcels_ready_tenant_order ON parcels(tenant,created_at DESC,id DESC) WHERE status='ready'; COMMIT; ANALYZE;");
  console.log(JSON.stringify({before, after:storage(), elapsedMs:performance.now()-started,
    index:db.prepare("SELECT name,sql FROM sqlite_schema WHERE name='parcels_ready_tenant_order'").get(),
    note:'Logical allocated pages and observed file/WAL sizes; not physical I/O or isolated index size.'}, null, 2));
} catch (error) {
  if (db.isTransaction) db.exec('ROLLBACK');
  throw error;
} finally {db.close();}
