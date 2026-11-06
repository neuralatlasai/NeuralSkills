# F02: Staging API and compute operation

Revision 1, 2026-11-06. Owner: Platform team. Reviewer: UNASSIGNED. Status: proposal; no approval recorded. Audience: platform operators and API/integration maintainers. Baseline: supplied F02 scenario in [cases.json](../../cases.json); no implementation/build/configuration baseline exists. All environment facts below are supplied fixtures, not observations.

## Requirements and authority

| ID | Supplied requirement | Acceptance / evidence |
|---|---|---|
| R01 | Accept durable jobs and return identity | Acknowledgement follows durable commit; acceptance never means solver completion; V01 |
| R02 | Isolate tenant jobs/results | Cross-tenant API, storage and compute access denied; V02 |
| R03 | Prevent duplicate final publication after replay | Concurrent/restarted attempts expose one committed final result per job; V03 |
| R04 | Recover within 900 seconds | Proposed measurement: failure onset to restored admission and durable-job progression; excludes solver completion. Failure envelope unresolved; V04 |
| R05 | Preserve Slurm; use staging ACCOUNT_A/eu-west-1, hpc-login, /project/orders | Target and placement inspection; V05 |

Installed versions, actual resources, code, workload, partition/account/QOS, credentials, topology, quotas, recovery-point requirement and solver checkpoint support are unknown. No user research or measured capacity exists. R04 cannot be promised without defining its failure envelope and measuring queue/restore delay.

## Decision and linked views

D01, proposed, supports R01–R05: retain site Slurm/Apptainer scheduling and propose ECS/Fargate for the API/bridge. Replacing Slurm with Kubernetes conflicts with R05 and requires unproven MPI/GPU/fabric, storage and scheduling migration. Retention preserves data locality and site operations, but leaves WAN/site availability and queue wait dependencies. Reconsider only if constraints change and representative measured benefits justify migration.

Boundary view: authenticated tenant → API → durable job ledger/outbox → delivery queue → bridge → hpc-login → Slurm allocation → Apptainer solver. Status/results return through the bridge and API. The API owns tenant authorization and job identity; Slurm owns allocation/execution, never API acceptance. Login-host work is submission/reconciliation only; solvers run inside allocations.

Authority/data view: propose transactional ledger/outbox commit before acceptance, tenant-scoped idempotency keys and immutable input digests. Queue delivery is replayable. Bind job identity to tenant and scheduler job identity; reconcile lost submission acknowledgements before resubmitting. Never trust tenant-supplied paths or scheduler identifiers. Use site-approved per-tenant Unix identities/ACLs under /project/orders and scoped result access; Apptainer alone is not tenant isolation. Workers stage attempt outputs; an authoritative conditional commit with monotonic fencing selects one final manifest. Consumers expose only that manifest. Expired owners cannot publish. External notifications require equivalent idempotency.

Deployment/failure view: propose private API/bridge tasks across two actual availability zones behind controlled ingress; managed transactional state, queue and result storage remain unselected resources. Platform owns IAM, network, deployment and state recovery; site authority governs Slurm/storage. Restrict short-lived service identities, egress and host-key/CA trust. WAN loss pauses dispatch; retain durable work. Site/storage loss, stale fencing state or unknown submission outcome prevents blind retry. Regional recovery, N-1 capacity and cross-region guarantees remain unverified.

## Bounded proposed procedure

Trigger: isolated staging rollout or recovery exercise. All placeholders below are **UNREADY**, not executable commands. No commands were run. Each step has a proposed 60-second control-plane deadline; the recovery clock remains 900 seconds overall.

1. Establish trusted controller OS/shell/cwd, pinned CLI/IaC versions, inspected scripts/configuration and PROFILE. Resolve ACCOUNT_A to its actual account ID. Template: `<AWS_IDENTITY_READ --profile PROFILE --region eu-west-1>`. Require matching caller/account and exit zero; mismatch stops mutations.
2. Establish Linux shell/cwd on hpc-login, verified host key, site identity/partition/QOS and /project/orders ACLs. Template: `<SITE_SCOPED_PREFLIGHT>`. Expect allowed/denied access evidence; missing trust or capability stops dispatch.
3. Validate/render pinned artifacts; inspect staging plan, state lock, replacement effects and immutable image/config identity. Template: `<VALIDATE_AND_PLAN TARGET>`. Expect compatible, bounded changes; drift or unknown state stops rollout.
4. Deploy one bounded canary via `<DEPLOY_REVIEWED_ARTIFACT TARGET>`. Expect healthy admission, durable identity and isolated allocated computation. On timeout reconcile actual state before retry; abort admission/dispatch on tenant leakage, duplicate publication or lost durability.
5. Exercise replay/failure via `<ISOLATED_FAULT_AND_RESTORE TARGET>`. Fence old writers, reconcile ledger/Slurm, restore compatible checkpoint/state, then reopen admission. Roll back compatible image/config only; preserve committed data. At 900 seconds stop the exercise and record failure; unresolved authority keeps dispatch closed.

## Verification trace

V01–V05 map respectively to R01–R05 through D01 and this revision. Planned probes: crash around acknowledgement; two-tenant denials; replay/concurrent publication and stale-owner rejection; timed restore including queue/WAN delays; target/placement inspection. Artifact/build/environment/data populations: unavailable. Expected outcomes are above; actual results/evidence: none. Every probe is UNVERIFIED. No deployment, build, test or recovery measurement exists; this document establishes no operating acceptance.
