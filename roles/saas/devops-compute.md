# Containers, orchestration and scheduled compute

Activate for a selected container/cluster/HPC path. Inputs: image/build, process lifecycle, resource profile, cluster/scheduler/runtime/plugins, workload and failure scope. Dependencies: [DevOps](devops.md), application health/cancellation and state contracts. Output deployable configuration plus version-specific checks. Static rendering is not runtime acceptance. If daemon/cluster/scheduler is unavailable, preserve render results and mark dependent tests UNVERIFIED.

## Docker and local services

Use inspected multi-stage builds, minimal compatible trusted bases, dependency locks and deliberate architecture/digest selection. Exclude credentials/build artifacts from context; use supported build secrets, never secret-bearing ARG/layers. Verify image identity and required scan/provenance expectations; assign patch/rebuild cadence to pinned images. Separate application non-root USER from a rootless daemon.

Compose is suitable when one host's failure domain and operational limits are acceptable. Specify resource/log bounds, networks, persistence/backup and actual health behavior. `depends_on` ordering/health is not ongoing dependency recovery. Test engine/process restart, dependency delay, disk pressure, volume restore, secret replacement and graceful stop. Build/render success does not establish those behaviors.

## Kubernetes only when justified

| Requirement | Mechanism / limit | Failure / acceptance probe |
| --- | --- | --- |
| Scheduling and isolation | Measured CPU/memory/ephemeral requests and limits; service account/namespace/RBAC, restricted security context, scoped ingress/egress NetworkPolicy with actual enforcing CNI | Requests guide scheduling, CPU limits throttle, memory may OOM. Saturate CPU/memory/disk; inspect pending/OOM/throttle and deny unwanted traffic/host access. Include native buffers and sidecars. |
| Healthy traffic | Startup for initialization; readiness for eligibility; liveness only for unrecoverable process failure. Bound probe cost/time and initialization allowance | Slow startup/dependency outage/overload separately. Readiness failure need not restart; dependency-sensitive liveness can cause cascades. Observe routing, restarts and useful capacity. |
| Scaling | HPA/custom metrics with appropriate requests and metrics availability; node scaling/quotas separate. Bound min/max, stabilization, warm-up and downstream admission | Burst, missing metrics, unschedulable pods, exhausted nodes/IPs/DB. Pending pods and retry amplification remain in results; autoscaling does not create downstream capacity. |
| Availability | Spread across real nodes/zones with satisfiable placement; separate rollout surge/unavailability and PDB eviction constraints | PDB does not prevent involuntary loss or govern Deployment rolling updates; direct pod deletion bypasses eviction protection. Test rollout, eviction drain and node/zone loss separately; verify N-1 capacity. |
| Termination | Stop admission, propagate endpoint removal, drain requests/streams and hand off durable jobs within grace; configure application handling, not just a sleep hook | Observe active traffic during termination and reused connections. `preStop` consumes the grace period. Escalation must preserve declared durable-work/replay semantics. |
| State and upgrades | Explicit storage class/CSI topology, persistence/backup/access modes and restore; API/controller/CRD/version skew compatibility | Reschedule with unavailable zone/volume, restore isolated data, interrupt upgrade. StatefulSet identity and PVC existence alone do not prove replication, backup or recoverability. |

Render with existing Helm/Kustomize; check API schemas and policy at supported versions. Use server dry-run/diff only against the authorized target; admission/controller and runtime tests remain separate. Uninstall/rollback must account for persistent resources and external effects.

## HPC is a different workload

Prefer the site's Slurm/Apptainer path for queued MPI/GPU/batch workloads when suitable; Kubernetes Jobs/operators are alternatives when ecosystem/isolation and measured workload benefit justify them. Inspect account/partition/QOS, node/GPU type, CPU-memory/GPU ratios, driver/CUDA/MPI/launcher/interconnect compatibility, license quotas, scratch/shared-filesystem bandwidth, wall time and queue fairness. Distinguish allocation, job start, useful computation and durable output completion.

Slurm requeue restarts the batch script; a signal notifies rather than checkpoints automatically. Define application checkpoint format/frequency/atomic publication, input/output identity, restart detection and duplicate-result prevention. Budget checkpoint I/O and preemption notice: lost compute plus restore/requeue delay must fit recovery needs. Apptainer checkpoint support and MPI portability depend on the actual application, host libraries and devices; experimental mechanisms do not establish general recovery.

Probe preemption before/after checkpoint and output commit, node loss, quota/queue starvation, scratch exhaustion and cancellation. Measure queue wait, useful GPU/CPU time, communication, checkpoint bytes/time, lost work, restore time and fairness separately. Verify on actual multi-node hardware before claiming scaling; one-node container execution proves no MPI/GPU portability or speedup.
