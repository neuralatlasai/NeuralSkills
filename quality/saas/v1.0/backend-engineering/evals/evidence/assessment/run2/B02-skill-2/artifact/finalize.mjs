import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url),'utf8'));
const v=read('./verification.json'), control=read('./original/control-v2.json');
const coverage = [
 ['L01','OUT_OF_SCOPE','none','Direct local SQLite module; no DNS or sockets in the requested path.','artifact/original/README.md'],
 ['L02','OUT_OF_SCOPE','none','No transport or certificate changes in this local file-backed fixture.','artifact/README.md'],
 ['L03','OUT_OF_SCOPE','none','No ingress, gateway or load balancer exists in this fixture.','artifact/original/store.mjs'],
 ['L04','IMPLEMENTED_OR_CHANGED','store.mjs reserve predicates','Tenant/item bound in every read and write; caller identity remains trusted input, not authenticated here.','artifact/verification.json contracts-and-tenant-scope; fault-same-connection-retry-and-item-scope'],
 ['L05','INHERITED_VERIFIED','openStore/reserve exports and probe.mjs','Direct async JavaScript API and unchanged result shapes verified by unchanged supplied probe; no HTTP protocol scope.','artifact/logs/fixed-probe.stdout.txt'],
 ['L06','IMPLEMENTED_OR_CHANGED','reserve','Reservation result contracts preserved while making decrement and allocation a single operation.','artifact/verification.json race-two-connections-1..3; contracts-and-tenant-scope'],
 ['L07','IMPLEMENTED_OR_CHANGED','reserve validation/error path','Preserved positive safe integer validation and status shapes; rollback errors are propagated, not suppressed.','artifact/verification.json contracts-and-tenant-scope; fault-rollback-reopen-retry'],
 ['L08','IMPLEMENTED_OR_CHANGED','reserve lifecycle','Async read hook precedes transaction; synchronous fault hook remains between local writes.','artifact/verification.json race-two-connections-1..3; fault-rollback-reopen-retry'],
 ['L09','IMPLEMENTED_OR_CHANGED','DatabaseSync critical path','No await while owning transaction; real two-connection lock contention tested. OS/container capacity is outside scope.','artifact/verification.json sqlite-busy-release-retry; runtime'],
 ['L10','INHERITED_VERIFIED','openStore DDL','Existing composite stock key and available>=0 constraint retained; no migration added.','artifact/store.mjs; artifact/verification.json exact-depletion contract state'],
 ['L11','IMPLEMENTED_OR_CHANGED','conditional UPDATE RETURNING and INSERT','Parameterized composite-key CAS replaces unconditional write; actual lookup plan retained on small fixture.','artifact/verification.json fault-same-connection-retry-and-item-scope plan'],
 ['L12','IMPLEMENTED_OR_CHANGED','SQLite transaction owner in reserve','BEGIN IMMEDIATE, conditional write, commit/rollback protect stock and allocation together.','artifact/verification.json race-two-connections-1..3; allocation-insert-failure-rolls-back'],
 ['L13','OUT_OF_SCOPE','local file permissions','No database role, ACL or operational administration change requested; SQLite has no SQL GRANT/RLS boundary here.','artifact/README.md'],
 ['L14','INHERITED_VERIFIED','file-backed SQLite journal','Actual journal/synchronous settings and close/reopen persistence verified; power-loss durability, pressure and distribution unverified outside task.','artifact/verification.json runtime; race-two-connections-1..3; fault-rollback-reopen-retry'],
 ['L15','OUT_OF_SCOPE','none','No cache, materialized view or derived state in reservation fixture.','artifact/original/store.mjs'],
 ['L16','OUT_OF_SCOPE','none','No broker, CDC, event log or external async effect.','artifact/original/store.mjs'],
 ['L17','OUT_OF_SCOPE','none','Async test hooks do not introduce durable workers or scheduling.','artifact/README.md'],
 ['L18','OUT_OF_SCOPE','none','No object store, upload or search adapter; SQLite storage is addressed by L14.','artifact/original/store.mjs'],
 ['L19','OUT_OF_SCOPE','none','No external API, webhook, tool or MCP interaction in the implementation.','artifact/store.mjs'],
 ['L20','OUT_OF_SCOPE','local contention diagnostics only','No workload/capacity optimization requested; busy timeout and two-caller limits recorded without traffic guarantees.','artifact/README.md; artifact/verification.json raceElapsedMs'],
 ['L21','IMPLEMENTED_OR_CHANGED','rollback and connection reuse','Injected rollback/retry and persistent close/reopen validated; backup restore and crash/power-loss recovery outside scope.','artifact/verification.json fault-rollback-reopen-retry; fault-same-connection-retry-and-item-scope'],
 ['L22','IMPLEMENTED_OR_CHANGED','verification evidence','Commands, stdout/stderr, states and initial semantic failure retained; no production telemetry/SLO added.','artifact/logs; artifact/verification.json'],
 ['L23','OUT_OF_SCOPE','none','No build system, infrastructure or deployment change; built-ins only.','artifact/README.md'],
 ['L24','IMPLEMENTED_OR_CHANGED','bound SQL and tenant/item predicates','Injection-shaped tenant and scope denials tested; no downloaded dependencies. Identity, file ACLs and broader privacy lifecycle remain outside task.','artifact/verification.json contracts-and-tenant-scope; artifact/store.mjs']
].map(([area,disposition,component,reason,evidence])=>({area,disposition,component,reason,evidence}));
const decisions=[
 {requirement:'B02-R01',mechanism:'BEGIN IMMEDIATE plus tenant/item/version/available conditional UPDATE RETURNING and allocation INSERT in one commit.',limit:'One SQLite writer; two connections/two callers tested on a small local file.',failure:'Stale version or inadequate quantity returns 409; lock timeout throws SQLite error.',verification:'Three forced two-connection races and unchanged supplied same-connection probe: one201/one409, stock1/version2 and one allocation.'},
 {requirement:'B02-R02',mechanism:'Catch hook/insert errors, roll back whole transaction, propagate error.',limit:'Synchronous local afterWrite with no external effects; rollback failure requires discarding connection.',failure:'Fault must leave stock and allocation unchanged; ambiguous commit is not retried automatically.',verification:'fault-rollback-reopen-retry; allocation-insert-failure-rolls-back; fault-same-connection-retry-and-item-scope.'},
 {requirement:'B02-R03',mechanism:'Preserve exports, validation ordering, parameter binding and composite tenant/item predicates.',limit:'Caller supplies trusted tenant; supported quantity is a positive safe JS integer; no arbitrary-writer enforcement.',failure:'Missing item404, bad quantity400, stale version/insufficient stock409; other tenant/item must stay isolated.',verification:'contracts-and-tenant-scope; item-scope check; unchanged probe.'},
 {requirement:'B02-R04',mechanism:'Keep await afterRead before transaction and synchronous afterWrite inside transaction; retain real files and raw logs.',limit:'Hooks may block indefinitely; tests use cooperative async interleaving, not multi-process scheduling.',failure:'A hook throw rejects with no partial write; an unreleased gate would stall caller.',verification:'Barrier count2 in each race; original/reopened state snapshots and explicit retries retained.'},
 {requirement:'B02-R05',mechanism:'Document runtime, SQLite pragmas, single-writer policy, synchronous blocking, explicit retry and query plan.',limit:'Node24.12.0 / SQLite3.50.4 / Windows x64 only tested; busy_timeout200 is not hard deadline.',failure:'Busy errcode5 surfaced; no blind automatic retry or distributed/power-loss guarantee.',verification:'runtime; sqlite-busy-release-retry; retained index plan; README operating limits.'},
 {requirement:'B02-R06',mechanism:'Map all24 control areas to actual scope; use separate acceptance status vocabulary and retained evidence.',limit:'This is one isolated implementation trial; no formal certification or unrelated system coverage.',failure:'Missing required evidence would remain UNVERIFIED; exact initial clock/tokens/cost unavailable.',verification:'Result shape assertions and links to nine passing substantive checks plus original semantic failure.'}
];
const requirementEvidence={
 'B02-R01':['race-two-connections-1','race-two-connections-2','race-two-connections-3','race-same-connection'],
 'B02-R02':['fault-rollback-reopen-retry','allocation-insert-failure-rolls-back','fault-same-connection-retry-and-item-scope'],
 'B02-R03':['contracts-and-tenant-scope','fault-same-connection-retry-and-item-scope'],
 'B02-R04':['race-two-connections-1','fault-rollback-reopen-retry'],
 'B02-R05':['sqlite-busy-release-retry'], 'B02-R06':[]};
