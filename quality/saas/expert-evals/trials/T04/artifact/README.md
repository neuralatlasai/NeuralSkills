# Reservation consistency fixture

Node 24 native TypeScript and file-backed `node:sqlite`; no install.

Run the focused integration suite from this directory:

```powershell
node --disable-warning=ExperimentalWarning tests.mjs
```

Import `init`, `reserve`, and `readState` from `service.ts`. `init(path, stock=5)` requires a new disposable database and creates widget inventory for red and blue. Schema migration from the original database is not implemented because the fixture explicitly permits disposable schema changes.

`reserve` validates a positive safe integer quantity before opening SQLite. Each call uses a separate connection and a short synchronous `BEGIN IMMEDIATE` transaction. Replay identity is `(tenant, reserve, key)` with exact sku/qty binding. Both reserved and sold_out outcomes are durable. A mismatched replay returns conflict. Successful stock change, receipt and local event commit together. Receipt retention lasts as long as the database; do not prune receipts while keys can still be retried.

The SQLite busy handler waits up to a configured 250 ms per lock wait, with zero application retries. This is not a strict end-to-end 250 ms deadline: opening, statements, OS scheduling and closing add time. Contention beyond the busy policy throws; a caller may retry the same logical key with bounded caller policy. No process mutex, distributed lock, background queue, or remote delivery claim is involved. The synchronous API blocks its calling thread during SQLite work. There is no claim of support for unlimited simultaneous requests.

`failBeforeCommit` throws after all writes and before COMMIT, rolling them back. `failAfterCommit` throws after SQLite's local COMMIT returns but before returning to the caller. Replay then reads the stored outcome. This only simulates a lost caller acknowledgement of a local transaction; it does not simulate a power failure, uncertain disk flush, external messaging or payments. Existing-receipt replay returns the result without generating a new effect or re-running the fault hook.

The tenant string is fixture context, not authenticated identity. The caller supplies trusted tenant identity in a real integration. SQLite file access is the security boundary; there is no network or authentication system here.

See `handoff.md`, `baseline.log` and `verification.log`. `service.original.ts` preserves the supplied broken fixture. Tests retain their synthetic databases for inspection.
