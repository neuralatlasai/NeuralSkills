# Storage mechanisms and access paths - B4

Activate L10-L14. Inputs: actual engine/version, all writers, schema/roles, queries/plans, cardinality/skew and invariants. B3 owns operations; B5/B7 own external/restore boundaries. Output executable schema/adapter changes and real-engine probes.

| Requirement | Mechanism | Limit | Failure | Verification |
| --- | --- | --- | --- | --- |
| L10 Model/DDL | Tenant keys/uniqueness; types/precision/collation/time/null/defaults; supported PK/FK/check/exclusion; normalization/denormalization from access/invariant needs | Domain/key/index widths, migration/backfill/locks; engine-specific null/cross-row semantics | Imports/workers bypass rules, duplicate/cross-tenant relationships, null surprises/divergence | Invalid values through every writer, concurrent key/FK conflicts, defaults/nulls and evolution |
| L11 DML/DQL/ORM | Parameterized values, controlled identifiers, tenant scope/projection; generated SQL/query counts; bounded materialization/N+1/eager loading; access-pattern indexes | Rows/bytes/query count/offset/sort/temp I/O, statement/lock time, write/storage amplification | Injection, unbounded mutation, low-selectivity scan, plan regression | Scoped/injection cases, representative skew/cache/maintenance; observed plans/counts/I/O/locks/memory, missing metrics unverified |
| L12 TCL/isolation | One begin/commit/rollback/savepoint owner; invariant mapped to constraint/CAS/lock/serializable/ownership/reconciliation | Isolation/lock order/duration, whole-transaction retry/total deadline; local participants only | Lost update, skew/phantom, deadlock/abort, partial effect, commit uncertainty | Independent-connection schedules, before/after-commit loss, safe retry and durable postconditions |
| L13 DCL/admin | Separate app/migration/backup/report/admin privileges; TLS/credential rotation, row/column policy where supported | Pool acquisition/session reset/prepared-mode compatibility; statement/lock/idle-transaction cleanup, surge | Tenant-session leak, privileged RLS bypass, retired credential, exhausted pool/leaked transaction | Actual roles/revokes/pool reuse, rotation/exhaustion/cleanup/failover; disclose SQLite file authority/no SQL GRANT/RLS |
| L14 Storage | Pages/log/flush/checkpoint, vacuum/compaction/tombstones/free space/background I/O | Disk/WAL headroom, maintenance bandwidth, durability ack/replay | Full disk, maintenance debt, hot keys, unsupported flush guarantee | Pressure/maintenance under load, file/log growth and recovery; restart is not power-loss proof |
| L14 Distribution if justified | Partitioning differs from servers; key/locality/skew, routing/ownership, replicas/domains, ack/lag/stale-primary exclusion, cross-shard query/index/uniqueness/transaction | Large/hot tenants, fan-out/lag, rebalancing/fencing/cutover/recovery | Stale routes, split ownership, lagged decisions, failed shard move | Hot/large/lagging cases, ownership transfer during writes and forward/rollback recovery; no single-node inference |
| L14 Hash roles | Distinguish lookup/routing/integrity/keyed authentication/password derivation/operation identity | Payload/key CPU/memory, collision/adversary and migration policy | Fast password hash, digest mistaken for authority, changed routing, reused key/different params | Purpose-specific tamper/key/parameter/migration probes; include hashing/serialization costs |

## Select against a counterexample

A unique constraint closes check-then-insert races. A guarded single-row update plus related inserts in one transaction can preserve quantity/version. A multi-row or absent predicate may need a supported constraint, shared coordination row/lock or engine-specific serializable execution; row locks do not protect arbitrary absence. Retry the complete aborted transaction only when all work can safely repeat. External effects need B5.

Reservation schedule: A/B both observe stock5/version1 and request4. Atomic tenant/version/stock predicate selects one winner; the other gets the declared conflict. Inject failure after decrement before allocation: both roll back. Lost commit acknowledgement becomes unknown; reconcile the same logical identity, not another reservation. Verify stock/version/allocation after reopen as well as statuses.

After validating positive quantity and trusted identity, a suitable relational adapter can use:

~~~sql
UPDATE inventory SET available=available-:q, version=version+1
WHERE tenant_id=:trusted_tenant AND item_id=:item
  AND version=:expected_version AND available>=:q
RETURNING available, version;
~~~

Interpret zero rows under the authorization/conflict contract; do not disclose unauthorized existence. This illustrative SQL needs the selected engine's types and transaction tests.

## Diagnose the access path

Derive predicate, projection and total order before index choice. Example: tenant/status, descending(created_at,id), scoped cursor predicate, LIMIT K. Tuple comparison requires actual engine/null/collation/type support; first page has a separate no-cursor predicate. Composite/partial/covering indexes are hypotheses.

Record N, tenant skew, match fraction, K, ties, selected bytes, query count, statistics age, plan and >=3 comparable runs. Compare estimated/actual rows and loops where exposed; distinguish scan/filter/sort-spill/lock/materialization. PostgreSQL plan rows are output estimates, not total examined; cost is not milliseconds. EXPLAIN ANALYZE executes work: use authorized safe/isolated data and consider effects rollback cannot undo. Measure decoding/network/serialization separately.

Check exact results, ties and authority against an oracle; test important writes/index maintenance before promoting an optimization. Retain cases where an index is unused/slower. In architecture changes, modular boundaries preserve local transactions cheaply; extract a service only for demonstrated release/privilege/resource/failure needs, with explicit data ownership and coordination cost.

Checked2026-11-06: [PostgreSQL18 EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html), selected estimates/actual-execution caveats; [isolation](https://www.postgresql.org/docs/18/transaction-iso.html). Original conditional guidance, not an executed PostgreSQL adapter. Other sources: [register](sources.md).
