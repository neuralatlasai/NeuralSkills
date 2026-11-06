import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { validate, validateSchema, skillRoot, inside } from './validate.mjs';
import { summarize } from './measure.mjs';
import { buildLab } from './build-lab.mjs';
import { startServer } from './serve.mjs';
import { createLatestLoader, createSubmitGate } from '../evals/fixtures/lab/state.ts';

const args = process.argv.slice(2);
if (!(args.length === 0 || (args.length === 2 && args[0] === '--root'))) { console.error('usage: node scripts/test-tools.mjs [--root DIR]'); process.exit(1); }
const root = args[1] ? path.resolve(args[1]) : skillRoot;
let temporary;
const results = [];
async function test(name, action) { await action(); results.push({ name, status: 'PASS' }); }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const request = (url, rawPath, method = 'GET') => new Promise((resolve, reject) => {
  const connection = http.request(`${url}/`, { path: rawPath, method }, response => { let body = ''; response.on('data', chunk => { body += chunk; }); response.on('end', () => resolve({ status: response.statusCode, body, headers: response.headers })); });
  connection.on('error', reject); connection.end();
});
const cli = (script, arguments_) => spawnSync(process.execPath, [path.join(skillRoot, 'scripts', script), ...arguments_], { encoding: 'utf8', timeout: 20000 });
try {
  const actual = await validate(root);
  assert.equal(actual.status, 'PASS', JSON.stringify(actual.errors));
  temporary = await mkdtemp(path.join(os.tmpdir(), 'ui-ux-tools-'));
  const fixture = path.join(temporary, 'skill');
  await mkdir(path.join(fixture, 'assets'), { recursive: true });
  await writeFile(path.join(fixture, 'SKILL.md'), '---\nname: ui-ux-engineering\ndescription: Checks a small fixture.\n---\n# Fixture\n[Guide](guide.md)\n');
  await writeFile(path.join(fixture, 'guide.md'), '# Guide\n');
  await writeFile(path.join(fixture, 'assets/manifest.json'), JSON.stringify({ schemaVersion: '1.0', resources: [{ path: 'guide.md', purpose: 'A local test guide' }] }));
  const schema = { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', required: ['scope'], properties: { scope: { enum: ['page', 'flow'] } }, additionalProperties: false };
  await writeFile(path.join(fixture, 'assets/contracts.schema.json'), JSON.stringify(schema));
  await writeFile(path.join(fixture, 'assets/contract.template.json'), '{"scope":"page"}');
  await test('validator accepts complete metadata, linked resources, manifest and bounded schema', async () => { assert.equal((await validate(fixture)).status, 'PASS'); assert.equal(cli('validate.mjs', ['--root', fixture]).status, 0); });
  await test('validator rejects broken links and an invalid contract', async () => {
    await writeFile(path.join(fixture, 'guide.md'), '[Missing](missing.md)\n[Missing anchor](#absent)\n');
    await writeFile(path.join(fixture, 'assets/contract.template.json'), '{"scope":"banana"}');
    const result = await validate(fixture);
    assert.equal(result.status, 'FAIL'); assert.equal(result.errors.length, 3);
    assert.equal(cli('validate.mjs', ['--root', fixture]).status, 1);
    assert.throws(() => validateSchema({}, { allOf: [] }), /unsupported schema keyword/);
  });
  await test('validator rejects resource traversal and overlong metadata', async () => {
    await writeFile(path.join(fixture, 'assets/manifest.json'), '{"schemaVersion":"1.0","resources":[{"path":"../escape","purpose":"invalid"}]}');
    await writeFile(path.join(fixture, 'SKILL.md'), `---\nname: ui-ux-engineering\ndescription: Fixture.\n---\n${'line\n'.repeat(500)}`);
    const errors = (await validate(fixture)).errors.join('\n');
    assert.match(errors, /escapes/); assert.match(errors, /under 500/);
  });
  await test('actual A-start B-start B-complete A-complete race retains B even when abort is ignored', async () => {
    const a = deferred(), b = deferred(); const signals = [];
    const loader = createLatestLoader((query, signal) => { signals.push(signal); return query === 'A' ? a.promise : b.promise; });
    const pendingA = loader.load('A'); const pendingB = loader.load('B');
    assert.equal(signals[0].aborted, true); b.resolve(['B']); assert.equal(await pendingB, true);
    a.resolve(['A']); assert.equal(await pendingA, false); assert.deepEqual(loader.state.items, ['B']); assert.equal(loader.state.phase, 'success');
  });
  await test('failure retains stale results and retry clears stale/error after recovery', async () => {
    let outcome = 'first'; const loader = createLatestLoader(async () => { if (outcome === 'fail') throw new Error('offline'); return [outcome]; });
    await loader.load('same'); outcome = 'fail'; await loader.load('same');
    assert.deepEqual(loader.state.items, ['first']); assert.equal(loader.state.stale, true); assert.equal(loader.state.error, 'offline');
    outcome = 'recovered'; await loader.load('same'); assert.deepEqual(loader.state.items, ['recovered']); assert.equal(loader.state.stale, false); assert.equal(loader.state.error, null);
  });
  await test('empty success and cancellation keep valid lifecycle states', async () => {
    let outcome = Promise.resolve([]); const loader = createLatestLoader(() => outcome); await loader.load('empty');
    const late = deferred(); outcome = late.promise; const pending = loader.load('later'); assert.equal(loader.state.phase, 'refreshing'); loader.cancel();
    late.resolve(['late']); assert.equal(await pending, false); assert.deepEqual(loader.state.items, []); assert.equal(loader.state.phase, 'success'); assert.equal(loader.state.stale, true);
  });
  await test('initial failure recovers and cancelled first load cannot publish', async () => {
    let fail = true; const loader = createLatestLoader(async () => { if (fail) throw new Error('offline'); return ['ok']; });
    await loader.load('first'); assert.equal(loader.state.stale, false); assert.equal(loader.state.phase, 'error');
    fail = false; await loader.load('retry'); assert.deepEqual(loader.state.items, ['ok']);
    const late = deferred(); const cancelled = createLatestLoader(() => late.promise); const pending = cancelled.load('first'); cancelled.cancel(); late.resolve(['old']);
    assert.equal(await pending, false); assert.equal(cancelled.state.phase, 'idle'); assert.deepEqual(cancelled.state.items, []);
  });
  await test('mutation gate rejects duplicates, unlocks after failure, and accepts retry once', async () => {
    const pending = deferred(); let writes = 0;
    const gate = createSubmitGate(async () => { writes++; return pending.promise; });
    const first = gate.submit('write'); assert.equal(gate.busy, true); assert.deepEqual(await gate.submit('duplicate'), { accepted: false }); assert.equal(writes, 1);
    pending.reject(new Error('write failed')); await assert.rejects(first, /write failed/); assert.equal(gate.busy, false);
    const retry = createSubmitGate(async () => 'created'); assert.deepEqual(await retry.submit('write'), { accepted: true, value: 'created' });
    let attempt = 0; const recovery = createSubmitGate(async () => { if (++attempt === 1) throw new Error('offline'); return 'saved'; });
    await assert.rejects(recovery.submit('x')); assert.deepEqual(await recovery.submit('x'), { accepted: true, value: 'saved' }); assert.equal(attempt, 2);
  });
  await test('measurement reports median/range and rejects insufficient, nonnumeric and field claims', async () => {
    const input = { kind: 'lab', runs: [{ ms: 9 }, { ms: 2 }, { ms: 5 }], conditions: { device: 'local' } };
    assert.deepEqual(summarize(input).metrics.ms, { median: 5, min: 2, max: 9 });
    assert.equal(summarize({ ...input, runs: [...input.runs, { ms: 6 }] }).metrics.ms.median, 5.5);
    assert.throws(() => summarize({ ...input, runs: input.runs.slice(0, 2) }), /three/);
    assert.throws(() => summarize({ ...input, runs: [{ ms: '5' }, { ms: 4 }, { ms: 6 }] }), /finite/);
    assert.throws(() => summarize({ ...input, fieldP75: 10 }), /field/);
    assert.throws(() => summarize({ ...input, conditions: { fieldP75: 10 } }), /field/);
    assert.throws(() => summarize({ kind: 'lab', runs: [{ fieldLcp: 1 }, { fieldLcp: 2 }, { fieldLcp: 3 }] }), /field/);
    const inputFile = path.join(temporary, 'runs.json'); await writeFile(inputFile, JSON.stringify(input));
    assert.equal(cli('measure.mjs', [inputFile]).status, 0);
    await writeFile(inputFile, '{"kind":"lab","runs":[]}'); assert.equal(cli('measure.mjs', [inputFile]).status, 1);
  });
  await test('TypeScript build emits browser JavaScript and rejects missing sources', async () => {
    const lab = path.join(temporary, 'lab'); await mkdir(lab);
    await writeFile(path.join(lab, 'state.ts'), 'export const value: number = 7;'); await writeFile(path.join(lab, 'app.ts'), 'const message: string = "hello";');
    await buildLab(lab); assert.doesNotMatch(await readFile(path.join(lab, 'state.js'), 'utf8'), /: number/);
    assert.equal(cli('build-lab.mjs', ['--root', lab]).status, 0);
    assert.equal(cli('build-lab.mjs', ['--root', path.join(temporary, 'missing')]).status, 1);
  });
  await test('loopback server serves fixture and rejects traversal, malformed paths, mutations and missing resources', async () => {
    const { server, url } = await startServer({ port: 0 });
    try {
      assert.equal((await request(url, '/')).status, 200); assert.match((await request(url, '/')).body, /Work queue/);
      assert.equal((await request(url, '/styles.css')).headers['content-type'], 'text/css; charset=utf-8');
      assert.equal((await request(url, '/%2e%2e/SKILL.md')).status, 400); assert.equal((await request(url, '/%5c..%5cSKILL.md')).status, 400);
      assert.equal((await request(url, '/bad%xx')).status, 400); assert.equal((await request(url, '/missing.html')).status, 404); assert.equal((await request(url, '/', 'POST')).status, 405);
      await assert.rejects(startServer({ port: Number(new URL(url).port) }), /EADDRINUSE/);
    } finally { await new Promise(resolve => server.close(resolve)); }
    assert.equal(cli('serve.mjs', ['--port', '-1']).status, 1);
  });
  await test('browser runner gives a clear failure for a missing explicit browser', async () => {
    const result = cli('lab.mjs', ['--browser', path.join(temporary, 'missing-browser.exe')]);
    assert.equal(result.status, 1); assert.match(result.stderr, /browser|Browser/);
  });
  console.log(JSON.stringify({ status: 'PASS', checks: results.length, results }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: 'FAIL', completed: results, error: error.stack }, null, 2)); process.exitCode = 1;
} finally {
  if (temporary && inside(path.resolve(os.tmpdir()), path.resolve(temporary))) await rm(temporary, { recursive: true, force: true });
}
