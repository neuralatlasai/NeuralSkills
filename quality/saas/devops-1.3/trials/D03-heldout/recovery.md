# D03 recovery contract

Decision: retain Slurm, Apptainer and the multi-node GPU/MPI solver. Reject the present proposal as sufficient recovery: requeue does not supply the solver's explicit restart argument, and appending to a shared final file cannot prevent partial or duplicate results. This document is a proposed contract and acceptance plan, not a deployed or runtime-verified change.

## Inputs, responsibility and unknowns

The supplied workload needs eight hours, accepts an explicit restart checkpoint and writes output manifests. The supplied checkpoint measurement is 70 seconds plus up to 20 seconds of filesystem flush. The site supplies 120 seconds of preemption notice. These are task inputs, not measurements performed here.

The solver owner must implement and demonstrate coordinated application checkpoints and restart semantics. The site operator owns Slurm signal/preemption behavior, allocation policy, storage guarantees and launcher integration. The publication owner owns the commit protocol and consumer contract. Do not enable recovery in production until those owners accept the gates below.

Unknown: solver command/format, restart compatibility and numerical tolerance; Slurm/Apptainer versions; signal route and preemption policy; GPU/driver/CUDA/MPI/PMI/PMIx/UCX versions; fabric; rank/GPU topology; account/partition/QOS, wall-time and restart limits; quota, space, inodes and durable filesystem semantics; target access; queue delay and restart costs; required RPO/RTO. No reason to replace the existing platform has been supplied.

## Identity and durable state

Define run_id from a canonical manifest containing input hashes, solver and configuration identity, random seeds, image digest, checkpoint schema and required topology/compatibility policy. Preserve it across requeue. Assign a fresh attempt_id for every batch-script execution; Slurm job ID alone is insufficient. Log job/step/restart identifiers as provenance, not as a substitute for run identity.

Use durable site storage visible from every eligible node:

- runs/<run_id>/attempts/<attempt_id>/ for logs, temporary outputs and diagnostics;
- runs/<run_id>/checkpoints/<generation>/ for immutable rank shards and a checkpoint manifest;
- runs/<run_id>/objects/<attempt_id>/ for immutable output chunks;
- runs/<run_id>/FINAL.json as the single consumer-visible completion record.

Node-local scratch is disposable staging. Do not put the sole committed checkpoint or final output there. Reserve capacity for two complete checkpoint generations, one in-progress generation, overlapping attempt output and finalization headroom; calculate bytes and inodes from actual shard sizes and quota. Garbage collection must preserve every object referenced by retained checkpoint or final manifests and must not race an active attempt.

## Restart state machine

1. At every batch-script start, reconstruct the same run_id and validate inputs/image/config. If FINAL.json already exists and its identity and hashes validate, report an idempotent completed result and do not launch the solver again.
2. Obtain publication authority for this run before execution. Use a site-supported serialized, crash-safe commit lock or transactional compare-and-set with monotonically increasing fencing epochs. An expired lease by itself is not fencing. Every authoritative checkpoint/final commit must reject an old epoch. If the storage cannot enforce that condition, stop automatic duplicate takeover until the operator proves the prior writer dead; an advisory local lock is insufficient.
3. Select the newest fully committed compatible checkpoint by generation and manifest, never file modification time or a partially written "latest" file. Validate run_id, schema, checksums/sizes, all required rank shards, solver/image/config identity, global iteration/time, output watermark and supported rank/GPU topology. If it is corrupt, retain the failure and try the previous committed compatible generation under the same policy. If no valid checkpoint remains, fail visibly or restart from immutable inputs only when the run's policy explicitly permits full replay. Never silently claim resume.
4. Invoke the solver with its documented explicit restart checkpoint argument and verified host MPI/Apptainer launch path. Exact command and signal API remain UNVERIFIED because they were not supplied. A fresh run is a separate explicit branch. Record the selected checkpoint and the solver's confirmation of restored iteration and distributed state.
5. Reconcile committed output keys against the checkpoint watermark before writing. Continue only after all ranks confirm a coherent restore. A missing rank, incompatible shard, transport failure or checksum mismatch aborts the attempt without advancing any commit.
6. Bound automatic recovery to a proposed three failed startup/checkpoint/restore attempts per run; retain counters durably across requeue. Alert and stop retrying on exhaustion, incompatible state, persistent quota error or no forward progress. This cap is policy to agree with the site, not a claim about configured Slurm behavior. User cancellation stops the run and must not trigger an application resubmission loop.

