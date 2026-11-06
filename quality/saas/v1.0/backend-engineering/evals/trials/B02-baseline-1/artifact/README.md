Node 24.12+ built-ins. Copy to trial/artifact; run `node probe.mjs race.sqlite` with a fresh filename. The probe releases two asynchronous callers after both reads and prints actual state. Preserve the hooks; afterWrite throws in a separate fault test and performs no external effect. SQLite must remain real, including file-backed reopen checks.

Repair and verification
-----------------------
Run `node verify.mjs ../evidence` from this directory. It creates a unique local
directory of real SQLite files and writes ../evidence/verification.json with
asserted states, both read-barrier events, rollback, retry, and reopen evidence.
The original probe is preserved and was also run against a fresh database.

reserve retains its async signature and response objects. It validates the
initial row as before, awaits afterRead, then executes BEGIN IMMEDIATE, a
tenant/item/version/quantity guarded decrement with RETURNING, allocation
insertion, and COMMIT synchronously. A throw rolls back. No mutex is involved.
The transaction rechecks current stock instead of trusting the pre-hook read.
Quantity must be a positive safe integer; a missing row is 404, invalid quantity
400, stale or invalid version/insufficient stock 409, and success 201 with
available/version. The original missing-row-before-quantity precedence remains.

Operating limits
----------------
SQLite permits one writer per database. The inherited 200ms busy timeout blocks
the Node event loop during contention; SQLITE_BUSY/SQLITE_LOCKED return 409 so a
caller can retry after rereading state. No automatic retry, fairness, throughput,
multi-host, replication, or exactly-once guarantee is claimed. The verification
uses two connections in one process, an explicit writer lock, and file reopen;
it does not simulate machine crashes, disk failures or network filesystems.
The fixture's default journal/durability settings and schema are preserved.

afterRead is asynchronous and runs before the transaction. afterWrite remains
synchronous, runs after the decrement and before insertion, and must not do
external effects or manage the transaction. Caller-owned transactions on this
connection and asynchronous afterWrite hooks are unsupported, as in the fixture.
Pass a connection owned by this operation during its synchronous transaction.
The tenant argument is trusted caller context; this fixture supplies no identity
provider or authorization policy. Bound SQL parameters scope both stock writes
and allocations; the composite stock primary key supplies lookup access.
Invariants cover this API, not arbitrary direct SQL writers. There is no added
HTTP server, authentication service, queue, cache, deployment, or dependency.
