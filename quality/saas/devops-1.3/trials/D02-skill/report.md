# D02 decision: revise proposal; live acceptance remains unverified

The proposed sole-KV authority cannot preserve immediate access revocation or atomic inventory changes. Cloud Run maximum instances also cannot serve as the hard database admission boundary. The attached decision selects a pool of 3, a transactional primary authority and independent aggregate database admission. This is a feasible design proposal subject to implementation and the gates below; nothing was deployed or measured in a cloud account.

## Evidence and constraints

The raw task supplies six serving processes, two rollout/cold-start allowance processes, one terminating process, four worker connections, two maintenance connections and a fixed allocation of 40. All counts are preserved. Only the assigned output folder was written. No account calls, deployment, dependency installation, repository execution or other case/control/report inspection occurred.

Google documents that the Cloud Run maximum can briefly be exceeded. Therefore it is a scaling target, while a separately enforced database admission limit protects the allocation. [Google Cloud Run maximum instances](https://docs.cloud.google.com/run/docs/configuring/max-instances).

Cloudflare documents eventual consistency, cached missing keys, and update visibility delays of 60 seconds or more. KV does not supply the transaction semantics required here. A shorter TTL, edge purge or serialized KV writer does not establish a synchronous authorization barrier for KV readers. [Cloudflare KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/).

Durable Objects offer strongly consistent transactional storage belonging to each object. They are a plausible per-object coordination alternative, but multiple objects and the database would need additional transaction/ownership mechanisms. The selected plan keeps authorization and inventory together in one relational authority instead of introducing a cross-authority commit protocol. [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/).

## Capacity and admission

`totalConnections = (6 + 2 + 1) * 3 + 4 + 2 = 33 <= 40`, leaving seven connections of arithmetic headroom. Pool 4 would produce 42 and is rejected. This is a bound for the supplied process envelope, not measured utilization or proof of runtime capacity. Throughput and acceptable acquisition latency are unknown.

Propose a database-native or non-bypassable shared broker aggregate ceiling of 34 API/worker server sessions plus 6 reserved maintenance sessions: maximum 40. Normal modeled use remains 27 API + 4 workers + 2 maintenance = 33. The reservations preserve access during overload and do not lower the supplied process or connection counts. All broker replicas share the same aggregate bound; a per-replica setting is insufficient. Prevent application and worker roles from bypassing admission. Select the actual engine/version before choosing enforcement syntax; privileged roles, maintenance and every connection-consuming component must fit the allocation. Bound queue length and wait time; overload must reject rather than create extra connections. Cloud Run concurrency and scaling remain useful operational controls.

## Authoritative state and revocation

Use a regional transactional relational primary for inventory and session/principal revocation, with PostgreSQL only a candidate pending engine discovery. Every writer, including workers/imports/admin tools, uses this authority. KV is optional non-authoritative cache material. Neither cached allow decisions nor token signature validity alone grant current access.

Each protected operation checks current authorization while holding a transaction lock that conflicts with revocation. Revocation updates state/version under that lock and acknowledges only after prior protected actions have completed or been canceled. After that acknowledged commit, subsequent authorization decisions/effects must be denied. This preserves a synchronous barrier rather than tolerating a cache window. Fail closed during partition. Define and implement the same barrier for queued jobs, streams and long-lived connections before acceptance; already delivered information cannot be recalled. This unresolved application contract is not grounds to relax immediate revocation.

Inventory uses a positive-quantity, trusted-tenant guarded decrement plus reservation and unique operation identity in one transaction. A two-buyer stock-5/order-4 race must yield one success and stock 1. Multi-item changes need deterministic locking and tested isolation. Failures between statements roll back; lost acknowledgements reconcile/replay the original identity. An outbox and idempotent consumers are required if external effects are added. No SQL engine test was performed.

## Recovery and acceptance

RTO 900 seconds and RPO 60 seconds are targets. Both measured values are `null`. A warm standby is proposed, with independently available pinned images/configuration, backup/log access, current service/database credentials and encryption keys. No provider SLA, topology or replication lag has been established.

Before promotion, prove the latest credentials and keys work in the recovery path and retired credentials are rejected, inspect durable replication position and time lag, establish recoverable state, and enforce old-primary/writer fencing including existing connections. Acquire a new exclusive write epoch before enabling writes; routing changes alone cannot prevent split brain. If fencing or state eligibility is uncertain, keep writes closed and record an RTO failure. Lost inventory commits within the proposed RPO still require reconciliation; missing acknowledged revocations must never be restored as permissions. Either preserve all such revocations durably or invalidate old sessions with an independently durable epoch/barrier and fail closed until reauthorization. RPO tolerance cannot weaken access revocation.

Required pre-acceptance gates are specified with requirement, mechanism, limit, failure and verification in `decision.json`: real-engine concurrent inventory/crash/replay tests; multi-location immediate-revocation and in-flight-action races; direct-origin/identity denial; actual DB cap under rollout, overshoot, broker restart and failover; credential rotation and latest-version recovery; backup restore, lag validation, fencing, safe promotion and deliberate failback. Measure recovery from failure onset to validated useful operations and lost acknowledged commits, not just process startup or routing convergence. No operational gate is marked PASS on the strength of this plan.

Unknowns include exact application in-flight semantics, DB engine/version and isolation/admission capabilities, region/residency, recovery topology and backup/log durability, synchronous revocation durability across regional loss, identity issuance and Cloud Run origin protection, quotas, pool implementation, other session consumers, useful workload throughput, latency and operational ownership. These block production acceptance, not preparation of this decision.

## Actual execution record

Six underlying tool calls were used: four PowerShell command executions, one primary-source browser call, and one patch call. Calls 1, 2 and 4 read only the task and relevant skill procedures. Call 3 opened the three primary-source URLs above. Call 5 created `decision.json` and `report.md`. Call 6 parsed the JSON and verified schema fields, capacity arithmetic, unchanged counts, recovery targets/null measurements and check statuses; its recorded result follows. No initial execution failures occurred; the proposal defects and rejected pool-4 arithmetic are findings, not failed cloud tests.

Commands executed from `NeuralSkills`:

1. `Get-Content roles/saas/SKILL.md; Get-Content quality/saas/devops-1.3/cases/D02/task.md`
2. `Get-Content roles/saas/devops.md; Get-Content roles/saas/verification.md; Get-Content roles/saas/standards.md`
3. Browser `open` for the three linked primary sources in one call.
4. `Get-Content roles/saas/devops-platforms.md; Get-Content roles/saas/backend-data.md; Get-Content roles/saas/backend-runtime.md`
5. `apply_patch`: create the two assigned output files.
6. PowerShell `Get-Content .../decision.json -Raw | ConvertFrom-Json`; assertions for required fields/counts/arithmetic/targets/statuses; append local validation result with a `Stopwatch` duration to this report.

End-to-end elapsed time was not measured. Local validation duration is measured separately below. Deployed configuration, API behavior, DB admission, revocation, inventory execution, credential rotation, lag, restore and recovery timing all remain UNVERIFIED.

Local artifact validation: PASS. Parsed decision.json and checked five required top-level fields, six complete checks, preserved counts, total 33 <= 40, pool-4 counterexample 42, false KV authority, targets 900/60, null measured recovery values, and one arithmetic PASS/five operational UNVERIFIED statuses. Validation elapsed: 0.546 seconds. This is local artifact validation only. Actual underlying tool-call count: 6.