The wrapper must receive and forward the actual site warning into a solver-supported coordinated checkpoint request. A shell trap that only handles the batch shell is inadequate evidence that all MPI ranks/GPU streams quiesce. Coalesce repeated warnings: one checkpoint transaction at a time. Preserve solver failure statuses; scheduler requeue eligibility must not turn a corrupted checkpoint or normal cancellation into an infinite retry.

Slurm's documented requeue behavior restarts the batch script, and eligibility depends on site configuration. Preemption warnings and time-limit warnings must be validated separately; a requested time-limit signal is not proof of 120 seconds before every preemption. See the official [sbatch reference](https://slurm.schedmd.com/sbatch.html) and [preemption documentation](https://slurm.schedmd.com/preempt.html). No scheduler command was run here.

## Checkpoint commit and notice budget

At notice receipt, stop admitting new solver steps and output transactions; finish or abort any in-flight output preparation, then bring all ranks to one consistent application checkpoint boundary. Synchronize GPU work and capture the solver's distributed state, RNG/integrator state and output watermark as required by its format. A checkpoint is application state, not an assumption that a container process image is portable.

Write all shards into a new private generation. Close and flush them with the site's durable-write mechanism, collect rank acknowledgements, validate their complete set and hashes, then write and durably publish a checkpoint manifest. Advance the current checkpoint reference only through the fenced commit protocol. Preserve the prior generation until the new one is verified. A manifest is committed only after its referenced files and directory metadata have the site's documented crash-durability guarantee; atomic rename alone proves neither durable bytes nor cross-filesystem atomicity.

The supplied 70 + 20 = 90 seconds leaves 30 seconds of the 120-second notice. Necessary acceptance inequality:

signal delivery + rank quiescence + checkpoint (70 s) + flush (<=20 s) + validation/commit + orderly termination + safety margin <=120 s.

The known 90 seconds is not a proven upper bound at every scale or under filesystem contention. Freeze a measured bound for each remaining term and a positive safety margin before acceptance. A proposed internal deadline is durable commit by notice+110 seconds, leaving 10 seconds for shutdown; it is feasible only if all delivery/quiescence/validation/commit overhead fits within the remaining 20 seconds. Abort checkpoint publication when that budget is exceeded, retain the old checkpoint, and let the site reclaim the allocation safely. Do not keep computing during the final warning interval or assume a new checkpoint will finish after resources are revoked.

If termination interrupts any shard, flush or manifest preparation, leave the generation uncommitted and ignore it on restart. If termination happens after commit but before acknowledgement or exit, restart discovers and validates the committed generation. Never overwrite the last good checkpoint in place.

Periodic durable checkpoints are also required because node loss or a shortened/missed notice may provide no checkpoint opportunity. Proposed initial policy: no more than 20 minutes of additional useful computation after the last committed checkpoint, then pause for a checkpoint; a failed checkpoint stops further useful advancement until repaired or terminated. This cadence is provisional pending RPO, quota and I/O measurements. Under this policy a single hard failure can lose up to 20 minutes of useful work; if failure occurs during checkpointing it also wastes checkpoint wall time. Repeated failures may prevent any forward progress. The ideal checkpoint fraction at the supplied worst-case I/O time would be 90/(1200+90), about 7%; this is arithmetic only, excluding coordination and contention, not a measured overhead or speedup. Notice-only checkpointing leaves up to all eight hours vulnerable.

## Output publication and duplicate execution

The solver must write attempt-private immutable chunks with logical keys such as (run_id, timestep, partition). Each chunk manifest records key, hash, size, coverage and generating checkpoint/attempt. Never append concurrently or incrementally to a shared consumer final file.

Prepared output is invisible to consumers until validated and referenced by an authoritative commit. Associate checkpoints with the exact committed output watermark. A checkpoint must not assert that output is committed until its output commit is durable; otherwise replay must regenerate that output. Output committed ahead of a checkpoint is reconciled by logical key on replay: identical content is reused once; differing content for the same key is a visible conflict requiring investigation, never a second append. For nondeterministic solvers, define a scientific equivalence/conflict policy before accepting replay; silently accepting whichever attempt finishes last is prohibited.

