# D01 orders rollout repair

Produced `runtime.json`, a Kubernetes `v1/List` containing the repaired Deployment, HPA, and PDB. Preserved the declared image digest and port 8080.

- Capacity: Deployment replicas and HPA minimum are 3; HPA maximum remains 6. After losing one replica, two healthy replicas provide at most 100 useful requests/s against 90 admitted requests/s. PDB `minAvailable: 2` permits one voluntary eviction at minimum scale. Rolling updates use `maxUnavailable: 0`, `maxSurge: 1`.
- DB allocation: maximum 6 regular + 1 surge + 1 terminating = 8 application processes. `DB_POOL_MAX=4` gives 8 x 4 + 4 worker + 2 maintenance = 38 connections, leaving 2 of the service's 40 unused. Five connections per process would require 46 and exceed the allocation. This assumes one application pool-bearing process per pod and the stated bound of one terminating replica.
- Probes: `/live` checks local failure, `/ready` gates dependency-aware traffic, and `/started` gates the other probes during initialization. Startup has a nominal 150-second failure budget (30 failures, five-second period), exceeding 120-second initialization. A dependency outage alone therefore does not fail liveness under the supplied endpoint contract.
- Termination: 25-second grace covers the stated 20-second drain plus five-second propagation allowance. No shell-dependent lifecycle hook was introduced. Actual signal handling and endpoint propagation remain untested.
- Resources: CPU request 250m, memory request 96Mi, memory limit 192Mi, ephemeral-storage request 16Mi and limit 64Mi; existing CPU limit 1 retained.
- Hardening: non-root UID/GID 10001, read-only root filesystem, all Linux capabilities dropped, privilege escalation disabled, RuntimeDefault seccomp, and service-account token automount disabled.
- Placement: hostname topology spread, maximum skew 1, `DoNotSchedule`, selecting `app=orders`. This configures spreading across eligible nodes; insufficient eligible capacity may leave pods pending.

## Verification and limits

All 18 offline PowerShell assertions passed: JSON parsing/resource structure, exact image preservation, port/probe wiring, replica arithmetic, eviction and rollout settings, DB budget, startup and drain budgets, resources, hardening, spreading, and matching resource labels/targets. These are static checks of the configuration and stated fixture arithmetic, not measured Kubernetes outcomes. No Kubernetes schema/API validation, deployment, cluster/account request, dependency installation, or load test was performed.

Unverified: actual scheduling/topology and node capacity, admission and policy acceptance, image availability and UID compatibility, startup/probe behavior, app health, drain/propagation timing, useful throughput, DB connection enforcement and process count, metrics-server availability, and HPA behavior. CPU utilization target 70% remains configured; no evidence establishes a direct mapping from CPU utilization to request rate. PDB protects voluntary eviction subject to Kubernetes readiness accounting and does not prevent involuntary failures or enforce throughput. Availability calculations assume remaining replicas are healthy and meet the supplied 50 requests/s fixture ceiling.

## Execution record

Actual underlying tool-call count: **4 `exec_command` calls**, each invoked through `functions.exec`. All returned exit code 0. PowerShell commands/scripts run:

1. `Get-Date`; `Get-Content -LiteralPath quality/saas/devops-1.3/cases/D01/task.md -Raw`; `Get-Content -LiteralPath quality/saas/devops-1.3/cases/D01/runtime.json -Raw`.
2. `Get-Content .../cases/D01/runtime.json -Raw | ConvertFrom-Json`; in-memory property assignments and `Add-Member`; `New-Item -ItemType Directory .../trials/D01-base -Force`; `ConvertTo-Json -Depth 40 | Set-Content .../trials/D01-base/runtime.json -Encoding utf8`; elapsed-time output.
3. `Get-Content` and `ConvertFrom-Json` for the original and output runtime; 18 throwing `Assert-Configuration` checks; `DateTimeOffset` UTC timing output.
4. `DateTimeOffset` elapsed calculation; `Set-Content .../trials/D01-base/report.md -Encoding utf8`; `Get-Item` verification of the two output files.

Timing: start 2026-11-06T09:30:48.2134405Z; static validation completed after 61.75 seconds; report generation elapsed **103.02 seconds**. The first elapsed calculation incorrectly mixed local `DateTime` parsing with UTC and emitted `-19772.21` seconds. That invalid timing result is preserved here; subsequent measurements use `DateTimeOffset` consistently. No configuration assertion failed.
