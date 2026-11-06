# Version 1.1 revision

10,128 -> 8,289 instruction words (18.2% shorter); entry 59 lines. Count includes all references/source registers. The role catalog contains only the two skills; development and historical evidence live outside it.

Concrete procedures now cover atomic invariants, fresh authority, uncertain effects, fencing, bottleneck probes, deadline/connection budgets and migration compatibility. Independent new-version reservation and lease checks pass. The lease fixture's exhausted-token queue blockage was separately reproduced/repaired without tuning the held-out instructions; operator reconciliation remains required for exhausted records.

Across both roles: six fresh contexts, two paired cases and two held-out cases; **46 independent PASS =40 required +6 controls**. Both versions pass the public checks; one observation per arm establishes no general superiority. A review citation leaked version, so blinding was incomplete. Current evaluation is targeted, not an unqualified all-gates or10/10 claim.

Read the [shared result](../../../../quality/saas/revision-summary.json), [frozen protocol](../../../../quality/saas/expert-evals/protocol.md), [independent/qualitative evidence](../../../../quality/saas/expert-evals/results/) and [historical record](report.md). ISO/IEC/IEEE traceability is retained; formal normative conformance is unverified.