On successful solver completion, validate every expected timestep/partition, checksums, termination status and solver correctness criteria, including reused output. Assemble the complete final manifest in private storage. Under the fenced commit protocol, atomically create FINAL.json only if absent, referencing already durable immutable objects. Use a verified no-replace/CAS operation on the selected filesystem, not an ordinary rename that can overwrite another winner. Readers follow only FINAL.json and verify referenced identity/integrity.

If an old attempt continues after takeover, it may write only its own immutable private files; its epoch cannot commit checkpoint or final state. Simultaneous attempts may waste GPUs but cannot publish two results. A duplicate final create with the same manifest is idempotent success; a different manifest for the same run is a conflict. If a final commit succeeds but its acknowledgement is lost, inspect FINAL.json on restart before doing work. If final publication is interrupted before commit, consumers see no final result and the next attempt can reuse verified chunks. A crash after final commit leaves one complete result, even if Slurm later requeues the script.

If consumers require one physical file, a single finalizer writes a new immutable file from the manifest, flushes and validates it, and uses the same fenced no-replace final record to expose it. Never rebuild by shared append. Deletion or rollback must not erase already published scientific results; publish a new run/version with provenance.

## Recovery time and capacity envelope

Record submission, eligibility, allocation, launcher start, first useful solver step, warning receipt, checkpoint commit, termination, requeue eligibility, restored first useful step and final durable publication as separate timestamps. Queue wait includes QOS/fairness and capacity constraints and has no supplied finite bound.

Let D be failure detection/shutdown/requeue handling, Q be renewed queue wait, S be allocation/launcher/compatibility startup, V be checkpoint validation and load, and W be GPU/MPI warm-up. Failure-to-resumed-useful-compute = D+Q+S+V+W. Catching up adds replay of work since the chosen checkpoint. Notice-to-resume also includes the notice-time checkpoint/drain portion as applicable. Final-result latency includes remaining useful work and output validation/publication. Do not call checkpoint duration the RTO.

Eight hours is the given useful-work baseline. Total turnaround also includes initial queue/start, periodic checkpoint overhead, replay, every interruption/requeue/restore delay and final publication. No eight-hour completion or bounded RTO can be promised without queue/resource guarantees and measured startup/restore. Set an agreed numeric completion deadline and RTO/RPO before rollout; escalate queue-age/deadline breaches rather than resubmitting aggressively. Track useful GPU-hours, replay/idle allocation time, checkpoint bytes/bandwidth, scratch/durable quota and communication time separately. Compare at least three like-for-like runs before making performance claims.

