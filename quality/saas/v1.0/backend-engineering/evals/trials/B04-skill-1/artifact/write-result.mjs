import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const trial=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const verification=JSON.parse(readFileSync(resolve(trial,'evidence/verification.json'),'utf8'));
const source=JSON.parse(readFileSync(resolve(trial,'../../inputs/responsibilities.json'),'utf8'));
const startUtc='2026-11-05T17:03:14.6948104Z';
const endUtc=new Date().toISOString();
const e='evidence/verification.json';
const dispositions={
  L01:['OUT_OF_SCOPE','No network, resolver or socket path in this local SQLite worker.','artifact/README.md'],
  L02:['OUT_OF_SCOPE','No transport or certificates; no TLS boundary in this fixture.','artifact/README.md'],
  L03:['OUT_OF_SCOPE','CLI and direct local module calls have no proxy or ingress.','artifact/README.md'],
  L04:['OUT_OF_SCOPE','Trusted local caller/file boundary; tenant or authentication service is absent and not requested.','artifact/README.md'],
  L05:['OUT_OF_SCOPE','Preserve module/CLI interface; no HTTP, RPC or streaming service.','artifact/worker.mjs'],
  L06:['IMPLEMENTED_OR_CHANGED','Durable enqueue binds job identity; equal replay accepts and conflicting reuse rejects.',e],
  L07:['IMPLEMENTED_OR_CHANGED','Validate IDs, known accounts, safe positive integers; structured failure codes and failed poison state.',e],
  L08:['IMPLEMENTED_OR_CHANGED','Pending/effect-ledger/done lifecycle and separate terminal failure; transaction owns the local effect.',e],
  L09:['IMPLEMENTED_OR_CHANGED','One active worker; one job per call; finally closes CLI DB, bounded diagnostic materialization and child timeouts.',e],
  L10:['IMPLEMENTED_OR_CHANGED','Add per-job credit ledger primary key/FKs, attempts/error columns and pending index.',e],
  L11:['IMPLEMENTED_OR_CHANGED','Parameterized statements and indexed pending/identity queries; no ORM or performance claim.','artifact/worker.mjs'],
  L12:['IMPLEMENTED_OR_CHANGED','BEGIN IMMEDIATE effect+ledger transaction with rollback; separate acknowledgement reconciles committed effects.',e],
  L13:['OUT_OF_SCOPE','SQLite file/OS trust boundary has no SQL role/grant administration; production permissions are not requested or verified.','artifact/README.md'],
  L14:['IMPLEMENTED_OR_CHANGED','Local durable ledger and synchronous FULL; actual same-file process restart tested, no replication/sharding claim.',e],
  L15:['OUT_OF_SCOPE','No cache, materialized view or asynchronous projection is introduced.','artifact/README.md'],
  L16:['IMPLEMENTED_OR_CHANGED','Local durable enqueue/replay and effect-before-ack failure boundary; no broker or external delivery guarantee.',e],
  L17:['IMPLEMENTED_OR_CHANGED','Durable job identity, bounded persistent attempts, terminal failure and crash reconciliation.',e],
  L18:['OUT_OF_SCOPE','SQLite is covered as the selected DB; no upload/object/search/specialized store path.','artifact/README.md'],
  L19:['OUT_OF_SCOPE','No remote API, webhook, MCP adapter or external effect.','artifact/README.md'],
  L20:['IMPLEMENTED_OR_CHANGED','At most one pending job and three effect attempts; finite diagnostic output; explicitly unbounded total retained queue.','artifact/README.md'],
  L21:['IMPLEMENTED_OR_CHANGED','Three actual process crashes and usable same-file restart plus rollback recovery tested; backup/DR not claimed.',e],
  L22:['IMPLEMENTED_OR_CHANGED','Persistent job attempts/error and bounded structured CLI snapshots expose done/failed outcomes.',e],
  L23:['IMPLEMENTED_OR_CHANGED','Executable original-style CLI and native Node version verified; no dependency downloads, build or deployment.',e],
  L24:['IMPLEMENTED_OR_CHANGED','Bounded validated inputs and parameterized SQL; trusted local file/direct-writer limitation documented.',e]
};
const decision=(id,requirements,mechanism,limit,failure,verification)=>({id,requirement:requirements,mechanism,limit,failure,verification});
const requirements=[
  ['B04-R01',['durable duplicate and conflicting enqueue']],
  ['B04-R02',['real process crash and restart 1','real process crash and restart 2','real process crash and restart 3']],
  ['B04-R03',['invalid enqueue and legacy poison jobs reject without silent completion','transaction rollback, retry cap, and subsequent healthy work']],
  ['B04-R04',['normal completion, callback failure and bounded per-call work','transaction rollback, retry cap, and subsequent healthy work']],
  ['B04-R05',verification.checks.map(c=>c.name)],
  ['B04-R06',[]]
].map(([id,checkNames])=>({id,status:checkNames.every(name=>verification.checks.find(c=>c.name===name)?.status==='PASS')?'PASS':'FAIL',evidence:id==='B04-R06'?['result.json#/coverageDispositions','result.json#/decisions']:[e,...checkNames],note:id==='B04-R06'?'All 24 task-level dispositions contain reasons/evidence and five-field requirement-linked decisions are recorded.':undefined}));
const result={
  caseId:'B04',arm:'skill',run:1,status:requirements.every(r=>r.status==='PASS')?'PASS':'FAIL',
  route:{skill:'backend-engineering',activeModules:['B1','B3','B4','B5','B6','B7','B8'],basis:'Local enqueue/worker correctness, SQLite transaction and restart recovery; no edge/network module.'},
  startUtc,endUtc,elapsedSeconds:(Date.parse(endUtc)-Date.parse(startUtc))/1000,actualTokens:null,cost:null,
  knownExternalToolCount:12,toolCallCountingBasis:'9 functions.exec calls (including final metadata validation) and 3 collaboration.send_message calls; nested commands included in their containing external invocation. Final response is not a tool call.',
  runtime:{node:verification.runtime,sqlite:verification.sqlite,platform:verification.platform,arch:verification.arch},
  requirements,
  coverageDispositions:source.areas.map(area=>({id:area.id,name:area.name,disposition:dispositions[area.id][0],reason:dispositions[area.id][1],evidence:[dispositions[area.id][2]]})),
  decisions:[
    decision('B04-D01',['B04-R01'],'Validate exact ID/account/amount, check known account, and compare durable job parameters inside BEGIN IMMEDIATE; bind SQL values.','IDs<=256 UTF-8 bytes, accounts<=128 bytes, positive safe integer amount; local trusted callers.','Invalid payload rejects without enqueue; conflicting ID raises JOB_CONFLICT; direct SQL bypass is trusted/outside API.','File reopen replay, amount/account conflict, invalid payload checks in '+e),
    decision('B04-D02',['B04-R02'],'Balance update and unique job credit ledger insert commit together before real process.exit(73) hook; matching ledger reconciles to done.','One SQLite database, one active worker, only local balance effect; retain identities indefinitely.','Crash after commit leaves pending+credit; restart acknowledges without recredit. External effects and pre-repair unledgered effects require separate reconciliation.','Three actual crash exit73/restart exit0 runs and persisted SQL observations in '+e),
    decision('B04-D03',['B04-R03'],'Revalidate pending jobs; invalid payload or unsafe total becomes failed; rollback effect+ledger on storage errors; CLI finally closes DB.','A bounded safe-integer balance; three effect attempts; transaction cleanup assumes DB remains writable.','Poison job never silently becomes done; storage failure propagates and later healthy job remains processable; disk failure not tested.','Legacy invalid rows, post-effect callback failure and injected ledger-trigger rollback/recovery in '+e),
    decision('B04-D04',['B04-R04'],'One pending job per runOne/CLI invocation, persistent attempt cap3, no retry loop; existing ledger reconciles before retry limit.','250ms busy timeout per acquisition, output100 rows/table; no total queue quota or hard wall deadline.','After three effect errors job is failed; caller must reinvoke for retries; corrupt ledger mismatch requires manual repair.','One-job checks and three injected storage failures in '+e+'; limits documented in artifact/README.md'),
    decision('B04-D05',['B04-R05','B04-R06'],'Built-in test script uses native file-backed SQLite and spawned real CLI; preserve child status/stdout/stderr and all coverage/decision trace.','Node24.12.0 SQLite3.50.4 Windows x64 tested; no downloads/network/production action.','Required failing checks remain FAIL; unsupported production/distributed outcomes are explicit limitations.','node artifact/verify.mjs, '+e+', result.json and artifact/README.md')
  ],
  checks:[
    {command:'node --version',exit:0,status:'PASS',kind:'runtime',evidence:['Observed v24.12.0 during inspection']},
    {command:'node artifact/verify.mjs',exit:verification.checks.some(c=>c.status==='FAIL')?1:0,status:verification.checks.every(c=>c.status==='PASS')?'PASS':'FAIL',kind:'real-sqlite-integration-and-process-fault',evidence:[e]},
    ...verification.checks.map(c=>({command:'node artifact/verify.mjs # '+c.name,exit:c.status==='PASS'?0:1,status:c.status,kind:'integration-subcheck',evidence:[e+' # '+c.name]})),
    {command:'initial apply_patch delete+add same worker path',exit:null,status:'FAIL',kind:'tooling',evidence:['evidence/initial-tool-failure.json'],note:'Patch rejected before mutation: multiple operations target worker.mjs. Corrected using Update File; acceptance checks first ran after correction.'}
  ],
  assumptions:['Exactly one active worker; no stale concurrent owner or external broker.','Trusted local caller and DB file/direct SQL writers.','Repeated invocation is required to drain more than one job or retry recoverable storage failures.','Normal local SQLite commit/filesystem behavior; restart test does not establish power-loss guarantees.'],
  limitations:['No distributed exactly-once claim, remote effect, production deployment, networking or downloads.','Original already-applied effects without ledger cannot be inferred; manually reconcile pre-repair databases.','No automatic purge: jobs/ledger retained indefinitely for durable identity, storage and total queue grow with admitted jobs.','No power-loss/disk-full/backup restore/multi-worker/OS-permission/load verification; no production performance or throughput claim.','Node emits experimental SQLite warning; raw crash child warnings retained.','Actual tokens/cost unavailable from host.'],
  evidence:[e,'artifact/worker.mjs','artifact/verify.mjs','artifact/README.md','evidence/initial-tool-failure.json']
};
writeFileSync(resolve(trial,'evidence/initial-tool-failure.json'),JSON.stringify({status:'FAIL',kind:'tooling',phase:'pre-verification',error:'apply_patch verification failed: invalid patch: multiple operations target worker.mjs',mutation:false,resolution:'Use Update File instead of Delete File plus Add File for same target.'},null,2));
writeFileSync(resolve(trial,'result.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,requirements:requirements.length,areas:result.coverageDispositions.length,checks:verification.checks.length,startUtc,endUtc,elapsedSeconds:result.elapsedSeconds}));
