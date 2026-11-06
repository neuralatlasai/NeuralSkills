Run from this artifact directory with Node 24.12+; tested Node v24.12.0 on Windows x64. No packages, services or network are used.

```powershell
node cli.mjs setup source-v1.sqlite
node cli.mjs backup source-v1.sqlite backup-v1.sqlite
node cli.mjs backup source-v1.sqlite migration-copy.sqlite
node cli.mjs interrupt migration-copy.sqlite
# Expected exit 1: first two rows committed, schema still 1. Do not run setup again.
node cli.mjs migrate migration-copy.sqlite
node cli.mjs migrate migration-copy.sqlite
node cli.mjs restore backup-v1.sqlite recovered.sqlite deletions.json
node verify.mjs
```

Setup, backup and restore refuse existing destinations. Choose new filenames for another run. The verifier independently creates fresh timestamped databases under trial/evidence, records every child command/exit/stderr, and writes trial/evidence/verification.json. Intentional interruption, abrupt exit 23, invalid-ledger, overwrite and corrupt-backup failures are expected negative checks, retained in evidence.

Migration expands the schema with a nullable state column while retaining the composite tenant/id primary key and unchanged tenant/id/name projection. It commits at most two conditional row updates per transaction. afterBatch receives a committed batch; throwing or exiting there leaves resumable progress. user_version remains 1 until a transaction finds no pending rows, then becomes 2. Repeating migration performs no data changes. This is an expand/backfill migration; only the requested old SELECT reads are supported during expansion. Concurrent old writers, new-state workflows, contract/removal migration and production cutover are outside this local task.

Backup uses SQLite VACUUM INTO with a read-only source connection, creating a consistent v1 snapshot including committed WAL data. Restore only accepts a pristine v1 backup, creates a new private staging database, applies the supplied current deletion journal using both tenant and id, migrates it to v2, runs integrity/deletion checks and closes it before publishing the destination by rename. The returned connection and CLI target are usable only after reconciliation. Source and backup are never opened for writes during restore. The local trusted operator must own paths and prevent concurrent publishers; this is not an adversarial filesystem or authentication boundary. Keep staging paths inaccessible to application readers. There is no live application or traffic switch here.

Deletion keys are required, validated nonempty strings of at most 1024 UTF-8 bytes each, with at most 10000 entries. Duplicate/missing keys are harmless. The operator must supply the authoritative current journal; there is no external journal discovery or certification of completeness. Metadata reason/at is retained in the supplied journal. SQLite has no per-tenant GRANT/RLS; tenant integrity here means composite-key preservation and scoped deletion, not proof of application user authorization.

Limits: synchronous single-operator SQLite maintenance; busy timeout 1000 ms, no automatic retries. Each batch materializes at most two keys and updates at most two rows, but lock/disk duration is not bounded by the row count. For N rows and B data bytes, repeated pending scans can examine O(N^2) rows without a pending-row index; point updates use the existing composite key. Backup/restore storage and I/O scale with B, validation reads N records, and the verifier materializes O(N+B) reference data. No large-dataset, disk-full, power-loss, concurrent-writer or production throughput claim is made. The trusted local JSON CLI reads its file into memory before validation.

Three measured isolated recoveries include snapshot creation, deletion, migration, publication, reopening, full data/schema/deletion/integrity validation and source/backup SHA256 comparisons. Raw milliseconds and median/range are in verification.json. These four-row local warm/uncontrolled-cache samples are measurements, not an RPO/RTO promise. Snapshot RPO depends on backup age and all later writes; only the supplied deletion journal is replayed. Production recovery also requires independent keys/permissions, retained journals, storage capacity and traffic reintroduction validation. Rollback of a live deployment is not claimed; tested recovery is to different isolated files.
