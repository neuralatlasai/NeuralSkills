Run with Node 24.12+ and built-ins only:

    node artifact/verify.mjs fresh-run-id
    node artifact/faults.mjs
    node artifact/service.mjs

Execute from the trial directory. Verification creates a fresh file-backed SQLite database per invocation and binds only 127.0.0.1 on an ephemeral port. The standalone service accepts DB_FILE and PORT as in the original fixture. Original fixture and input copies are in artifact/original.

PATCH /tickets/:id requires the existing registry editor identity and application/json. The only body keys are version (positive safe integer), title (nonempty after trim, at most 120 UTF-16 code units after trim), and note (null or string of at most 500 UTF-16 code units). Missing fields remain unchanged. A version-only PATCH increments the version. All successful updates return exactly id/title/note/version; null clears only note. JSON syntax and schema errors are 400, missing identity 401, reader mutation 403, tenant-local absence 404, stale version 409, body above 2048 encoded bytes 413, unsupported media/encoding 415.

Tenant always comes from the fixture registry; request tenant headers are ignored. Registry bearer values are fixture credentials, not production authentication. SQLite file owners can bypass application policy. GET behavior and original schema/seed data are preserved. Conditional UPDATE with tenant/id/version and RETURNING changes one row atomically; a failed compare checks tenant-local existence. There is no automatic retry. Response loss after commit leaves an unknown client outcome; GET reconciles it before a retry.

Measured environment: Node v24.12.0, native SQLite 3.50.4, Windows x64; experimental SQLite warning is preserved. SQLite journal_mode=delete, synchronous=2 and busy_timeout=1000ms. Three final correctness repetitions use three records (two tenants sharing t1 plus south-only). This is no performance benchmark or production capacity assertion.

Limits: body accumulation is capped at 2048 bytes before JSON parsing; Node/socket buffers and a received chunk can be larger. Per-body total timer is 5000ms, request/header timeouts 6000ms, keep-alive timeout 1000ms, maxHeadersCount 64; responses close connections. Invalid/oversized bodies pause consumption and destroy the request after sending the JSON error. Work is O(B) to decode/parse bounded B<=2048; a successful request executes one indexed conditional UPDATE, while conflict/absence adds one indexed SELECT. Index lookup depends on N rows and storage I/O; this is not an O(1) endpoint. Memory includes Node native buffers, per-request bounded chunks, parsed JSON and response serialization; concurrent socket count and process RSS are not globally admission-controlled or measured.

Local cleartext HTTP is the only transport tested. No TLS/proxy/DNS/deployment, full-disk/power-loss/crash recovery, backups, global overload, multi-process SQLite contention, external integrations or production identity rotation was tested. Close/reopen demonstrates local persistence, not power-loss durability. Errors return safe bounded codes; production logging/metrics are outside this fixture. No files outside this trial were changed.
