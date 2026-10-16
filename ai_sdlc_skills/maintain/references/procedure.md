# MAINTAIN procedure

Version: 2.0.0. Read this for the selected stage's operational work. Shared authority, state restoration, status, retries and continuation are defined in [GOV-1](../../shared/governance.md); serialization and eligibility are in [ART-1](../../shared/artifact-contracts.md).

## Inputs and proportionality

Diagnosis needs service/task identity and permitted observations; absent objectives/owner remain visible without blocking independent observation. Mutation needs exact target/action, scoped incident/runbook/change authority, applicable controls/bounds and required recovery.

In the procedure below, authorized/approved intent, design and policy mean the sufficient current task/repository contract and any actually applicable adopted policy. Formal baselines, separate reviewers, external controls and approvals are mandatory only where governing authority requires them. Preserve adopted controls; never invent a new ceremony or bypass a material unresolved decision. Apply only relevant rows/categories. Dependencies stay ordered; independent authorized investigation can continue.

## Metrics and diagnostic discrimination

Keep these independent: an approved service objective is a target over a defined window; statistical control limits describe an explicitly calibrated process distribution; alert thresholds trigger investigation/actions under policy.
For every metric record definition/version, unit, numerator/denominator, scope, source, aggregation, window, sampling, missingness, clock alignment and owner. Do not infer success from a silent or failed monitor.
If statistical limits are used, record baseline period/population, calibration method, assumptions, seasonality handling, uncertainty and recalibration triggers; an uncalibrated "control band" is UNRESOLVED.
Compare observations with each applicable objective/limit/alert rule separately. A statistically unusual event can satisfy an objective; an objective breach need not be statistically unusual.
Test missing/late data, coverage gaps, duplicate events, changed instrumentation, and misleading aggregates before declaring degradation or recovery; distinguish observed symptom from causal hypothesis.

## Procedure

Each row is ordered unless an already authorized incident runbook explicitly permits parallel containment; retain exact tools, versions, observation times and evidence IDs.

| Step/action | Required context | Tool or method | Resulting artifact | Verification | Failure response |
|---|---|---|---|---|---|
| 1. Restore service/incident state | Context, handoff, release refs, action journal, read scope | GOV-1 entry protocol and target/receipt reconciliation | Maintenance record, scope and unresolved register | Correct service/version; prior UNKNOWN action reconciled; refs resolve | BLOCK dependent mutation; retain read-only investigation |
| 2. Qualify observations and data | Logs/metrics/traces/tickets with provenance and policies | Query approved sources; check coverage, timestamps, windows, denominators, sampling and redaction | Data-quality assessment and source-linked observations | Reproducible measurements; restricted payload stays in approved store | Mark INCONCLUSIVE/BLOCKED; repair instrumentation only if authorized |
| 3. Triage severity and escalation | Qualified observations, impact, severity policy, ownership | Compare impact to approved severity matrix; notify only through authorized channels | Incident/maintenance classification, owner and escalation record | Severity rationale cites policy/evidence; alert does not imply write authority | UNRESOLVED label if policy absent; transfer to named owner without inventing urgency rules |
| 4. Diagnose competing explanations | Baseline, changes, dependencies, traces and hypotheses | Bounded correlation, controlled reproduction, read-only comparison; distinguish causality from correlation | Hypothesis log with supporting/refuting evidence and unknowns | Alternatives considered; data-quality issues ruled in/out; sensitive data handling valid | Stop at investigation bound; escalate evidence gaps instead of claiming root cause |
| 5. Compare remediation and change routes | Supported finding, objectives, risk/authority, recovery options | Compare no-change/containment/patch/configuration/rollback/forward recovery against approved criteria | Decision and linked change proposal or runbook action | Trace finding to baseline; chosen path fits scope, compatibility and risk | Return intent/contracts to PLAN/DESIGN; BLOCK unauthorized action |
| 6. Qualify action and execute within scope | Passing MNT-ACTION, exact target, approved runbook/change and controls | Recheck authority; journal operation key; use scoped tool and capture receipt | Action journal, actual state refs and execution result | Request/receipt match approved target/action; effective controls and budget hold | FAILED/PARTIAL/UNKNOWN; reconcile before any retry; use authorized recovery |
| 7. Verify outcome against need | Before/after evidence, resolution oracle, windows, regression checks | Independent target read-back, TEST/DEPLOY evidence where relevant, metric/data-quality reassessment | Resolution findings, regression results and residual risks | Complete comparable windows; symptom/cause criteria assessed; no aggregate hides failures | FAIL observed regression; BLOCK incomplete/inconclusive evidence; reopen diagnosis |
| 8. Address vulnerabilities/dependencies/retirement | Applicable advisories, dependency exposure, support/license obligations or retirement policy | Verify affected versions/reachability; compare updates; assess shutdown, data disposition and integrations | Maintenance proposal, justified exclusion or retirement plan | Authoritative advisory applicability; fixes verified; retention/recovery/owner obligations addressed | Route updates through BUILD/TEST/DEPLOY; BLOCK destructive retirement without authority |
| 9. Close or explicitly transfer ownership | Findings, risks, actions, verification and receiver | Apply MNT-CLOSE; validate ART-1 record/handoff and obtain authorized acceptance | Maintenance record, change/intent links, owner transfer and handoff | Resolution proof or named receiver's acceptance of unresolved state/risk; exact revisions retained | Keep open/BLOCKED when neither condition is evidenced |

