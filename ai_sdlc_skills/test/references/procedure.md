# TEST procedure

Version: 2.0.0. Read this for the selected stage's operational work. Shared authority, state restoration, status, retries and continuation are defined in [GOV-1](../../shared/governance.md); serialization and eligibility are in [ART-1](../../shared/artifact-contracts.md).

## Inputs and proportionality

Identify the exact candidate/configuration, authorized expected behavior, permitted environment/data and applicable acceptance policy. Ordinary local assessment may use task/repository expectations without inventing a new formal policy; missing material oracles block affected acceptance.

In the procedure below, authorized/approved intent, design and policy mean the sufficient current task/repository contract and any actually applicable adopted policy. Formal baselines, separate reviewers, external controls and approvals are mandatory only where governing authority requires them. Preserve adopted controls; never invent a new ceremony or bypass a material unresolved decision. Apply only relevant rows/categories. Dependencies stay ordered; independent authorized investigation can continue.

## Procedure

Execute rows in order. Each applicable category receives its own results; a category exclusion needs a revision-bound decision and rationale.

| Step/action | Input/context | Method/tool | Resulting artifact | Verification | Failure response |
|---|---|---|---|---|---|
| 1. Restore and qualify assessment | Context, handoff, candidate, authorities and policies | GOV-1 entry protocol; resolve actual refs/tool scopes and control records | TEST entry record; candidate/environment manifest; issues | Candidate identity, required baseline, authority, access and external controls verified | BLOCKED for missing dependencies; continue allowed analysis only |
| 2. Reconcile needs and test obligations | Approved requirements/design, risks, known defects and previous results | Build revision-aware requirement-to-test matrix; separate specification verification from stakeholder validation | Coverage obligations; risk priorities; unresolved conflicts | Each scoped requirement has test/review or authorized exclusion with owner | Ambiguous behavior to PLAN; contract gaps to DESIGN; no invented thresholds |
| 3. Select categories and freeze assessment | Risk matrix, approved policy, environment and budgets | Select applicable unit, integration, contract, system, security, performance, resilience and acceptance tests; consider accessibility/safety where applicable | Test matrix; exclusions; exact pass/fail policy; measurement plan | Every relevant category considered; exclusions justified by authorized applicability; limits fit scope | BLOCKED for undecided applicability/criteria; escalate infeasible coverage rather than weaken it |
| 4. Establish oracles and independence | Requirement/source refs, expected outputs, independent datasets/reviews or reference implementations | Record each oracle's derivation, authority, limitations and shared-generation/source dependencies | Oracle inventory; expected results; independence assessment | Expected behavior supported beyond code/test agreement; policy-required independence satisfied | BLOCKED/INCONCLUSIVE where oracle cannot decide; request owner resolution or another authorized method |
| 5. Prepare environment and data | Pinned environment, fixtures, licenses, classification and retention rules | Inspect versions/configuration/capacity; validate fixture origin, representativeness, isolation, redaction and cleanup | Environment/data manifest; readiness receipts; data-quality limitations | Correct candidate/config; lawful authorized data access; expected isolation and usable data | Block unsafe/unknown access; FAIL demonstrated mismatch; repair only authorized harness/fixture state |
| 6. Execute and capture software checks | Frozen matrix/oracles, approved tools, sampling and observation windows | Run scoped tests; record per-case/per-run command, seed, timestamps, input, expected/actual result and evidence locator | Raw immutable results; observations; coverage measurements | Actual completion tied to candidate/environment; compare outcomes to the predeclared oracle | NOT_RUN for unexecuted cases; FAIL for violations; UNKNOWN on missing receipts; preserve every result |
| 7. Evaluate agent behavior where in scope | Agent task distribution, model/skill/tool versions, permission scopes and approved harness | Run representative, negative, boundary and adversarial tasks; assess task success, tool selection, permissions, unsupported claims, recovery and repeatability | Per-task/per-run agent results; traces; resource/cost observations | Required task strata/repetitions completed; claimed actions match receipts; control failures remain separately visible | Record individual violations and BLOCK dependent acceptance; do not average them away |
| 8. Analyze uncertainty and defects | All runs, measurement plan, flaky/nondeterministic policy and risk | Classify reproducible defects, environment failures, flakiness and unresolved oracle cases; use approved statistical treatment | Defect register; uncertainty/variation report; requirement coverage | Denominators, missing runs, sampling limitations and each disqualifying failure disclosed | No retry-until-green; retain earlier failures; route repairs to BUILD and criteria gaps to owners |
| 9. Assess and hand off | Current report, trace graph, approvals, residual risks and candidate digest | Apply gates per criterion; validate schemas; reconcile candidate/environment revisions again | Final test report; gates; revision-bound handoff | Current evidence supports every claimed pass; required decisions recorded; downstream obligations explicit | FAIL routes correction; BLOCKED names exact gaps; no release assurance inferred from incomplete evidence |

For stochastic behavior, declare task distribution/strata, seeds where meaningful, repetition counts, observation windows, aggregation/uncertainty method, stopping rule and failure treatment before scored runs.
Record actual sample counts and dependence between runs. Missing sampling/measurement policy prevents the affected acceptance claim; do not invent a universal number of runs or statistical confidence threshold.
Coverage and model confidence describe limited measurements. Neither coverage, a single successful run, self-grading, nor agreement between generated tests and generated code proves correctness.
On a changed requirement, candidate, dependency, environment, oracle, model, tool or skill, apply GOV-1 revision and recovery rules; retain history and revalidate the affected scope before reuse.

## Stage gates

Use GOV-1 status and gate rules for each gate and required test; record enforcement location, coverage, bypasses, timeout/error policy, criteria, owner, revisions and evidence.

| Gate/action | PASS | FAIL | BLOCKED | Justified NOT_APPLICABLE |
|---|---|---|---|---|---|
| TEST-ENTRY: execute scoped tests | Candidate, environment/data authority, frozen policy, limits and required controls verified | Proven target/scope violation or environment/candidate mismatch | Missing identity, access, required policy, safe limits, mandatory enforcement or reliable state | Authorized routing establishes no TEST activity applies; route appropriately |
| TEST-ORACLE: score an applicable obligation | Supported expected results and required independence; authorized category/method/sampling decisions | Proven oracle conflict with the approved baseline or forbidden criteria change | Unknown behavior, insufficient oracle/independence, or missing threshold/window/sampling decision | Named obligation/category excluded by authorized applicability evidence; assess remaining obligations |
| TEST-EXIT: present acceptance evidence to DEPLOY | Applicable acceptance criteria satisfied by current observations; defects/risks meet approved disposition and required review | Any disqualifying per-case failure or violated approved acceptance/control criterion | Required tests NOT_RUN, unknown, inconclusive or stale; missing review, disposition or adequate evidence | Authorized decision shows no acceptance handoff applies to the task; never substitute for an unexecuted test |

Record every observed FAIL even when missing evidence makes an aggregate gate BLOCKED. A schema-valid report or green aggregate cannot conceal a disqualifying case.

## Completion and evaluation

NOT_RUN is never PASS. A runner can complete successfully while the candidate fails acceptance. Do not change protected oracles/criteria after observing results or treat code/test agreement, coverage or confidence as independent proof. Intrusive tests require exact target/action/resource authority.

A handoff records responsibility and exact state; it does not end a broader assignment. Continue already authorized stages using their skills, retaining failures and reconciling unknown outcomes before retries. Evaluate relevant [cases](../../evaluations/cases.md) against frozen independent oracles. Structural validity is not action eligibility, authentic authorization or observed success.
