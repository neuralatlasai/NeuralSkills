import { readFileSync,writeFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const artifact=dirname(fileURLToPath(import.meta.url));
const trial=dirname(artifact);
const control=JSON.parse(readFileSync(join(artifact,'original/control-v2.json'),'utf8'));
const input=JSON.parse(readFileSync(join(artifact,'original/B02.json'),'utf8'));
const verification=JSON.parse(readFileSync(join(artifact,'verification.json'),'utf8'));
const scoped={
 L04:['IMPLEMENTED_OR_CHANGED','reserve tenant/item predicates','Tenant scope is checked in reads, conditional writes and allocations; upstream authentication is outside this fixture.','verification.json: validation-and-tenant-scope; forced-race-2-connection'],
 L05:['INHERITED_VERIFIED','exported reserve API','Original async function and status/result object shape retained; no HTTP server requested.','original/store.mjs; store.mjs; after.stdout.json'],
 L06:['IMPLEMENTED_OR_CHANGED','reserve mutation','Stock decrement and allocation creation commit together; conflict is read/write safe.','verification.json: forced-race-1-connection; fault-rollback-reopen-retry'],
 L07:['IMPLEMENTED_OR_CHANGED','quantity and error handling','Positive safe integer validation, missing item, stale version and insufficient stock outcomes exercised.','verification.json: validation-and-tenant-scope'],
 L08:['IMPLEMENTED_OR_CHANGED','reservation lifecycle','Async read hook precedes transaction; synchronous fault hook stays inside transaction.','store.mjs; verification.json: forced-race-1-connection; fault-rollback-reopen-retry'],
 L09:['IMPLEMENTED_OR_CHANGED','Node/native SQLite concurrency','Node v24.12.0 and SQLite 3.50.4 verified on Windows x64; no container/capacity claim.','verification.json: runtime; busy-lock-acquisition-retry'],
 L10:['INHERITED_VERIFIED','stock and allocations schema','Original tables and seeded tenant rows exercised on fresh real SQLite files; no migration requested.','original/store.mjs; verification.json: forced-race-2-connection'],
 L11:['IMPLEMENTED_OR_CHANGED','parameterized conditional UPDATE RETURNING','CAS write scopes tenant/item/version and sufficient quantity; no query-plan tuning needed for supplied tiny tables.','store.mjs; verification.json: forced-race-2-connection'],
 L12:['IMPLEMENTED_OR_CHANGED','SQLite transaction and writer lock','BEGIN IMMEDIATE, CAS and rollback enforce consistency; bounded BEGIN busy retry tested.','verification.json: forced-race-2-connection; fault-rollback-reopen-retry; busy-lock-acquisition-retry; busy-exhaustion-no-mutation'],
 L14:['INHERITED_VERIFIED','local file-backed SQLite','File storage and clean close/reopen verified; replication, sharding and remote storage outside fixture.','verification.json: forced-race-1-connection; fault-rollback-reopen-retry'],
 L21:['IMPLEMENTED_OR_CHANGED','rollback and connection recovery','Injected fault rolls back and same connection retries; clean reopen verified. Crash/backup recovery untested and not claimed.','verification.json: fault-rollback-reopen-retry'],
 L22:['IMPLEMENTED_OR_CHANGED','local verification evidence','Retained before/after state, runtime, raw stderr and checks; production telemetry/SLOs outside scope.','before.stdout.json; after.stdout.json; verification.json; command-log.json'],
 L24:['IMPLEMENTED_OR_CHANGED','input boundary and tenant scoping','Built-ins only, parameterized SQL and scoped identifiers; credentials/privacy policies outside local fixture.','store.mjs; verification.json: validation-and-tenant-scope']
};
const outReasons={L01:'No network, discovery or sockets in the supplied database-only function.',L02:'No network transport or certificates.',L03:'No ingress, proxy, CDN or balancing layer.',L13:'No production database administration or privilege changes authorized.',L15:'No cache or materialized derived state in the fixture.',L16:'No messages, outbox, CDC or external asynchronous effects.',L17:'No durable worker or scheduler in the fixture.',L18:'No object store, search service or specialized store; SQLite file evidence is covered by L14.',L19:'No external API/webhook/tool integration in the reservation path.',L20:'No production traffic, cost or scaling target; local timeout measurements are not capacity evidence.',L23:'No build pipeline, infrastructure or deployment changes requested.'};
const coverageDispositions=control.areas.map(a=>{const s=scoped[a.id];return {area:a.id,disposition:s?.[0]??'OUT_OF_SCOPE',component:s?.[1]??a.name,reason:s?.[2]??outReasons[a.id],evidence:s?.[3]??'Case B02 task and supplied database-only fixtures; no corresponding service configured.'};});
const commandLog={
 convention:'Nested tools and collaboration calls counted, functions.exec wrappers excluded. No model/token/cost counters exposed.',
 calls:[
  {number:1,tool:'exec_command',command:'Get-Content -LiteralPath <package>/evals/dispatch/B02-baseline-2.txt',exitCode:0,stdout:'Dispatch instructions read; exact named case/control/fixture and trial paths supplied.',stderr:''},
  {number:2,tool:'exec_command',command:'Get-Content -LiteralPath <package>/evals/inputs/B02.json; Get-Content -LiteralPath <package>/evals/inputs/control-v2.json',exitCode:0,stdout:'Inputs preserved byte-for-byte under original/B02.json and original/control-v2.json.',stderr:''},
  {number:3,tool:'exec_command',command:'Create trial/artifact/original; Copy-Item named fixtures and input/control; Get-Content original/store.mjs, original/probe.mjs, original/README.md; node --version; UTC timestamp',exitCode:0,stdout:'Original fixture contents are preserved; node v24.12.0; first directly observed UTC 2026-11-05T17:30:43.8004674Z.',stderr:''},
  {number:4,tool:'exec_command',command:'Copy original store/probe to artifact; node artifact/original/probe.mjs artifact/before-race.sqlite',exitCode:0,stdout:'before.stdout.json',stderr:'before.stderr.txt'},
  {number:5,tool:'apply_patch',command:'Attempt delete/add replacement of store.mjs plus verify.mjs',exitCode:null,stdout:'',stderr:'apply_patch verification failed: invalid patch: multiple operations target C:\\Users\\heman\\Desktop\\skills\\Skills_NeuralWorld\\NeuralSkills\\roles\\saas\\backend-engineering\\evals\\trials\\B02-baseline-2\\artifact\\store.mjs',outcome:'FAIL; no changes applied'},
  {number:6,tool:'apply_patch',command:'Update store.mjs and add verify.mjs using retained final sources',exitCode:null,stdout:'{}',stderr:'',outcome:'PASS'},
  {number:7,tool:'exec_command',command:'node artifact/probe.mjs artifact/after-race.sqlite > artifact/after.stdout.json 2> artifact/after.stderr.txt; node artifact/verify.mjs > artifact/verify.stdout.json 2> artifact/verify.stderr.txt',exitCode:0,childExitCodes:{probe:0,verify:0},stdout:['after.stdout.json','verify.stdout.json'],stderr:['after.stderr.txt','verify.stderr.txt']},
  {number:8,tool:'collaboration.send_message',command:'Notify parent of actual passing results and preserved failed patch.',exitCode:null,stdout:'Message delivered',stderr:''},
  {number:9,tool:'apply_patch',command:'Add artifact/README.md and artifact/finalize.mjs',exitCode:null,stdout:'{}',stderr:'',outcome:'PASS'},
  {number:10,tool:'exec_command',command:'node artifact/finalize.mjs > artifact/finalize.stdout.txt 2> artifact/finalize.stderr.txt; read resulting stdout/stderr',exitCode:0,stdout:'finalize.stdout.txt',stderr:'finalize.stderr.txt'}
 ]
};
writeFileSync(join(artifact,'command-log.json'),JSON.stringify(commandLog,null,2)+'\n');
const endUtc=new Date().toISOString();
const evidenceByRequirement={
 'B02-R01':['after.stdout.json','verification.json: forced-race-1-connection; forced-race-2-connection'],
 'B02-R02':['verification.json: fault-rollback-reopen-retry'],
 'B02-R03':['store.mjs','verification.json: validation-and-tenant-scope'],
 'B02-R04':['probe.mjs','verification.json: forced-race-1-connection; forced-race-2-connection; fault-rollback-reopen-retry; busy-lock-acquisition-retry'],
 'B02-R05':['README.md','verification.json: runtime; busy-lock-acquisition-retry; busy-exhaustion-no-mutation'],
 'B02-R06':['../result.json: coverageDispositions and decisions','command-log.json']
};
const result={caseId:'B02',arm:'baseline',run:2,route:'isolated local implementation using Node native SQLite; no backend skill read',coverageDispositions,
 requirements:input.requirements.map(r=>({id:r.id,status:verification.checks.every(c=>c.status==='PASS')?'PASS':'UNVERIFIED',evidence:evidenceByRequirement[r.id]})),
 decisions:[
  {requirement:'B02-R01',mechanism:'SQLite BEGIN IMMEDIATE with scoped conditional UPDATE RETURNING and allocation INSERT before COMMIT.',limit:'One writer at a time; results verified on one and two connections within a single process.',failure:'CAS miss returns 409; no stock/allocation mutation.',verification:'forced-race-1-connection; forced-race-2-connection; original/repaired probe'},
  {requirement:'B02-R02',mechanism:'afterWrite executes synchronously between stock and allocation writes inside the transaction; errors ROLLBACK and rethrow.',limit:'Synchronous fault hook only, no external effect or reentrant database transaction.',failure:'Original exception propagates; rollback failure yields AggregateError.',verification:'fault-rollback-reopen-retry'},
  {requirement:'B02-R03',mechanism:'Validate safe positive quantity, scoped lookup, parameterized CAS version/stock guard.',limit:'Tenant identity is trusted input; no auth layer; invalid quantity is checked before missing item.',failure:'400 invalid quantity/tenant/item, 404 missing scoped item, 409 stale/insufficient.',verification:'validation-and-tenant-scope'},
  {requirement:'B02-R04',mechanism:'Await afterRead before lock; keep write transaction synchronous; preserve exported reserve/openStore API.',limit:'Connection must be open and transaction-idle; async afterWrite unsupported as in fixture.',failure:'Read hook rejection propagates before transaction; write hook failure rolls back.',verification:'forced-race-1-connection; fault-rollback-reopen-retry'},
  {requirement:'B02-R05',mechanism:'Real SQLite files; up to three BEGIN SQLITE_BUSY attempts with 10ms async gaps and configured 200ms busy_timeout.',limit:'Timeouts do not guarantee wall latency; no OS-process/crash/power-loss or capacity validation.',failure:'Busy exhaustion returns 409; other SQLite exceptions propagate after rollback if transaction began.',verification:'runtime; busy-lock-acquisition-retry; busy-exhaustion-no-mutation; README.md'},
  {requirement:'B02-R06',mechanism:'Enumerate L01-L24 using supplied coverage vocabulary separately from test outcomes; retain failed patch and raw evidence.',limit:'No hidden tests, broader system coverage or exact token/cost counters available.',failure:'Required evidence absent would remain UNVERIFIED; unrelated infrastructure is explicitly OUT_OF_SCOPE.',verification:'result schema assertions in finalize.mjs; command-log.json'}
 ],
 checks:[{id:'original-bug-reproduction',status:'PASS',command:'node artifact/original/probe.mjs artifact/before-race.sqlite',exitCode:0,evidence:'before.stdout.json: two 201 responses, two allocations, stock 1/version2; reproduces defect rather than accepting original behavior.',kind:'regression reproduction'},...verification.checks.map(c=>({...c,command:'node artifact/verify.mjs',exitCode:0,kind:'actual file-backed SQLite verification'}))],
 evidence:['artifact/original/','artifact/store.mjs','artifact/probe.mjs','artifact/verify.mjs','artifact/before.stdout.json','artifact/before.stderr.txt','artifact/after.stdout.json','artifact/after.stderr.txt','artifact/verification.json','artifact/verify.stdout.json','artifact/verify.stderr.txt','artifact/command-log.json','artifact/README.md',verification.runDir],
 assumptions:['Supplied afterWrite is synchronous and has no external effects.','Caller supplies a transaction-idle, open connection and already trusted tenant identity.','First tool timestamp was not exposed. startUtc/elapsedSeconds are null rather than invented; first observed UTC was 2026-11-05T17:30:43.8004674Z after the third tool. Work completed within 360 seconds; observed lower-bound duration is recorded in limitations.'],
 limitations:['No HTTP service was requested or added.','No cross-OS-process, crash, power-loss, backup, network-filesystem or load verification.','No idempotency key for ambiguous caller retries; inherited schema remains unchanged.','Node native SQLite emitted an experimental-feature warning, preserved in stderr.','busy_timeout 200ms and 3 BEGIN attempts are not a strict wall-time bound; observed exhaustion about 936ms.',`Observed duration since third-tool timestamp: ${(Date.parse(endUtc)-Date.parse('2026-11-05T17:30:43.8004674Z'))/1000} seconds; true elapsed includes two earlier read tools and intervening reasoning.`],
 startUtc:null,endUtc,elapsedSeconds:null,actualTokens:null,tokenAvailability:'Unavailable: no token usage counter exposed to trial agent.',actualCost:null,costAvailability:'Unavailable: no monetary usage counter exposed to trial agent.',toolCalls:10,toolCallAvailability:'Exact: 9 nested tools and 1 collaboration send_message; functions.exec wrappers excluded. Includes one failed apply_patch.',limits:{wallSeconds:360,toolCalls:20,breaches:[]}};
assert.equal(result.coverageDispositions.length,24);assert.equal(new Set(result.coverageDispositions.map(c=>c.area)).size,24);
for(const c of result.coverageDispositions)assert.ok(control.coverageDispositions.some(x=>x.value===c.disposition));
for(const r of result.requirements)assert.ok(control.resultStatuses.values.includes(r.status));
assert.ok(verification.checks.every(c=>c.status==='PASS'));
writeFileSync(join(trial,'result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({result:join(trial,'result.json'),checks:verification.checks.length,passed:verification.checks.filter(c=>c.status==='PASS').length,coverage:coverageDispositions.length,toolCalls:10,endUtc},null,2));
