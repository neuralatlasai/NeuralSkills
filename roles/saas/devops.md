# Operate the smallest sufficient platform

Activate for infrastructure, delivery pipelines, container/cloud/HPC operations, reliability or scaling. Inputs: repository/IaC, target account/context, versions, topology/state ownership, traffic or job workload, budget and SLO/RPO/RTO. Dependencies: affected application contracts; read only the selected [platform](devops-platforms.md) section or [container/HPC](devops-compute.md) section. Output working configuration/code, an operating envelope, rollout/recovery procedure and evidence. Missing credentials/tools leave deployment unverified; prepare and check artifacts without inventing execution.

## Choose by workload and failure scope

Inspect actual accounts, regions, cluster versions, quotas, extensions, network paths and identity. Confirm targets without printing credentials. Compare existing platform, managed service, VM/Compose, Kubernetes and batch scheduler by isolation, execution lifetime, data gravity, compatibility, on-call burden and total cost. Kubernetes and multi-cloud require a concrete benefit. Preserve a viable existing platform.

| Required scope | Mechanism / operating limit | Failure to expose / acceptance |
| --- | --- | --- |
| Local | Reproducible image/config, bounded CPU/memory/disk and isolated state; one host remains one failure domain | Kill process/engine, fill disk, restore persisted state. Local success establishes no regional availability. |
| Regional | Separate actual zones, dependencies and capacity; usable capacity after one declared failure must exceed admitted peak demand | Lose node/zone plus deployment surge; measure useful completions, pending/rejected demand and recovery. Replicas on one host do not establish isolation. |
| Global | Separate routing, state replication and write ownership; select backup/restore, pilot light, standby or active-active from residency, RPO/RTO and latency | Partition primary, inspect lag, fence old writers, promote eligible state, restore routing, validate authority/deletion and fail back deliberately. DNS TTL does not bound all client caches or reused connections. |

For homogeneous independent replicas, surviving capacity is `(replicas - failed replicas) * measured useful rate per replica`; verify balance, warm-up and shared bottlenecks. Include peak plus headroom, quotas/IPs, node slots, surge/terminating processes, database pools and regional evacuation demand. Reuse [capacity models](backend-runtime.md), rather than adding competing budgets. Quorum/consensus and conflict resolution require the selected storage system's actual failure semantics; traffic steering cannot prevent split brain.

## Make changes reproducible and reversible

| Requirement | Implementation / limit | Failure / verification |
| --- | --- | --- |
| Controlled IaC | Existing Terraform/OpenTofu, Bicep, CloudFormation or Pulumi; declared versions/lockfile, isolated state ownership, encrypted access-controlled state/backups and supported locking | Concurrent writers/drift, missing keys, stale plan. Validate, inspect provider-native plan/what-if, test lock contention and state recovery. `sensitive` redacts output; it does not remove stored secrets. Verify ephemeral/write-only support by engine/provider version. |
| Trusted delivery | Build once; promote identical digest/config identity. Lock dependencies/actions; verify expected builder/signer and SBOM/scans where required. Scoped short-lived CI identity; restrict OIDC audience/subject/repo/ref/environment and permissions | Untrusted PR/branch/token or substituted artifact must be denied. Pinning freezes updates, so assign refresh ownership. Do not run repository scripts/providers before inspection. |
| Bounded release | Environment isolation, serialized apply, scoped IAM/network/egress, compatible migrations, canary population/window/abort thresholds and deployment timeout | Bad revision, missing secret, partial apply or interrupted migration. Inspect plan replacements/deletions and resource costs; reconcile actual state before retry. Do not force-unlock a live writer. |
| Safe repair | Health, rollback/forward-fix owner and state compatibility from [operations](backend-operations.md); retain audit/change evidence | Execute old/new compatibility and active drain. Reverting image/config does not reverse committed data. Preserve failure and stop the affected rollout when its abort criterion trips. |

## Verify operations, not resource existence

Declare useful service/job SLI, observation window, error budget and recovery objective. Freeze task-specific gates before tests: render/schema/policy; identity and network denial; startup/drain; burst/overload; failure-domain evacuation; isolated restore; telemetry outage. Each result links requirement -> mechanism -> limit -> failure -> actual probe. Use PASS/FAIL/UNVERIFIED/NOT_APPLICABLE; a required missing live test prevents a verified-deployment claim. [Standards](standards.md) provide traceability, not certification.

Measure p50/p95/p99 with populations/sample counts, admitted/useful work, dropped/rejected/timeouts, queue age, saturation and recovery. Include dependency quotas, egress/NAT, inter-region replication, idle standby, GPU waste, storage/log growth and restore cost in the cost envelope. Budget alarms do not necessarily stop spend. Use >=3 comparable runs for important performance comparisons; run chaos only within authorized isolated scope, with abort and cleanup conditions. No credential discovery, paid provisioning, production failover or publishing is implied by this guidance.
