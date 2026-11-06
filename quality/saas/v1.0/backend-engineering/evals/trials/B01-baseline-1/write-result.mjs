import { writeFileSync, readFileSync } from 'node:fs';
const trial='evals/trials/B01-baseline-1/';
const startUtc='2026-11-05T16:52:03.000Z';
const evidence='verification.log';
const coverage=[
 ['L01','PASS','Loopback HTTP socket','Actual HTTP uses ephemeral 127.0.0.1 listener; external DNS/network paths are outside the fixture.','artifact/verify.mjs; verification.log'],
 ['L02','NOT_APPLICABLE','TLS','The supplied fixture explicitly uses local cleartext HTTP and makes no HTTPS claim.','artifact/README.md'],
 ['L03','NOT_APPLICABLE','Ingress and proxies','No ingress, proxy, CDN or balancing component exists in this local service.','artifact/service.mjs'],
 ['L04','PASS','Registry identity and tenant-scoped SQL','Registry determines tenant and write permission; client tenant headers cannot change SQL scope.','verification.log: auth, reader denial, tenant boundary and spoofed tenant checks'],
 ['L05','PASS','GET and PATCH HTTP contract','Actual HTTP verifies method handling, public JSON responses and content types. Other API styles are outside scope.','verification.log'],
 ['L06','PASS','Conditional partial update','Absent properties preserve data; null clears note; successful writes increment version. No bulk/upsert requested.','verification.log: title/note/absence and version-only checks'],
 ['L07','PASS','Body parsing, schema and JSON errors','Raw bytes are capped at 2048; UTF-8 and JSON parsing are strict; fields are explicitly allowed.','verification.log: schema, malformed, media type, byte limit checks'],
 ['L08','PASS','Existing request lifecycle','Keeps fixture layout; PATCH checks identity/permission/media/body/schema before one SQL mutation.','artifact/service.mjs; implementation.diff'],
 ['L09','PASS','Node 24.12 runtime and request concurrency','Native synchronous SQLite with asynchronous bounded body collection; concurrent HTTP requests verified. No container work requested.','syntax-check.json; verification.log'],
 ['L10','PASS','Existing tickets composite key','Preserves schema and seed behavior; tenant/id composite key continues to identify rows. No migration needed.','artifact/service.mjs: openStore'],
 ['L11','PASS','Prepared SELECT and UPDATE RETURNING','Parameterized values and composite key predicates; no extra indexes needed for tiny fixture. Query-plan benchmarking not claimed.','artifact/service.mjs: createService'],
 ['L12','PASS','Atomic optimistic concurrency','Single UPDATE predicates on tenant/id/version and increments version in the same statement; HTTP race proves one success and one conflict.','verification.log: concurrent same-version edit one winner one conflict'],
 ['L13','NOT_APPLICABLE','Database administration','Embedded SQLite has no server users or grants; production database administration is outside fixture scope.','artifact/README.md'],
 ['L14','PASS','Local SQLite file storage','Actual file is closed and reopened with mutations preserved; no replication, partitioning or sharding requirement.','verification.log: file database persisted after service and SQLite close/reopen'],
 ['L15','NOT_APPLICABLE','Cache and derived stores','No cache or derived store exists; response projection comes directly from authoritative SQL rows.','artifact/service.mjs'],
 ['L16','NOT_APPLICABLE','Events and async effects','No events, queues, CDC or external side effects are part of this PATCH operation.','artifact/service.mjs'],
 ['L17','NOT_APPLICABLE','Workers and schedules','All requested behavior is synchronous HTTP request handling; no durable background work.','artifact/service.mjs'],
 ['L18','NOT_APPLICABLE','Specialized stores and objects','No file uploads, object storage or search behavior is requested; primary SQLite persistence is covered in L14.','artifact/README.md'],
 ['L19','NOT_APPLICABLE','External integrations','No external API, webhook or MCP integration is used; no downloads or external mutation performed.','artifact/service.mjs; artifact/verify.mjs'],
 ['L20','PASS','Bounded request memory and payload work','At most 2048 bytes are retained for parsing; oversized requests return JSON 413 with Connection close. No scaling/load claim.','verification.log: declared and chunked oversized body; exact limit'],
 ['L21','PASS','Orderly close/reopen persistence','Tests stop HTTP, close SQLite and reopen the same file. Crash recovery and backups are outside requested verification.','verification.log: reopen checks'],
 ['L22','PASS','Local verification evidence','Each check is logged with status; syntax and fixture hashes are retained. Production observability/audit infrastructure is outside scope.','verification.log; syntax-check.json; file-hashes.json'],
 ['L23','PASS','Reproducible built-in verification','Runnable Node-only service and verification are included; no build pipeline or deployment is needed or performed.','artifact/README.md; artifact/verify.mjs'],
 ['L24','PASS','Input boundaries and minimal projection','Unknown/privileged fields are rejected; queries are parameterized; projection excludes tenant and privilege fields; zero new dependencies. Fixture tokens are not production authentication.','verification.log; artifact/service.mjs']
];
const result={
 caseId:'B01',arm:'baseline',run:1,status:'PASS',
 route:{method:'PATCH',path:'/tickets/:id',preserves:'GET /tickets/:id',approach:'Independent fixture implementation; backend skill disabled'},
 coverageDispositions:coverage.map(([area,disposition,component,reason,evidence])=>({area,disposition,component,reason,evidence})),
 requirements:[
  {id:'B01-R01',status:'PASS',evidence:'verification.log: title trimming, note/null/absence, schema rejection, exact field limits, version-only update and public projection'},
  {id:'B01-R02',status:'PASS',evidence:'verification.log: 401, 403, tenant-only object 404, tenant spoofing ignored, tenant data unchanged after reopen'},
  {id:'B01-R03',status:'PASS',evidence:'verification.log: Promise.all same-version actual HTTP edits returned exactly [200,409] and stored winning version 7'},
  {id:'B01-R04',status:'PASS',evidence:'verification.log: malformed JSON/UTF-8/empty body 400, unsupported/missing media 415, declared/chunked 413; 2048-byte boundary accepted'},
  {id:'B01-R05',status:'PASS',evidence:'artifact/verify.mjs and verification.log: actual HTTP GET projection/reader/method compatibility and native file SQLite close/reopen'},
  {id:'B01-R06',status:'PASS',evidence:'result.json: all L01-L24 individually classified with bounded claims and requirement decisions'}
 ],
 decisions:[
  {requirement:'B01-R01',mechanism:'Allow only version/title/note; trim title, count code points, distinguish own-property absence from null; conditional UPDATE RETURNING public fields.',limit:'Title <=120 code points; note <=500 code points or null; positive safe integer version; body <=2048 raw bytes.',failure:'400 invalid_patch; 409 version_conflict; no mutation on validation/conflict.',verification:'47-check actual HTTP suite covers allowed updates, absence/null, invalid schema, exact boundaries and persisted winner.'},
  {requirement:'B01-R02',mechanism:'Use existing registry token identity, deny reader writes, bind SQL tenant/id to registry identity and path.',limit:'Fixture identity registry only; client tenant headers ignored; not production identity management.',failure:'401 unauthenticated; 403 forbidden; tenant-scoped absence 404 not_found.',verification:'HTTP authorization/tenant-spoof/cross-tenant-object cases plus tenant state checks before and after reopening.'},
  {requirement:'B01-R03',mechanism:'One SQLite UPDATE WHERE tenant=? AND id=? AND version=? increments version atomically, with RETURNING.',limit:'No transaction spans body reading; concurrency test is two simultaneous requests against one local service using native SQLite.',failure:'A losing existing row version gets JSON 409; absent scoped row gets 404.',verification:'Promise.all two HTTP PATCH requests; sorted status [200,409], final projection equals winner, version increment exactly once.'},
  {requirement:'B01-R04',mechanism:'Check application/json media type, early declared size and actual streamed raw bytes; strict UTF-8 then JSON parse; cap retained chunks and close oversized connection.',limit:'2048 bytes; Node HTTP framing/parser and default server request deadlines retained; no load/slow-client benchmark claimed.',failure:'400 invalid_json/invalid_patch; 413 body_too_large; 415 unsupported_media_type, all application JSON.',verification:'Malformed/empty/invalid UTF-8, unsupported/missing media, declared/chunked multibyte excess, exact 2048 bytes; no state mutation.'},
  {requirement:'B01-R05',mechanism:'Preserve GET public SELECT and seed/schema; built-in HTTP verification owns a temporary native SQLite file and orderly closes/reopens service/store.',limit:'Local process close/reopen durability verified; no power-failure or deployment claim.',failure:'Assertion failures terminate verification nonzero; raw stdout/stderr retained.',verification:'node artifact/verify.mjs exited 0 with 47 passed checks; syntax checks both exited 0.'},
  {requirement:'B01-R06',mechanism:'Classify each common index area, record direct evidence and scope limits, preserve only own trial changes.',limit:'Backend skill, routing references, rubrics, graders and other trials were not read; tokens/cost are not exposed.',failure:'Out-of-scope infrastructure areas are NOT_APPLICABLE rather than asserted verified.',verification:'24 unique coverage areas and six requirement decisions in this result; raw HTTP evidence accompanies artifact.'}
 ],
 checks:[
  {command:'node --check evals/trials/B01-baseline-1/artifact/service.mjs',exit:0,status:'PASS',evidence:'syntax-check.json: serviceSyntaxExit=0',kind:'syntax'},
  {command:'node --check evals/trials/B01-baseline-1/artifact/verify.mjs',exit:0,status:'PASS',evidence:'syntax-check.json: verifySyntaxExit=0',kind:'syntax'},
  {command:'node evals/trials/B01-baseline-1/artifact/verify.mjs',exit:0,status:'PASS',evidence:'verification.log: 47 PASS checks; actual loopback HTTP; native SQLite file close/reopen',kind:'integration'},
  {command:'node --version',exit:0,status:'PASS',evidence:'syntax-check.json: v24.12.0',kind:'runtime'},
  {command:'git diff --no-index -- evals/skill-fixtures/B01/service.mjs evals/trials/B01-baseline-1/artifact/service.mjs',exit:1,status:'PASS',evidence:'implementation.diff (exit 1 means expected differences)',kind:'change-review'}
 ],
 assumptions:[
  'Listed fixture paths resolve relative to evals/; root confirmed this equally for both arms.',
  'Lengths mean Unicode code points after trimming title; note whitespace is preserved.',
  'A version-only PATCH is allowed and increments version because absent title/note remain unchanged.',
  'Positive versions are constrained to JavaScript safe integers to avoid numeric precision loss.',
  'Application/json parameters are accepted; other media types are rejected. Auth and permission errors precede parsing.'
 ],
 limitations:[
  'Fixture tokens are an in-memory registry, not production authentication; local cleartext HTTP only.',
  'Orderly close/reopen is verified; crash recovery, backups, deployment, external networks and multi-process load are not tested.',
  'SQLite emits its Node 24.12 experimental-feature warning; process exit remains zero.',
  'Actual token usage and monetary cost are not exposed by the runtime.'
 ],
 startUtc,endUtc:null,elapsedSeconds:null,actualTokens:null,cost:null,
 rawEvidence:['verification.log','syntax-check.json','file-hashes.json','implementation.diff'],
 budget:{wallSeconds:360,externalToolCalls:20,limitReached:false}
};
if(result.coverageDispositions.length!==24||new Set(result.coverageDispositions.map(x=>x.area)).size!==24)throw Error('coverage cardinality');
result.endUtc=new Date().toISOString();result.elapsedSeconds=(Date.parse(result.endUtc)-Date.parse(startUtc))/1000;
writeFileSync(trial+'result.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({caseId:result.caseId,status:result.status,requirements:result.requirements.length,coverageAreas:result.coverageDispositions.length,startUtc:result.startUtc,endUtc:result.endUtc,elapsedSeconds:result.elapsedSeconds}));