const checks=[
 {id:'baseline-defect',status:'FAIL',command:'node original/probe.mjs baseline.sqlite (cwd original)',exitCode:0,evidence:'artifact/logs/baseline.stdout.txt: two201/two allocations, violating invariant; original command has no assertions.',kind:'original-defect-reproduction'},
 ...v.checks.map(c=>({id:c.id,status:c.status,command:'node verify.mjs',exitCode:read('./logs/verification-final.command.json').exitCode,evidence:`artifact/verification.json checks.${c.id}`,kind:'real-file-backed-SQLite-integration'})),
 {id:'unchanged-probe',status:'PASS',command:'node probe.mjs probe-fixed.sqlite',exitCode:read('./logs/fixed-probe.command.json').exitCode,evidence:'artifact/logs/fixed-probe.stdout.txt: one201/one409, one allocation.',kind:'supplied-probe'},
 {id:'output-contract',status:'PASS',command:'node finalize.mjs',exitCode:0,evidence:'24 unique responsibility IDs, exact disposition/status vocabulary and six requirement IDs asserted by finalize.mjs.',kind:'artifact-validation'}
];
const calls=[
 {number:1,tool:'exec_command',action:'Read only assigned dispatch B02-skill-2.txt.',exitCode:0},
 {number:2,tool:'exec_command',action:'Read SKILL.md, B02.json and control-v2.json.',exitCode:0},
 {number:3,tool:'exec_command',action:'Create isolated original/log directories; copy three named raw fixtures; read those originals, data.md and verification.md; node --version and first captured UTC.',exitCode:0},
 {number:4,tool:'exec_command',action:'Run original node probe.mjs baseline.sqlite; preserve stdout/stderr and exitCode0.',exitCode:0},
 {number:5,tool:'apply_patch',action:'Add isolated store.mjs and verify.mjs implementation.',success:true},
 {number:6,tool:'exec_command',action:'Copy unchanged probe; run verification and fixed probe through spawnSync with raw stdout/stderr/commands.',exitCode:0},
 {number:7,tool:'apply_patch',action:'Add original-connection retry and item-isolation test.',success:true},
 {number:8,tool:'exec_command',action:'Copy named B02/control inputs into original; rerun updated verification with separate final logs.',exitCode:0},
 {number:9,tool:'apply_patch',action:'Write README and finalizer containing coverage, decision and resource audit.',success:true},
 {number:10,tool:'exec_command',action:'Run finalizer and output-contract validation; retain final command stdout/stderr.',exitCode:0}
];
const endUtc=new Date().toISOString();
const firstCapturedUtc='2026-11-05T17:29:04.0524544Z';
const result={caseId:'B02',arm:'skill',run:2,route:'backend-engineering skill; B1/B3/B4/B8 proportional local SQLite repair',coverageDispositions:coverage,
 requirements:Object.entries(requirementEvidence).map(([id,ids])=>({id,status:ids.every(id=>v.checks.find(c=>c.id===id)?.status==='PASS')?'PASS':'UNVERIFIED',evidence:ids.length?ids.map(id=>`artifact/verification.json ${id}`):['artifact/finalize.mjs exact control area/disposition validation; artifact/README.md truthful boundaries']})),
 decisions,checks,evidence:{implementation:'artifact/store.mjs',verification:'artifact/verify.mjs',actualResults:'artifact/verification.json',originals:'artifact/original',commandsAndRawLogs:'artifact/logs',runtime:v.runtime,firstCapturedUtc,elapsedLowerBoundSeconds:(Date.parse(endUtc)-Date.parse(firstCapturedUtc))/1000,toolAudit:'artifact/logs/tool-calls.json'},
 assumptions:['Tenant is trusted caller context as in supplied API; this fixture does not authenticate callers.','This writer owns its transaction; hooks do not begin transactions, reenter the connection or perform external effects.','Version/stock schema and external writers remain unchanged; tests use supplied small fixture.'],
 limitations:['Exact first invocation timestamp was neither exposed nor captured: startUtc/elapsedSeconds are null, with first captured clock and lower bound recorded separately.','No power-loss, crash-kill, disk-full, multiprocess load, backup restore, unknown-commit reconciliation or production deployment tests were required/performed.','SQLite single-writer contention can throw; busy_timeout200 is a wait setting, not a wall-clock deadline. afterRead/afterWrite execution is caller-controlled.','Node native SQLite emits an experimental warning; retained. Full schema enforcement against arbitrary SQL writers is outside this reserve-only change.','Timing samples are test diagnostics with three repetitions; no hardware or production capacity guarantee is inferred.'],
 startUtc:null,endUtc,elapsedSeconds:null,actualTokens:null,tokenAvailability:'unavailable: host exposes no actual token accounting',actualCost:null,costAvailability:'unavailable: host exposes no cost accounting',toolCalls:calls.length,toolCallAvailability:'exact manually recorded nested calls; orchestration wrappers excluded; no child spawning/collaboration calls',limits:{wallSeconds:360,toolCalls:20,breaches:[]}};
assert.equal(coverage.length,24);assert.equal(new Set(coverage.map(c=>c.area)).size,24);
assert.deepEqual(coverage.map(c=>c.area).sort(),control.areas.map(a=>a.id).sort());
assert.ok(coverage.every(c=>control.coverageDispositions.some(d=>d.value===c.disposition)));
assert.ok(checks.every(c=>control.resultStatuses.values.includes(c.status)));
assert.equal(result.requirements.length,6);assert.ok(result.requirements.every(r=>r.status==='PASS'));
assert.equal(v.status,'PASS');assert.ok(calls.length<=20);
writeFileSync(new URL('./logs/tool-calls.json',import.meta.url),JSON.stringify(calls,null,2));
writeFileSync(new URL('../result.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({caseId:result.caseId,requirements:result.requirements,checks:checks.map(c=>({id:c.id,status:c.status})),coverageCount:coverage.length,toolCalls:calls.length,firstCapturedUtc,endUtc,elapsedLowerBoundSeconds:result.evidence.elapsedLowerBoundSeconds,actualTokens:null,actualCost:null},null,2));
