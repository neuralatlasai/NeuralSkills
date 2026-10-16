# DEPLOY procedure

Version: 2.0.0. Read this for the selected stage's operational work. Shared authority, state restoration, status, retries and continuation are defined in [GOV-1](../../shared/governance.md); serialization and eligibility are in [ART-1](../../shared/artifact-contracts.md).

## Inputs and proportionality

Preparation needs task scope and available candidate/target/release requirements. Execution needs exact candidate/target/configuration, acceptance evidence, valid release authority, health/stop criteria, safe required recovery, action/resource bounds and effective mandatory controls.

In the procedure below, authorized/approved intent, design and policy mean the sufficient current task/repository contract and any actually applicable adopted policy. Formal baselines, separate reviewers, external controls and approvals are mandatory only where governing authority requires them. Preserve adopted controls; never invent a new ceremony or bypass a material unresolved decision. Apply only relevant rows/categories. Dependencies stay ordered; independent authorized investigation can continue.

## Procedure

Each row is ordered. Record actual tools, command/API versions, input revisions, evidence IDs, and outcomes; use the project's release tools rather than inventing provider commands.

| Step/action | Required context | Tool or method | Resulting artifact | Verification | Failure response |
|---|---|---|---|---|---|
| 1. Restore release state and select preparation/execution mode | Context, handoff, candidate and prior journal | GOV-1 entry protocol; resolve refs and read target receipts within scope | Release record and unresolved register | Schema shape, exact revisions, allowed scope, previous UNKNOWN actions reconciled | BLOCK dependent actions; keep drafting available |
| 2. Establish candidate identity and eligibility | Build/provenance, TEST evidence, applicable controls | Registry digest/signature verification and evidence/trace review | Candidate manifest, integrity receipts, acceptance findings | Tested bytes equal proposed bytes; no concealed disqualifying defect or stale result | FAIL known mismatch; BLOCK missing proof; return to BUILD/TEST |
| 3. Assess target and release changes | Current environment, desired config/IaC, access policy | Read-only drift/config diff, capacity/dependency checks, secret-reference validation | Target/configuration refs and infrastructure change plan | Correct account/region/service; reviewed diff; no exposed secrets or unexpected scope | Stop target mutation; route architectural change to DESIGN |
| 4. Design migration and recovery sequence | Schema/data contracts, compatibility matrix, recovery policy | Compare expand/contract, rollback, and forward recovery; use isolated rehearsal where authorized | Migration/recovery strategy with decision IDs and rehearsal results | Old/new readers and writers compatible; data loss bounds, backup restore and irreversible steps addressed where applicable | BLOCK unsafe/untested recovery; request owner decision without weakening criteria |
| 5. Prepare rollout and observation plan | Approved health criteria, objectives, budgets, target topology | Define bounded stages, windows, sampling and automatic/manual stop path | Rollout stages, health rules, recovery triggers, operator ownership | Reproducible observations and sufficient target coverage; thresholds/weights have authority | BLOCK unresolved threshold/window; record alternatives for owner |
| 6. Verify release authority and effective controls | Digest, target, configuration, action, policy, approval and enforcement records | External identity/approval verification and protected gate/bypass/failure tests | Revision-bound authorization and REL-READY/REL-EXEC decisions | Required roles satisfied; coverage known; mandatory missing/error/timeout blocks affected path | BLOCK execution; no self-approval or local hook workaround |
| 7. Execute one approved stage | Passing gates and rechecked target/authority | Journal operation key, invoke scoped deployment/migration tool, retain request/receipt | Release journal and actual environment/version refs | Digest/target/configuration/action match receipt; external controls enforced; no unapproved drift | Mark FAILED/PARTIAL/UNKNOWN; stop progression and reconcile |
| 8. Observe and decide next stage | Stage receipt, health window, baseline and stop criteria | Query independent target state and telemetry; compare approved criteria | Per-stage pre/postcheck evidence and health decision | Complete window/data quality; checks satisfy policy; trace results to exact stage | FAIL observed breach; BLOCK inconclusive health; invoke authorized recovery when triggered |
| 9. Verify release outcome and hand over | All stage outcomes, final target and recovery state | Read-back deployed digest/config/schema, check postconditions; validate records | Final release record and MAINTAIN handoff | REL-POST outcome truthful; operating owner acknowledges version, risks and recovery | Keep unresolved/partial status; transfer explicit recovery ownership |

