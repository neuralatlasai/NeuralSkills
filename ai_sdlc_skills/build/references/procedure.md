# BUILD procedure

Version: 2.0.0. Read this for the selected stage's operational work. Shared authority, state restoration, status, retries and continuation are defined in [GOV-1](../../shared/governance.md); serialization and eligibility are in [ART-1](../../shared/artifact-contracts.md).

## Inputs and proportionality

Before a dependent edit, resolve affected behavior from task/issue and repository contracts, actual write scope and reliable repository state. A compatible small fix can use existing authorized task/tests/architecture; no newly authored lifecycle paperwork is required.

In the procedure below, authorized/approved intent, design and policy mean the sufficient current task/repository contract and any actually applicable adopted policy. Formal baselines, separate reviewers, external controls and approvals are mandatory only where governing authority requires them. Preserve adopted controls; never invent a new ceremony or bypass a material unresolved decision. Apply only relevant rows/categories. Dependencies stay ordered; independent authorized investigation can continue.

## Procedure

Run rows in order; parallelize only disjoint work authorized under GOV-1 recovery and parallel-work rules. Each row records evidence and advances only when its dependent gate is eligible.

| Step/action | Input/context | Method/tool | Resulting artifact | Verification | Failure response |
|---|---|---|---|---|---|
| 1. Restore and qualify the task | Context, incoming handoff, policies, approval records | GOV-1 entry protocol; inspect real tool scopes and refs | BUILD entry record; input manifest; unresolved issues | Revisions, required roles, authorization and enforcement resolve | BLOCKED for missing scope/evidence; continue permitted analysis only |
| 2. Inspect the repository | Authorized base and actual working tree | Read instructions through verified host conventions; inspect files, manifests, history and existing edits | Base/head refs; ownership map; relevant instruction refs | Correct repository/base; unrelated user edits identified; instructions grant no privilege | Stop writes on wrong base or conflict; reconcile with change owner |
| 3. Bound the patch and checkpoints | Requirements, interfaces, defect evidence, budgets | Map requirement/design IDs to owned paths; choose reversible units and recovery points | Change plan; trace edges; action keys; expected check list | Scope realizes approved behavior without unapproved design decisions | Route intent ambiguity to PLAN, contract gaps to DESIGN, scope expansion to owner |
| 4. Review dependencies and licenses | Manifests, lockfiles, approved sources and policy | Inspect changed/relevant dependency versions, provenance, compatibility, license terms and vulnerability evidence using authorized tools | Dependency/license review; selected versions; unresolved risks | Applicable license/security policy satisfied; lockfile changes explained | FAIL for demonstrated violation; BLOCKED for missing terms/decision; do not silently substitute |
| 5. Establish meaningful acceptance checks where needed | Frozen criteria and independent source/oracle refs | Reuse adequate existing checks; add meaningful positive, negative or boundary checks where needed from task/specification evidence; obtain independent review only where required | Test additions; source/oracle links; baseline test digest | Expected results have an upstream basis; protected criteria/test baselines unchanged | BLOCKED for unknown oracle; suspected acceptance error goes to its owner |
| 6. Implement the bounded change | Authorized patch plan, coding/security rules, interfaces | Edit owned files; use repository tools and approved patterns; review generated code and sensitive-data handling | Owned patch; implementation links; generated-source provenance | Diff matches scope and contracts; no protected-control weakening or leaked secret | FAIL and correct within scope; invalidate affected checks on any change |
| 7. Analyze code and integrate | Patch, selected toolchain, required analysis/check policy | Run applicable lint/type/static/security checks, unit tests and integration/contract checks; capture actual commands and outputs | Per-check results; defects; integration evidence | Required checks actually ran against candidate revision; findings retained | NOT_RUN for unexecuted checks; FAIL for violations; BLOCKED/INCONCLUSIVE for unavailable or unreliable checks |
| 8. Build and identify the candidate | Verified patch, build configuration and dependencies | Execute the applicable repository build/package process where relevant; identify exact source/candidate and compute digests for artifacts actually produced | Candidate artifacts; build logs; provenance manifest | Any required build succeeds; actual source/output identity and inputs resolve; reproducibility limits recorded | Preserve failure/logs; bounded retry only after cause and state reconciliation |
| 9. Review documentation and change provenance | Candidate, docs, trace graph and tool observations | Update relevant usage/interfaces/operations docs; record toolchain/dependency/model/skill versions and generated artifacts | Updated docs; build record; version/provenance inventory | Record observable versions exactly; unavailable model IDs marked UNRESOLVED; docs reflect actual behavior | BLOCK affected reproducibility/acceptance claim if critical version/provenance absent |
| 10. Assess gates and deliver | Current candidate, all results, approvals, outstanding defects | Review every criterion and trace edge; validate record schemas; create revision-bound transfer | Gate records; final build record; handoff to TEST | Every scoped requirement has implementation/test obligation; defects satisfy disposition policy; no missing result presented as success | FAIL routes repair; BLOCKED transfers exact missing conditions; neither authorizes release |