Apptainer does not establish CUDA/MPI/fabric compatibility by itself. Confirm host driver versus container CUDA, MPI ABI/runtime and PMI/PMIx integration, launcher, GPU visibility/bindings and interconnect transport across the target node count; prohibit topology-changing restart unless the solver supports it. The [official Apptainer MPI guide](https://apptainer.org/docs/user/latest/mpi.html) describes host/container integration requirements; its current examples are not evidence of the site's versions or performance. No platform migration is justified by the available workload evidence.

## Failure schedule and frozen acceptance gates

Run these only in a separately authorized isolated allocation with a representative multi-node dataset and safe abort/cleanup limits. All runtime rows are UNVERIFIED. Record initial failures and every repair/rerun rather than replacing failed evidence.

| ID | Injection or condition | Required result and evidence |
| --- | --- | --- |
| R1 | Clean fresh run; then requeue/start from a known checkpoint | Explicit restart argument, identical run_id/new attempt_id, restored global state; compare solver invariants/results with uninterrupted baseline under agreed tolerance. |
| R2 | Warning at arbitrary compute point, on each supported rank topology and under representative I/O contention | Timestamp actual signal arrival at wrapper and all ranks; checkpoint/flush/commit/exit meet the 120 s budget with agreed margin. Test shortened/missed notice separately: previous checkpoint remains usable. |
| R3 | Kill before checkpoint, during shard write, during flush, before/after manifest and current-reference commit | Only old or complete new generation selected; no mixed-rank restore, partial manifest or lost last-good generation. Corrupt latest shard/checksum and verify logged fallback. |
| R4 | Kill during chunk write/flush, between output commit and checkpoint, between checkpoint and output, during final assembly and immediately before/after FINAL commit | Consumer sees no partial final; watermark reconciliation produces every logical key once; lost commit acknowledgement is idempotent; hashes/coverage remain valid. |
| R5 | Two concurrent attempts; stale writer after authority transfer; lost acknowledgement | Old fencing epoch is denied at every authoritative commit; one final result; same-key differing content fails visibly. Verify crash-safe lock/CAS semantics on actual shared storage. |
| R6 | Lose a compute node/GPU or MPI rank without warning; restore on replacement nodes | Clean coordinated failure, bounded admitted replay under periodic policy, compatible full-rank restore; no hanging rank or orphaned output publication. |
| R7 | Exhaust bytes, inodes/quota or storage availability during checkpoint and final publication | No success marker, preserve prior committed state, bounded retry and operator alert; reclamation does not delete referenced files. |
| R8 | QOS/queue starvation, wall-time expiry, repeated preemption, restore failure and explicit cancellation | Actual queue/restart accounting; persistent retry cap/no-progress alert; cancellation respected; no false RTO or completion guarantee. |
| R9 | Target multi-node MPI/GPU launch, checkpoint and full restore with pinned image/versions/fabric | Correct GPU/rank placement, inter-node exchange and scientific output; record all compatibility and topology identities. One-node smoke test is insufficient. |

Acceptance requires the actual wrapper/solver adapter and commit implementation to be reviewed, the storage durability/fencing primitive demonstrated, every required row passed with logs/manifests/hashes and an agreed numerical correctness criterion, plus at least three comparable timing runs at target scale for important performance claims. Record sample count and median/range; use larger samples before percentile claims. Capture failure-to-useful-compute and final-completion time including queue/restart, not only checkpoint time. The operator must approve exact signal route, grace policy, requeue behavior and stop conditions. Until then status is DOCUMENTED PROPOSAL; deployment, recovery correctness, timing envelope, MPI/GPU portability and publication atomicity are UNVERIFIED.

A staged introduction starts with an isolated representative run, then one approved production run with strict monitoring and retained prior artifacts. Abort on deadline overrun, output conflict, failed fencing, corruption, incompatible restart or exhausted recovery limit. Disable further automatic retries/publication, preserve immutable evidence and resume only after diagnosis. Reverting the wrapper does not repair or retract published data.

## Evidence and execution record

Observed locally: task and relevant SaaS routing, DevOps, compute, verification and standards guidance; official documentation opened read-only. No checker, quality report, control, other case/output, scheduler, cluster, deployment or dependency installation was accessed. No runtime failure was induced and no new recovery measurement was invented.

Supplied proposal deficiencies remain recorded: automatic solver-resume assumption FAIL by contract review; shared-final append FAIL by contract review; 120-second feasibility UNVERIFIED because non-I/O overhead and site-scale worst cases are absent. These are design findings, not executed cluster test results.

Actual underlying tool-call count and local validation timing are finalized below. Commands were limited to:
1. exec_command: Get-Content roles/saas/SKILL.md; Get-Content quality/saas/devops-1.3/cases/D03/task.md.
2. exec_command: Get-Content roles/saas/devops.md; Get-Content roles/saas/verification.md; Get-Content roles/saas/standards.md.
3. exec_command: Get-Content roles/saas/devops-compute.md.
4. web.run: open https://slurm.schedmd.com/sbatch.html, https://slurm.schedmd.com/preempt.html and https://apptainer.org/docs/user/latest/mpi.html.
5. exec_command: New-Item for the assigned output directory; Set-Content recovery.md from the authored literal document.
6. exec_command: read this recovery.md only, check required contract markers and append actual count/timing/evidence; report file metadata.

Tool calls 1-3 exited 0; the official-page open succeeded. Initial shell runtimes were 0.4068486, 0.4087447 and 0.4729777 seconds, respectively. These are tool-reported command durations, not HPC measurements. Full-task elapsed time was not captured from the first call; the separately labeled measured authoring interval starts immediately before call 2.


Final local verification: PASS for required contract markers and readable nonempty artifact. This is a document-content check, not a scheduler, solver, filesystem-durability or concurrency test. Tool call 5 exited 0. Actual underlying tool calls: 6 (five exec_command calls and one web.run call). No tool retries or child agents. Measured authoring interval from just before call 2 to just before call 6: 185.017 seconds; excludes call 1 and final validation. Measured final local read/content-check interval before this evidence append: 0.161491 seconds. No full-task wall-time measurement is available. Required live acceptance gates remain UNVERIFIED.
