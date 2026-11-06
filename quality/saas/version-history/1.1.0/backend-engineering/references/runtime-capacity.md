# Diagnose resources and compose budgets - B6

Activate L09/L20 or a critical performance path. Inputs: actual hardware/runtime/configuration, workload/cardinality/skew/payloads, profiles and affected contracts. Output a falsifiable bottleneck, one experiment, bounded implementation and measured range.

| Requirement / observation | Mechanism if supported | Limit | Competing failure | Falsifying probe |
| --- | --- | --- | --- | --- |
| Ordinary routes stall during parsing/computation | Profile callback/CPU/GC; bound input, partition suitable work or use reused bounded CPU-worker pool | Transfer/allocation/scheduling, count/bytes/age/cancel | Sync DB/native wait or throttling resembles CPU work | Align profiles/loop delay with request interval; cheap traffic alongside costly work |
| Async file/crypto/resolution waits, low loop delay | Inspect actual native pool/dependency contention; isolate task class before resizing | Runtime/native configuration/downstream capacity | DNS/network/server delay resembles local starvation | Remove competing class and compare queue/service intervals; JS workers are not universal I/O acceleration |
| DB acquisition wait grows | Diagnose holders/queries/locks/idle or leaked transaction; bound acquisition and total demand | Replicas/workers/maintenance/surge/terminating instances | Bigger pool moves overload into DB | Acquisition versus execution/lock/transaction time; cancel and prove release |
| Query slow, service CPU low | Inspect access path/cardinality/storage/locks | Rows/bytes/index maintenance; estimates are not measurements | Decoding/network/serialization dominates | Actual plan/waits plus end-to-end time on same data/cache |
| Heap stable, RSS grows | Track buffer/native/cache/socket/task lifetime | Full-process envelope | Allocator/shared mappings differ without leak | Repeated release workload; heap/external/array-buffer/RSS/resource counts; native profiler if needed |
| More replicas, same useful throughput | Locate shared quota/hot-key/lock/distribution/generator bottleneck | Warm-up/surge/cold-cache/downstream | Generator cannot produce load | Reconcile offered/generated/admitted/useful outcomes; scale actual bottleneck |

Inspect event loops/threads/processes, blocking I/O/CPU placement, synchronization/lock order, allocation/copies/GC and structured cancellation/cleanup. Include CPU throttling, total memory, FD/socket/backlog/NAT/ports/temp disk, signals/startup/shutdown/replacement and selected serverless cold-start/execution limits. Exercise starvation, leaks, disk exhaustion/cancel/termination as applicable. ELU is loop activity, not process CPU; correlate with profiles/waits.

## Cost models

Use N records, B bytes, K results, P partitions, C active and Q queued. Analyze expected/amortized/worst CPU where meaningful; auxiliary/retained memory; DB operations/rows/index/lock duration; network rounds/bytes; parse/serialize/compress/allocate; fan-out/retries/batches/background amplification; storage growth/recovery. No whole-operation O(1) that omits key/payload/database/remote work.

At stable consistently defined boundaries:

L = admitted_arrival_rate * E[W]

M_required = M_base + C*m_active + Q*m_queued + M_cache + M_buffers + M_runtime

C_DB,total = sum(active_instances_j * pool_limit_j) + C_workers + C_maintenance

Little's Law relates averages, not p99/unstable backlogs. Use actual pooling topology and starting/terminating processes retaining connections; unknown memory terms stay unknown. Example assumptions: four apps*8 + workers4 + two surge/terminating apps*8 + maintenance2 =54 connections, exceeding allocation40 although steady app demand is32. This is arithmetic, not observed utilization.

## Compose budgets

One local total deadline owns remaining work. Give queue/connect/dependency/response non-overlapping caps within it; do not double-count a connect interval already inside a client's total timeout. Never forward local monotonic timestamps unchanged across hosts. Cancellation does not prove a sync driver stopped or undo commit. Reject work that cannot remain useful; bound rate/concurrency/queue count/bytes/age/fan-out and tenant/class fairness.

Three nested layers permitting three total attempts each can cause27 leaf attempts; fan-out4 raises that envelope to108. Choose retry owner, identity, total deadline and bounded jitter. A component-p99 sum is not journey p99; concurrent branches follow the critical path. Measure full completion separately from acknowledgement.

Freeze hardware/build/tool/browser where relevant, workload/cardinality/skew/payload/cache/network/CPU/dependencies, limits and repetitions. Open arrivals answer offered-load questions; closed concurrency self-throttles yet can exhaust resources. Reconcile intended/generated/admitted/useful, timeout/rejection/failure/retry/generator-dropped work with mutually exclusive outcomes. Include normal/sustained/burst/overload/failure/recovery, latency populations, failures/raw samples, >=3 important comparison runs and median/range. Uncontrolled caches are not cold-cache; finite labs do not establish production SLO/cost savings.

Preserve the failing workload and distinguish generator from service saturation. Correct the named bottleneck, retain correctness probes and rerun comparable conditions.

Checked2026-11-06: [Node24.12 perf_hooks](https://nodejs.org/download/release/v24.12.0/docs/api/perf_hooks.html), selected ELU/delay; [worker_threads](https://nodejs.org/download/release/v24.12.0/docs/api/worker_threads.html), CPU/I/O/reuse; [scheduling](https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop), Linux caveat. Original synthesis, not a new executed adapter. Other sources: [register](sources.md).