For every executed check retain command/tool version, candidate revision, environment, observation time, exit/result, evidence locator, limitations and defect links.
Each defect identifies the violated criterion, affected revision, reproducer/evidence, impact, owner and disposition; unresolved severity is not a low-risk default.

Choose a smaller patch or split integration when the authorized review/resource budget cannot cover the proposed change. Record the remaining work and preserve required checks.

Acceptance tests and code produced together share potential errors. Test agreement is supporting evidence only; TEST must assess oracle provenance and required independence.
When a baseline changes, stop dependent work and perform GOV-1 revision and recovery rules impact analysis. Do not reuse green results from the previous candidate without justified revalidation.

## Stage gates

Apply GOV-1 status and gate rules to each gate and each required check; record owner, criteria, input revisions, evidence and external enforcement details, including bypass paths and timeout/error policy.

| Gate/action | PASS | FAIL | BLOCKED | Justified NOT_APPLICABLE |
|---|---|---|---|---|---|
| BUILD-ENTRY: mutate authorized repository scope | Sufficient task/repository intent/design contracts and change scope authorized; access, required controls and recovery boundaries verified | Proven unauthorized scope, conflicting baseline or violated policy | Missing material contract, authority, scope, access, required enforcement or reliable repository state | Authorized applicability decision says BUILD does not apply; route to the appropriate stage |
| BUILD-CANDIDATE: identify a checked candidate | Applicable build/analysis/test/license checks executed successfully on this revision; defect disposition meets approved policy | A check or policy criterion demonstrably fails, including protected-test weakening | Required check NOT_RUN, stale, unreliable, unavailable, or missing required policy/decision | A named check is excluded by authorized risk/applicability evidence; assess remaining checks |
| BUILD-HANDOFF: offer candidate to TEST | Candidate digest/provenance, docs, trace links, current check evidence and explicit defects are reviewable and policy-eligible | Candidate/record contradicts its baseline, integrity or a required handoff criterion | Artifact identity, evidence, required decision or downstream obligation unresolved | Only when authorized routing establishes no implementation handoff is needed; never imply a completed build |

A FAIL or BLOCKED result can be handed off for investigation with the limitation explicit; it cannot be presented as an accepted candidate or a passed exit gate.

## Completion and evaluation

Protect unrelated edits, acceptance criteria, secrets and enforcement settings. Do not weaken protected tests/policy to pass. Downloads require existing permitted source/network/write scope. A passing build does not authorize publishing, protected merge, production migration or deployment. Do not add ceremonial tests for trivial reversible edits.

A handoff records responsibility and exact state; it does not end a broader assignment. Continue already authorized stages using their skills, retaining failures and reconciling unknown outcomes before retries. Evaluate relevant [cases](../../evaluations/cases.md) against frozen independent oracles. Structural validity is not action eligibility, authentic authorization or observed success.
