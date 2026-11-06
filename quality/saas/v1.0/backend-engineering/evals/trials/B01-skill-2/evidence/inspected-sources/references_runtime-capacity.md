# Runtime, cost and workload analysis — B6

Activate for L09/L20 and every critical path's cost analysis. Inputs: actual runtime/OS/container and limits, supported workload/cardinality/skew/payload, critical-path mechanisms and resource observations. B1 defines success; affected modules define correctness. Output a variable-based cost model, bounds and comparable measured evidence.

## Critical-path cost contract

Define variables and units: `N` records, `B` encoded/expanded bytes, `K` returned results, `P` partitions, `C` active work, `Q` queued work. Include relevant CPU expected/amortized/worst case; auxiliary **and retained** memory; DB operations, examined/returned rows, indexes and lock duration; network rounds/bytes; parsing/serialization/compression/copies; fan-out, retries, batching/background work; storage growth and recovery/rebuild. Mark unknown terms. Key hashing and payload work scale with bytes; an expected constant-time map lookup does not make its complete backend operation O(1).

For a stable system with consistent admitted-arrival and time-in-system boundaries:

`L = λ_admitted × E[W]`

Use averages over a suitable interval and include the same population in each term. This is not a p99 bound or a guarantee during unbounded backlog growth. Do not mix offered traffic with admitted occupancy or exclude slow admitted work.

Construct a total process memory envelope:

`M_required = M_base + C × m_active + Q × m_queued + M_cache + M_buffers + M_runtime`

Define ownership so terms do not double-count, and include native allocations, serialization copies, stacks, code/runtime overhead, GC headroom and temporary disk where relevant. A language heap limit is not a total RSS/container guarantee. Check operating values and failure behavior against actual resource controls; Kubernetes CPU throttling and reactive memory-limit/OOM enforcement differ.

Calculate deployment-wide database demand across **all** processes:

`C_DB,total = Σ_j(active_instances_j × pool_limit_j) + C_workers + C_maintenance`

Count starting, serving and terminating instances while they hold connections, rollout surge, batch/reporting/migration/backup processes and failover overlap. Adjust for client-vs-server pool topology and actual PgBouncer mode; do not sum multiplexed client sockets as if each owns a dedicated backend connection. Add headroom and downstream limits from the real system.

| Requirement | Mechanism | Operating limit | Failure mode | Verification |
| --- | --- | --- | --- | --- |
| L09 Runtime concurrency | Map event loops, threads/processes/worker pools, blocking I/O and CPU work. Own tasks/cancellation/cleanup, synchronize shared state with consistent lock order. | Active/queued tasks, CPU/core/throttle, pool, locks and per-task deadline; offload CPU work only when measured benefit justifies copies/scheduling. | Ordinary requests starved by expensive work, deadlock/pool exhaustion, leaked task or cancellation that leaves work running. | Mix expensive/ordinary traffic, contention, cancellation/restart/process signals; inspect profiles and pending handles, not only throughput. |
| L09 Memory/OS/container | Bound buffers/materialization/temp files and observe heap/native/RSS/GC; explicit startup/shutdown/replacement and serverless cold-start/execution contracts when applicable. | Total memory envelope, FD/socket/disk/backlog, CPU and execution/termination limits. | GC pressure/OOM/native growth, socket/FD/disk exhaustion or unsafe process termination. | Repeated workload and cleanup, resource pressure/disk failure, leaked sockets/tasks, termination under work and actual cold start if selected. A finite plateau is not proof against every leak. |
| L20 Traffic/admission | Classify requests and offered/admitted/useful work, bursts, key/tenant/payload skew. Bound rate/concurrency/queue count/bytes/age, fan-out and downstream work. | Per-class/tenant budgets, total deadline, queue residence, retry amplification and dependencies' quotas. | One tenant dominates, queue explodes, fast rejects hide loss of useful completions, backpressure moves overload downstream. | Ramp/burst/sustained overload, dominant tenant, dependency failure and recovery; count every demand/outcome category and verify predictable rejection/cleanup. |
| L20 Scale/cost | Locate actual bottleneck; compare vertical/horizontal scaling, warm-up, stabilization, min/max and draining while respecting DB/external capacity. | Cost/resource per useful completion, surge/terminating connections, cold-cache origin load and time to usable capacity. | More replicas overwhelm DB, persistent connections distribute unevenly, cold-cache scale adds load, scale-down drops work. | Replica loss, controlled scale/cold cache and recovery; demonstrate improvement at bottleneck under comparable workload. Local single-process tests do not establish horizontal scale. |

## Measurement and load accounting

Before optimization: write a falsifiable bottleneck hypothesis, mechanism/expected effect and workload range, then freeze correctness checks and comparison conditions. Retain original code/config and failures. Record hardware/OS, runtime/build hash, process/container limits, dataset cardinality/skew, request mix/payload, cache state, dependency delay/failure behavior, generator and repetition/sample counts. If OS/disk cache cannot be controlled, do not call a run cold-cache.

Choose open arrivals independent of completions for offered-load/overload questions; choose closed concurrency deliberately for the question it answers. Closed workloads self-throttle their arrival rate as responses slow; they can still exhaust finite resources. The Architecture Book's open-loop warning is a reason to choose carefully, not a universal claim that a closed test cannot overload any system. For k6, include actual dropped iterations; for another generator, implement and report its equivalent.

Every load report accounts for intended arrivals, generated requests, admitted work, useful completions, timeouts, rejections, retries and generator-dropped/not-started work. Define mutually exclusive outcome categories and reconcile sums. Report latency population/units and all failures; successful-response latency alone cannot characterize demand that timed out, was rejected or never generated. A finite local sample does not establish a production percentile/SLO.

Use at least three important comparison runs and median/min–max plus raw samples; include normal, sustained, burst, overload, failure and recovery when capacity is claimed. Record operation completion separately from immediate acknowledgement. Measure DB/query counts, examined/returned rows, I/O, lock wait and memory where observable; leave unavailable metrics unverified. Do not invent cost savings from asymptotics or a hypothetical cloud bill.

Failure handling: preserve the failing workload, distinguish generator saturation from system saturation, repair the named bottleneck without weakening correctness or gates, and rerun comparable conditions. Do not drop slow or failed runs to improve a summary.
