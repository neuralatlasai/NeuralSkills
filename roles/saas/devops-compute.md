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

Use the site's trusted execution path: local controller -> authorized login host -> allocated compute nodes. Record which host each command targets. On the appropriate host, `squeue --version` and `apptainer version` identify clients; `module list` identifies the active site toolchain and may write normal output to stderr. Preserve modules/environment before changes; noninteractive SSH/batch shells may initialize differently. Do not run automatic module purge, replace MPI/CUDA or install scheduler clients on the controller to repair a remote workload.

Scoped `squeue --me`, `sinfo --summarize` or `scontrol show job JOB_ID` contact scheduler services; query only the needed job/partition and bound frequency. `bash -n SCRIPT` checks Bash syntax only; `sbatch --test-only SCRIPT` contacts the scheduler without submitting and is not an offline test. Actual submission needs authorized account/partition/resources, working directory, environment and staged inputs. Slurm does not stage user data automatically; use explicit site-supported shared/staging paths, LF/shebang/permissions and output/checkpoint locations. Keep secrets out of indiscriminate environment export.

Run solver/MPI/GPU capability tests inside an authorized allocation, not as heavy login-node work. `nvidia-smi -L` can enumerate NVIDIA devices there; a missing local GPU or a driver-displayed CUDA/UMD version does not prove the remote device/toolkit/image contract. Verify actual toolkit, host driver, container libraries, launcher and fabric with a small representative allocation before scaling. [Execution sources](source-register.md#execution-preflight-review) distinguish documentation from unperformed site tests.

Slurm requeue restarts the batch script; a signal notifies rather than checkpoints automatically. Define application checkpoint format/frequency/atomic publication, input/output identity, restart detection and duplicate-result prevention. Budget checkpoint I/O and preemption notice: lost compute plus restore/requeue delay must fit recovery needs. Apptainer checkpoint support and MPI portability depend on the actual application, host libraries and devices; experimental mechanisms do not establish general recovery.

Probe preemption before/after checkpoint and output commit, node loss, quota/queue starvation, scratch exhaustion and cancellation. Measure queue wait, useful GPU/CPU time, communication, checkpoint bytes/time, lost work, restore time and fairness separately. Verify on actual multi-node hardware before claiming scaling; one-node container execution proves no MPI/GPU portability or speedup.
