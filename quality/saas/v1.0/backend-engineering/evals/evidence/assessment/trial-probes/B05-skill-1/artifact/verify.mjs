import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {openStore, seed, migrate, createBackup, restore} from './store.mjs';
const artifact = dirname(fileURLToPath(import.meta.url)), root = dirname(artifact);
const data = resolve(root, 'evidence', `run-${Date.now()}`); mkdirSync(data, {recursive: true});
const log = {runtime: process.version, platform: process.platform, arch: process.arch, started: new Date().toISOString(), data, checks: [], commands: [], recoverySamplesMs: []};
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const read = file => { const db = openStore(file, {readOnly: true}); try { return {version: db.prepare('PRAGMA user_version').get().user_version, columns: plain(db.prepare('PRAGMA table_info(customers)').all()), rows: plain(db.prepare('SELECT tenant,id,name FROM customers ORDER BY tenant,id').all()), states: db.prepare('PRAGMA table_info(customers)').all().some(c => c.name === 'state') ? plain(db.prepare('SELECT tenant,id,state FROM customers ORDER BY tenant,id').all()) : null, integrity: db.prepare('PRAGMA integrity_check').get().integrity_check}; } finally { db.close(); } };
const check = (name, work) => { try { const evidence = work(); log.checks.push({name, status: 'PASS', evidence}); } catch (error) { log.checks.push({name, status: 'FAIL', error: error.stack}); throw error; } };
const command = (...args) => { const proc = spawnSync(process.execPath, [resolve(artifact, 'cli.mjs'), ...args], {encoding: 'utf8', timeout: 15000}); log.commands.push({command: ['node', 'cli.mjs', ...args], exit: proc.status, stdout: proc.stdout, stderr: proc.stderr}); return proc; };
try {
  const source = resolve(data, 'source-v1.sqlite'), backup = resolve(data, 'backup-v1.sqlite'), migrated = resolve(data, 'migrated.sqlite');
  assert.equal(command('setup', source).status, 0);
  const original = read(source); const sourceHash = hash(source);
  assert.equal(command('backup', source, backup).status, 0);
  const backupHash = hash(backup); log.original = original;
  check('consistent v1 backup', () => { assert.deepEqual(read(backup), original); assert.equal(hash(source), sourceHash); return {sourceHash, backupHash, schema: original.version, rows: original.rows}; });
  createBackup(source, migrated);
  check('interruption after first committed batch', () => {
    const proc = command('interrupt', migrated); assert.equal(proc.status, 1); assert.match(proc.stderr, /INTENTIONAL interruption/);
    const state = read(migrated); assert.equal(state.version, 1); assert.equal(state.states.filter(x => x.state === 'active').length, 2); assert.equal(state.states.filter(x => x.state === null).length, 2); assert.deepEqual(state.rows, original.rows);
    return state;
  });
  check('restart, replay and old SELECT compatibility', () => {
    assert.equal(command('migrate', migrated).status, 0); const first = read(migrated);
    assert.equal(first.version, 2); assert.equal(first.states.length, 4); assert.ok(first.states.every(x => x.state === 'active')); assert.deepEqual(first.rows, original.rows);
    assert.equal(command('migrate', migrated).status, 0); assert.deepEqual(read(migrated), first);
    const events = log.commands.flatMap(c => c.stdout.split('\n').filter(Boolean).map(line => JSON.parse(line))).filter(x => x.batch);
    assert.ok(events.length >= 2); assert.ok(events.every(x => x.updated > 0 && x.updated <= 2)); return {first, events};
  });
  check('abrupt process loss after committed hook and clean restart', () => {
    const file = resolve(data, 'hard-exit.sqlite'); createBackup(source, file);
    const program = `import {openStore,migrate} from ${JSON.stringify(new URL('./store.mjs', import.meta.url).href)}; const db=openStore(process.argv[1]);migrate(db,{afterBatch(){process.exit(23)}});`;
    const proc = spawnSync(process.execPath, ['--input-type=module', '-e', program, file], {encoding: 'utf8', timeout: 15000});
    log.commands.push({command: ['node', '--input-type=module', '-e', program, file], exit: proc.status, stdout: proc.stdout, stderr: proc.stderr}); assert.equal(proc.status, 23); assert.equal(read(file).version, 1);
    const db = openStore(file); try { migrate(db); } finally { db.close(); } assert.deepEqual(read(file).rows, original.rows); assert.equal(read(file).version, 2); return read(file);
  });
  const deletions = JSON.parse(readFileSync(resolve(artifact, 'deletions.json'), 'utf8'));
  const expected = original.rows.filter(row => !deletions.some(d => d.tenant === row.tenant && d.id === row.id));
  for (let run = 1; run <= 3; run++) check(`isolated recovery ${run}`, () => {
    const target = resolve(data, `recovered-${run}.sqlite`), start = performance.now();
    const db = restore(backup, target, {deletions}); db.close(); const recovered = read(target);
    assert.deepEqual(recovered.rows, expected); assert.equal(recovered.version, 2); assert.equal(recovered.integrity, 'ok'); assert.ok(recovered.states.every(x => x.state === 'active')); assert.equal(hash(source), sourceHash); assert.equal(hash(backup), backupHash);
    const elapsedMs = performance.now() - start; log.recoverySamplesMs.push(elapsedMs); return {target, elapsedMs, recovered, sourceHash: hash(source), backupHash: hash(backup)};
  });
  check('restore command and deletion ledger', () => { const target = resolve(data, 'cli-recovered.sqlite'); assert.equal(command('restore', backup, target, resolve(artifact, 'deletions.json')).status, 0); assert.deepEqual(read(target).rows, expected); return read(target); });
  check('tenant scoped deletion', () => { const target = resolve(data, 'tenant-delete.sqlite'); const db = restore(backup, target, {deletions: [...deletions, {tenant: 'north', id: 'c1'}]}); try { assert.equal(db.prepare("SELECT name FROM customers WHERE tenant='south' AND id='c1'").get().name, 'Cedar'); assert.equal(db.prepare("SELECT count(*) AS n FROM customers WHERE tenant='north' AND id='c1'").get().n, 0); } finally { db.close(); } return read(target); });
  check('invalid and missing deletion ledger rejected before publication', () => { for (const deletions of [undefined, {}, [{tenant: 'north'}]]) { const target = resolve(data, `invalid-${log.checks.length}-${String(deletions)}`); assert.throws(() => restore(backup, target, {deletions})); assert.equal(existsSync(target), false); } return 'invalid ledgers never publish'; });
  check('existing targets and setup refuse overwrite', () => { assert.throws(() => restore(backup, backup, {deletions})); assert.throws(() => createBackup(source, backup)); assert.equal(command('setup', source).status, 1); assert.equal(hash(source), sourceHash); assert.equal(hash(backup), backupHash); return {sourceHash, backupHash}; });
  check('corrupt backup rejected without published destination', () => { const bad = resolve(data, 'corrupt.sqlite'), target = resolve(data, 'bad-restore.sqlite'); writeFileSync(bad, 'not a database'); assert.throws(() => restore(bad, target, {deletions})); assert.equal(existsSync(target), false); return 'no target exists'; });
  check('engine snapshot includes committed WAL data', () => {
    const file = resolve(data, 'wal-source.sqlite'), snapshot = resolve(data, 'wal-backup.sqlite'), db = openStore(file); try { seed(db); db.exec("PRAGMA journal_mode=WAL; INSERT INTO customers VALUES('south','wal','Committed WAL');"); createBackup(file, snapshot); assert.equal(read(snapshot).rows.length, 5); } finally { db.close(); } return read(snapshot);
  });
  log.status = 'PASS';
} catch (error) { log.status = 'FAIL'; log.error = error.stack; process.exitCode = 1; }
log.ended = new Date().toISOString();
if (log.recoverySamplesMs.length) { const sorted = [...log.recoverySamplesMs].sort((a,b) => a-b); log.recoverySummaryMs = {min: sorted[0], median: sorted[Math.floor(sorted.length/2)], max: sorted.at(-1), samples: sorted.length}; }
writeFileSync(resolve(root, 'evidence', 'verification.json'), JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));
