# Regional API decision

Reject the current proposal as an acceptance candidate. Workers KV cannot be the sole authority for immediate revocation or atomic inventory, and Cloud Run maximum instances cannot provide a hard database connection boundary. The replacement below is a proposed design; no resources were deployed, accounts accessed, or recovery measurements made.

## Evidence and consequences

Google documents that the configured Cloud Run maximum can briefly be exceeded. Configure a service-level maximum for normal operation, but enforce DB admission independently of scaling and account for every process during rollout and shutdown. [Google Cloud Run maximum instances](https://docs.cloud.google.com/run/docs/configuring/max-instances)

Cloudflare documents eventual consistency, changes taking 60 seconds or more to propagate, cached negative lookups, and the lack of suitability for atomic read/write transactions. Reducing cache TTL or routing only writes through a coordinator does not make subsequent KV reads current. KV may cache harmless display data only; it must never provide a positive authorization decision or inventory mutation precondition. [Cloudflare KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/)

Durable Objects offer a named coordination point with strongly consistent transactional storage scoped to one object. They are a possible alternative for a self-contained inventory aggregate, but the cited overview does not establish cross-object atomicity or an atomic commit with an external database. This plan instead keeps related authorization and inventory changes in one transactional database authority, avoiding dual masters. [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/)

## Capacity and hard admission

Retain six serving processes, two rollout/cold-start processes, one terminating process, four worker connections, two maintenance connections and allocation 40. Select poolPerProcess = 3:

`totalConnections = (6 + 2 + 1) * 3 + 4 + 2 = 33 <= 40`.

This leaves seven unused connections. Pool 4 requires 42 and is invalid. A process means each actual application process, including multiple processes within one container if present. Shutdown must stop admission and close sessions; a configured instance count does not establish that sessions have ended.

The selected hard boundary is a single-active, database-facing gateway that physically owns all workload DB sessions, with fixed global server-session budgets of 27 API, four worker and two maintenance sessions. All direct paths are denied by network and credential policy. Extra clients queue with bounded deadlines or receive a retryable failure; they cannot open extra server connections. The gateway may have a standby only with fencing that prevents both session owners being active. Merely expiring a distributed permit is insufficient: old DB sessions must be demonstrably closed or fenced before replacement connections open. Replication, backup and provider administrative sessions must be inventoried separately and confirmed compatible with what the stated 40 allocation counts; they cannot silently consume this workload budget or reduce the required inputs.

`admission.hardBoundary: true` identifies the required selected architecture, not a deployed or tested control. Product selection and exact enforceability remain acceptance gates. A pooler setting replicated independently across several poolers is not a global cap.

## Authority and immediate revocation

Use one strongly consistent transactional database primary as the authorization and inventory authority. The authority service owns writes, including worker and maintenance commands. Edge checks can reject early, but the origin performs authoritative checks even when accessed directly. Authenticate the Cloudflare-to-origin hop, prevent untrusted identity-header injection, and restrict origin invocation. Use primary reads for security decisions; cached JWT claims and stale replicas cannot authorize access.

Define the revocation linearization point as a committed revocation whose successful acknowledgement is sent only after older protected work has completed or been cancelled. Serialize protected authorization, inventory commit and revocation on the same principal/grant record. Hold the relevant protection through the operation's security-sensitive commit or read-response authorization; close/reauthorize streams and prevent queued jobs from executing on stale grants. Once revoke is acknowledged, no operation may newly authorize or commit under that grant. Bytes already delivered cannot be recalled. During an authority outage, protected operations fail closed. This definition preserves immediate revocation while making races testable; silently accepting a fixed stale-token interval would weaken it.

For inventory, check grant/epoch and stock, update every affected row, and save the unique request idempotency result in one serializable transaction. Guard stock against negative values, lock in a stable order, and retry serialization failures with bounds. Replay after a lost acknowledgement returns the recorded result. Cross-shard changes require another explicitly designed atomic transaction protocol; do not split this initial authority across shards or independently writable stores.

## Recovery and acceptance

RTO 900 seconds and RPO 60 seconds are targets. Both measured values remain null. Propose recoverable encrypted backups plus continuous logs or a suitable cross-failure-domain replica, with monitored durable lag and restore drills. Neither backups nor documentation prove these objectives.

Before serving from a recovered state: fence the old primary and connection gateway; establish the trusted latest acknowledged commit watermark; check candidate timeline, contiguous replay and lag; restore/replay; validate stock and idempotency invariants; obtain current credentials from the live secret authority; reconcile the latest acknowledged revocations; promote exactly one writer; then change traffic and verify authenticated behavior. Split brain or unknown lag blocks serving. If the candidate cannot meet the 60-second loss bound, record the breach instead of inventing a passing RPO.

General inventory RPO does not permit resurrecting revoked access. A proposed independently fault-isolated, synchronously durable security journal must receive revocations before successful acknowledgement; restoration reconciles its latest acknowledged security state. If that state cannot be established, deny protected serving and grants until reconciliation succeeds. Journal write failures must prevent successful revoke acknowledgement, and partial journal/database outcomes must resolve conservatively toward denial. This mechanism and its failure domains are unimplemented and require design validation and drills; it may extend RTO, which must be measured honestly.

Use canaries with timestamps and sequence numbers to measure data loss from the latest acknowledged commit to the latest contiguous recovered commit. Measure recovery from disruption to validated authenticated service, including detection, fencing, credential retrieval, replay, safety checks and traffic switch. Rotate credentials after taking the test backup; recovery must use the current approved versions, reject retired DB/origin/signing credentials, and enforce the latest user revocations. Capture credential version identifiers, never secret values.

Acceptance requires the planned checks in decision.json: connection saturation and failover with DB-side counts; multi-location revocation races and partitions; final-unit inventory contention; partial transaction and lost-acknowledgement retries; direct-origin/bypass attempts; stale KV injection; and recovery with lag, missing logs, rotated credentials, old-primary return and unavailable security evidence. Capacity arithmetic can pass now; deployment and recovery acceptance cannot.

## Execution record and unverified scope

Four underlying tool calls are used for this bounded task: (1) PowerShell reads the raw task, (2) one web call opens the three supplied primary-source pages, (3) PowerShell writes these two artifacts, and (4) PowerShell parses the JSON, checks its shape and arithmetic, and confirms both files exist. Tool orchestration wrappers are not counted as underlying calls. Exact shell commands are: `Get-Content -LiteralPath 'quality/saas/devops-1.3/cases/D02/task.md' -Raw`; `New-Item -ItemType Directory -Path 'quality/saas/devops-1.3/trials/D02-base' -Force` followed by literal here-string `Set-Content` writes to `decision.json` and `report.md`; and a local `ConvertFrom-Json` / property / arithmetic / `Test-Path` validation shown in the validation tool record. The web call opens only the three documentation URLs cited above. No cloud CLI, API account call, dependency installation, deployment, or recovery command ran.

End-to-end elapsed time was not instrumented and is not claimed. The JSON validation result is reported separately after execution; the preceding acceptance mechanisms remain plans even if local validation succeeds. No execution failure has been observed in the read, browse or write stages. If local validation fails, that failure must remain visible and be repaired without mislabeling infrastructure checks as passed.

Unverified scope: DB engine/product and transaction semantics, gateway implementation and fencing, all access/network policies and identities, process topology, database allocation accounting, actual traffic and latency, security-journal protocol, secret authority and rotation procedures, provider/region availability, retention and recoverability, replication/archive lag, restoration cost and duration, and every runtime failure scenario. This report establishes a feasible architecture and acceptance plan, not operational certification.
