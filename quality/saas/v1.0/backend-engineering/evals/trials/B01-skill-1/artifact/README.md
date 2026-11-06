Node 24.12+ native node:sqlite; built-ins only. Copy to trial/artifact. Run `node service.mjs`; stdout reports a loopback HTTP port. DB_FILE and PORT are optional. Import openStore/createService for isolated tests; use a file database for restart checks. This local cleartext HTTP task does not establish HTTPS support.

Existing identities: Bearer north-reader, north-editor and south-editor. The registry is fixture input, not production authentication. The same t1 identifier exists in two tenants.

PATCH contract added in this trial: application/json (optional media parameters), version as a positive safe integer, optional title and note only. Title is trimmed and limited to 120 UTF-16 code units after trimming; note is untrimmed and limited to 500 code units or null. An update containing only version is valid and increments the version. Unknown fields are rejected. Success returns only id/title/note/version. No automatic retry: stale versions return 409; clients can GET and reconcile after a lost response.

PATCH body storage is capped at 2048 encoded bytes before UTF-8 decoding and JSON parsing. Invalid UTF-8 is rejected; a body must finish within five seconds. Compressed encodings are unsupported. Authentication/permission denial precedes body parsing. Fixed parameterized SQL includes the trusted registry tenant and expected version in one UPDATE ... RETURNING statement. This is a single-row atomic SQLite write, not a multi-row transaction design.

Reproduce from this artifact directory with Node 24.12+:
  node --check service.mjs
  node --check verify.mjs
  node verify.mjs

Verification uses actual loopback HTTP and a real file-backed native SQLite database, writes ../evidence.json and ../verification.sqlite, and closes both server and database. The verification database is recreated each run. The service remains runnable with node service.mjs and the original DB_FILE/PORT options.

Operating scope: isolated single-process local HTTP fixture, fixture registry tokens, one synchronous SQLite connection, three test rows, no external services, downloads or deployment. For N rows and B <= 2048 bytes, parsing/buffering is O(B) per active request (with concatenation/decoding copies), and the tenant/id primary-key lookup/update uses an indexed path; measured plan is recorded, with no performance guarantee. At C concurrent partially received requests, retained body memory is O(C*2048) plus runtime/socket overhead. No process-wide admission limit, throughput benchmark, production authentication, TLS, crash/power-loss durability, disk-pressure, backup/restore, cross-process contention or deployment guarantee is established. Reopen verifies orderly close/reopen persistence only. SQLite file-owner access is outside application tenant authorization. Native node:sqlite emits its experimental-feature warning on Node 24.12.0.