## Gates and decisions

Apply GOV-1 status and gate rules separately to these gates; an accepted transfer is different from verified service recovery.

| Gate | PASS | FAIL | BLOCKED | NOT_APPLICABLE |
|---|---|---|---|---|
| MNT-DATA: observation usable | Provenance, coverage, windows and quality satisfy its approved use | Demonstrated measurement corruption or quality violation | Unknown lineage/coverage/window or unavailable evidence | A specific telemetry category is authoritatively excluded for the scoped task; never excuse missing needed evidence |
| MNT-DIAG: finding actionable | Evidence supports the bounded diagnosis/change proposal and policy-based triage | Claimed cause or severity contradicted by evidence/policy | Required baseline, discriminating evidence or severity authority absent | Authorized evidence-preserving intake/transfer needs no causal conclusion; state that limitation |
| MNT-ACTION: permit named mutation | Exact target/scope, applicable stage gates, authority, recovery and external controls verified | Observed forbidden action, rejected grant or compatibility violation | Missing/expired authority, unavailable control, unresolved budget or UNKNOWN prior effect | Analysis/proposal-only scope contains no mutation; never for a production write |
| MNT-CLOSE: complete or transfer objective | Verified resolution meets approved closure criteria, OR authorized receiver explicitly accepts linked unresolved state/risk | Current evidence contradicts closure claim or transfer is rejected | Incomplete window, inconclusive verification, missing closure policy/owner acceptance | Specific subcriterion excluded by authority; an actual closure decision stays applicable |

Containment success is not root-cause proof; incident closure does not silently close linked defects. Preserve unresolved risks and approved baseline until their owners act.
For a substantiated requirement gap, create a proposal with observation/evidence IDs, affected requirement/design/release revisions, alternatives, proposed acceptance criteria and authorized decision owner; route to PLAN.

## Recovery, outputs and exit

Apply GOV-1 recovery and parallel-work rules bounds, operation keys, single-writer ownership, cancellation and retries across sessions/workers. Missing bounds block automatic mutation retries and parallel writes.
For lost receipts/timeouts mark UNKNOWN, query target state, and reconcile before resending. A remediation is idempotent only with verified tool semantics or explicit reconciliation.
If remediation worsens health, stop its rollout and follow the approved compatible compensation/recovery runbook; never delete unrelated changes or reverse irreversible data changes blindly.
Escalate when diagnosis budgets expire, severity/authority conflicts, sensitive-data access is unresolved, or safe recovery is unavailable. Preserve diagnostic evidence and identify the next accountable owner.

Produce `maintenance-record.md` with the ART-1 envelope and typed MAINTAIN data: service/release refs, metrics/objectives/limits/alerts/windows, quality/observations, severity/diagnosis, authority/actions, verification, vulnerabilities/dependencies, proposals, retirement and transfers.
Link each production observation back to exact release/test/change/requirement revisions and forward to substantiated proposals; preserve history and invalidate impacted downstream evidence under GOV-1 revision and recovery rules.
Emit a schema-valid handoff to PLAN/BUILD/TEST/DEPLOY or the service/incident owner, identifying unresolved items, actual action outcomes/receipts, gate status and next authority.
Exit with verified resolution evidence or explicit accepted ownership/risk transfer. For transfer, preserve unresolved service verification as INCONCLUSIVE/FAILED as supported; do not report the incident resolved.

## Completion and evaluation

An alert grants no production authority. Distinguish objectives, calibrated statistical limits and alert thresholds. Missing objectives allow observations but prevent invented health pass/fail; missing severity policy prevents invented labels. Communicate only as authorized. Close with supported resolution or explicit accepted unresolved ownership/risk; transfer is not resolution. ISO 14764 does not mandate operational backup/recovery controls.

A handoff records responsibility and exact state; it does not end a broader assignment. Continue already authorized stages using their skills, retaining failures and reconciling unknown outcomes before retries. Evaluate relevant [cases](../../evaluations/cases.md) against frozen independent oracles. Structural validity is not action eligibility, authentic authorization or observed success.