## Gates and decisions

Apply all GOV-1 status and gate rules outcomes independently; approval, execution, and verification remain separate axes.

| Gate | PASS | FAIL | BLOCKED | NOT_APPLICABLE |
|---|---|---|---|---|
| REL-INPUT: candidate eligible | Current digest/provenance and applicable TEST/control evidence satisfy policy | Observed integrity or acceptance violation | Missing/stale source, evidence, access or applicability decision | Only for an authorized preparation scope without a candidate; never promotion |
| REL-READY: target and recovery ready | Target/configuration, migration, rollout, health and recovery criteria verified | Observed unsafe incompatibility, drift or failed rehearsal | Unresolved target, windows, thresholds, recovery or enforcement | A specific subcontrol is excluded by authoritative applicability evidence; real release readiness stays applicable |
| REL-EXEC: permit named mutation | REL-INPUT/REL-READY pass; valid digest/target/configuration/action-bound authority and controls verified | Rejected/mismatched authority or demonstrated forbidden action | Absent/expired authority, failed mandatory control or unknown prior outcome | Preparation-only task has no execution requested; never an actual mutation |
| REL-POST: accept deployed outcome | All authorized stages and required health checks pass; actual version and recovery availability verified | Observed deployment/health/postcondition failure | NOT_RUN/PARTIAL/UNKNOWN, incomplete window or inconclusive evidence | Authorized task ended at preparation and no deployment occurred |

If candidate, criteria, target, policy, configuration, dependency, or environment revisions change, run GOV-1 revision and recovery rules impact analysis and revalidate dependent gates.
Choose rollback only when it is compatible with the actual data/schema state and authorized recovery scope; otherwise use the approved forward-recovery path or escalate.
Never call an artifact successfully deployed because a command exited zero, a rollout started, or another agent agreed.

## Recovery, outputs and exit

Use GOV-1 recovery and parallel-work rules operation keys and shared retry counters. Mutation retries require a resolved bounded budget and verified idempotency/reconciliation; zero retries is valid.
On timeout or lost connection, mark execution UNKNOWN, query operation receipt and target state, and reconcile before resending or advancing. A different operation key cannot evade this rule.
Stop rollout on health breaches or missing mandatory observations. Recovery is itself an authorized mutation; preserve evidence and reconcile writes before restoring backups or reversing migrations.
If recovery is unsafe/unavailable, escalate to the named release/service owner and record contained scope, actual state, unresolved risk, and next permitted action.

Produce `release-record.md` with the ART-1 envelope and typed DEPLOY data: candidate identity/provenance, target/configuration/secret refs, IaC/migration compatibility, authorization, stages/windows/health, recovery/rehearsal, checks, and journal.
Preserve stable release/decision/evidence/action IDs and links from requirement through tested candidate to deployed digest; link the final environment observations onward to MAINTAIN.
Emit the schema-valid handoff with exact output revisions, gates, failures, risks, actions/receipts, next consumer and responsible authority; validate it using ART-1 without claiming semantic proof from schema checks.
Execution exit requires REL-POST PASS, verified deployment within authorized boundaries, and available recovery with operating ownership. A preparation-only exit reports READY_FOR_REVIEW with execution NOT_RUN and mutation gates BLOCKED or justified NOT_APPLICABLE.

## Completion and evaluation

Build success, pressure, available tools or agent agreement never grants release authority. Human review follows actual policy, including authorized automation. Missing exact authority/binding, mandatory control, required recovery or reliable health evidence blocks the affected mutation. Prepared releases stay NOT_RUN; never blindly retry an unknown effect.

A handoff records responsibility and exact state; it does not end a broader assignment. Continue already authorized stages using their skills, retaining failures and reconciling unknown outcomes before retries. Evaluate relevant [cases](../../evaluations/cases.md) against frozen independent oracles. Structural validity is not action eligibility, authentic authorization or observed success.
