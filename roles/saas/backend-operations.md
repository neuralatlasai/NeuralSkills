# Compatibility and recovery

Use for L21–L24 with state/authority, topology, SLO/RPO/RTO, threats, artifacts/configuration and actual tools. Use the affected [API](backend-api.md), [data](backend-data.md), [integration](backend-async.md) and [runtime](backend-runtime.md) contracts. Output working controls, executable rollout/recovery decisions and observed results.

| Requirement | Mechanism | Limit | Failure | Probe |
| --- | --- | --- | --- | --- |
| L21 Containment | Classified errors, deadline/retry/jitter/isolation; breaker/degradation only for a named need/recovery owner | Attempts/total time, concurrency/queue/buffers/staleness | Slow peer consumes ordinary traffic, retry storm, stuck breaker | Slow/down/flapping/process loss; useful throughput/rejection/recovery |
| L21 Recovery | State-class RPO/RTO, engine backup/log/PITR/rebuild, keys/config/roles and deletion/policy ledgers; isolate/validate/rebuild/warm/traffic | Retention/log continuity, bytes/bandwidth/replay/rebuild/validation/decision | Corrupt/missing backup/log/key, stale authority/deletion resurrection | Restore through integrity/data/permission/delete checks and usable service; existence/restart insufficient |
| L22 Telemetry/audit | Redacted structured logs, bounded-label metrics/traces/profiles; correlate logical operation and attempts/transactions/events/jobs/tools. Select applicable client-visible latency, useful throughput/outcomes, queue/pool/lock waits, retry amplification, saturation, replication lag/freshness and recovery progress with units/populations | Export queue count/bytes/age, sampling/retry/loss/retention/access | Export outage consumes memory, cardinality/secret leak, missing propagation or misleading signals | Compare emitted signals with controlled workload/outcomes; sink/full queue and hostile labels/sensitive values; visible loss, bounded app resources |
| L23 Build/config | Lock/inventory dependencies, reproducible artifact/config validation, applicable scan/provenance and expected signer/build identity | Versions/permissions/egress/blast radius | Drift, compromised artifact/unsafe script or missing config/secret | Build/identity/config failure, available scan/signature checks; absent checks unverified |
| L23 Rollout/lifecycle | Read-write compatibility, bounded backfill/canary/traffic, rollback/forward repair; startup/readiness/liveness distinct | Surge/terminating resources, lock/backfill/drain/job handoff/stream/termination | Bad canary, overload restarts, accepted work loss, stale endpoints/sessions | Interrupted rollout/unhealthy canary, active termination, cert/secret uptake and repair |
| L24 Security/privacy | Selected ASVS/version tied to injection/deserialization/SSRF/path/upload/framing/mass assignment/authorization/exhaustion, secrets/encryption/egress/audit/retention/deletion controls | Input/work/destination/authority/lifecycle | Denial bypass through jobs/cache/DB/export/search/tools, retired credentials or deleted state restored | Denials across applicable paths, rotation, destination/artifact rejection, delete/revoke reconciliation |

## Compatibility is a matrix, not successful DDL

Use actual binary/schema read/write pairs:

| Phase | Mechanism / limit | Failure | Acceptance probe |
| --- | --- | --- | --- |
| Expand | Retain one authoritative value while old writers exist | New-app dual writes do not repair old-app single writes; new column becomes stale after backfill | Old/new readers/writers; declare winner and drift detection |
| Backfill | Bounded restartable batches, source-version guard, durable progress and final reconciliation | Checkpoint skips rows or stale batch overwrites concurrent change | Interrupt boundaries and mutate source; compare required counts/invariants/transformed values |
| Switch | Remove incompatible writers, reconcile/validate before new reads | Old binary cannot interpret new writes after rollback | Execute old binary against post-migration schema/new data; otherwise forward repair |
| Contract | Wait for consumer/rollback/retention obligations | Surviving job/export/reader needs removed fields | Inventory consumers, interrupt rollout and rehearse repair |

Restore a snapshot preceding delete/revoke; reconcile current ledgers before traffic, then test protected paths. Old snapshot permissions can regrant revoked access; missing ledgers limit recovery claims. Include transfer/log replay/index rebuild/key-permission restoration/cache warming/validation/decision/traffic time; local restore latency is not production RTO.

Test new and reused connections during endpoint/cert/credential replacement, plus discovery caches and drain ordering. Name who retires old authority and measure replacement-to-use. A changed DNS record/new-handshake fingerprint alone does not prove existing traffic or retired credentials were handled.

Contain failures, preserve evidence and invoke the declared repair/reconciliation owner; do not relax canary/recovery acceptance. Sources and platform evidence limits: [register](source-register.md), [verification](verification.md).
