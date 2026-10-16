# DESIGN procedure

Version: 2.0.0. Read this for the selected stage's operational work. Shared authority, state restoration, status, retries and continuation are defined in [GOV-1](../../shared/governance.md); serialization and eligibility are in [ART-1](../../shared/artifact-contracts.md).

## Inputs and proportionality

Use sufficient task/requirements, existing architecture/interfaces, repository constraints and affected quality criteria. Missing formal files alone is not a blocker if existing contracts resolve the actual decision.

In the procedure below, authorized/approved intent, design and policy mean the sufficient current task/repository contract and any actually applicable adopted policy. Formal baselines, separate reviewers, external controls and approvals are mandatory only where governing authority requires them. Preserve adopted controls; never invent a new ceremony or bypass a material unresolved decision. Apply only relevant rows/categories. Dependencies stay ordered; independent authorized investigation can continue.

## Ordered procedure

Every row specifies the action/input, method, result, verification and failure response. Keep dependencies sequential and record unresolved branches.

| Step / action and input | Method | Resulting artifact | Verification | Failure response |
|---|---|---|---|---|
| 1. Restore authorized intent, task and prior design | Apply governance entry protocol; verify actual access and pinned approvals | Design input manifest/context | Scope, revisions, sufficient authorized intent and shared schemas match | BLOCK dependent baseline/action; continue explicitly scoped exploratory drafting |
| 2. Derive concerns and quality obligations | Map stakeholders, requirements, constraints and acceptance measures to architectural concerns | Concern/requirement map | Every in-scope requirement has a design obligation or justified exclusion | Return ambiguous intent/quality criteria to PLAN; do not supply unauthorized thresholds |
| 3. Establish boundaries and dependencies | Inspect system context, actors, external services, trust/data boundaries and dependency evidence | Context/boundary model and dependency candidates | Ownership, responsibilities and external assumptions are explicit | Flag unknown boundaries/owners; block affected contracts pending evidence |
| 4. Construct feasible alternatives | Compare options against approved objectives, constraints, risks, budgets and measured/authoritative evidence | Alternatives analysis with uncertainty and validation plan | Options are feasible or clearly unverified; no invented objective weights/performance gains | Record no feasible solution or incomparable trade-offs; escalate to authorized owner |
| 5. Specify components and interaction behavior | Assign responsibilities, state ownership, communication, concurrency and dependency direction | Component/interaction descriptions | Trace to requirements; inspect coupling, consistency and failure propagation | Revise within budget; unresolved contradictions block selection |
| 6. Define interfaces and data contracts | State schemas, versioning, validation, compatibility, identity, error/retry/timeout behavior and ownership as applicable | Interface/data contract records | Consumers/producers can interpret behavior and validation; verify external claims | Mark unknown API behavior UNRESOLVED; require authoritative inspection or experiment |
| 7. Analyze failures and conditional controls | Apply adopted threat, privacy, accessibility or safety methods when applicability warrants; inspect abuse/failure paths | Conditional analyses, risks and mitigation obligations | Authority/applicability, assumptions and residual risk owners are recorded | BLOCK material unresolved risk/control; route intent changes to PLAN |
| 8. Design deployment and operational behavior | Specify topology, configuration/secret boundaries, observability, service measures, resilience and recovery/migration compatibility | Deployment/operations design contracts | Supports approved objectives and permitted environments; recovery assumptions are testable | Seek DEPLOY/MAINTAIN evidence; block unsupported operational commitments |
| 9. Record selections and verification obligations | Write decisions with alternatives, rationale, trade-offs and evidence; assign validation method/owner for uncertain claims | Decision records and verification obligations | Decision follows approved criteria; each material claim has evidence or proposed validation | Keep disputed choice proposed; request accountable reviewer decision |
| 10. Update trace and change impacts | Add requirement-to-design/decision/interface edges; traverse existing downstream dependencies | Trace graph and impact/revalidation plan | No orphan contract; affected previous evidence marked STALE | BLOCK affected BUILD/TEST/release gates; obtain impact owner decision |
| 11. Assemble and review architecture | Populate template/envelope; validate schemas, contract consistency and requirement coverage; present exact revision | Draft architecture.md, manifest and review record | Interfaces/components/decisions agree; conditional exclusions justified | FAIL demonstrated defects; repair within budget and preserve findings |
| 12. Evaluate gates and hand off | Obtain required revision-bound design decisions; generate shared handoff | Gate/approval records and BUILD/TEST handoff | Current evidence, authority, scope and next consumer action are explicit | BLOCK missing prerequisites; return to PLAN or named resolving owner |

## Decision criteria and gates

Use the shared gate semantics; schema validity and reviewer/model confidence do not establish acceptable architecture.

| Gate / next action | PASS discriminant | FAIL discriminant | BLOCKED discriminant | Justified NOT_APPLICABLE |
|---|---|---|---|---|
| DESIGN-DRAFT / present for review | Description/contracts are consistent, traceable, schema-valid and candid about unknowns | Unsupported claims, contradictory contracts or concealed risk remain | Required shared contract, scope or inspection is unavailable | Authorized task contains no architecture authoring/revision; record routing basis |
| DESIGN-TO-BUILD / baseline implementable contracts | Approved intent is addressed; interfaces, selected alternative, risk disposition and operational obligations are sufficiently specified and authorized | Chosen design violates approved criteria, rejected decision or demonstrated feasibility constraint | Material input/contract/risk, required approval, freshness, validation or mandatory enforcement is missing | Authorized task/policy establishes no implementation handoff; never use to excuse missing evidence |
| DESIGN-CONDITIONAL / accept a conditional analysis | Applicable control is analyzed with evidence and authorized residual-risk disposition | Evidence violates an applicable security/accessibility/safety/privacy criterion | Needed applicability, analysis evidence or risk authority is unresolved | Named owner records non-applicability and its source/rationale for this scope |

Compare alternatives using approved objectives and measurements. When none dominates and weights/preferences are absent, present the trade-off to the accountable owner.
Choose reversible description details within scope; obtain the actual applicable decision authority for changes to accepted behavior, risk, cost, dependencies or environment.
If a bounded experiment is needed, specify hypothesis, environment, authorized actions, measurement, success criterion and owner before execution; record NOT_RUN until observed.
Compression into one agent session does not remove design evidence or independent review required by policy.
The exit condition is reviewable, traceable architecture/interface contracts sufficient for implementation and verification, with authorized material risk/decision disposition.
A draft can be complete for review while DESIGN-TO-BUILD remains BLOCKED; do not pass only because diagrams or contract files exist.

## Stage invariants to verify before handoff

- Every selected component/interface/decision resolves to an in-scope requirement, constraint or authorized rationale.
- Every externally consumed contract identifies ownership, version/compatibility expectations and observable error behavior.
- Every material quality claim has inspected evidence or a pending validation obligation with a named owner.
- Every rejected alternative records the actual discriminant; absent objective weights remain absent.
- Every material residual risk has an authorized disposition or blocks the affected implementation scope.
- Description views and contracts agree on boundaries, state ownership and failure/recovery behavior.
- Existing downstream consumers are tied to the new revision or explicitly invalidated; a partial review cannot clear unrelated branches.

## Outputs, ownership and handoff

Produce architecture.md using the template, its schema-valid envelope, component/interface/data records, alternatives/decisions, conditional analyses, operational contracts and trace updates.
The authoritative templates/schemas define required fields and identifiers; reuse their envelope/status fields rather than inventing a competing representation.
BUILD consumes implementable contracts, selected dependencies and restrictions; TEST consumes quality obligations, interface behaviors and claim-validation methods.
DEPLOY consumes topology/recovery/migration constraints; MAINTAIN consumes observability, failure behavior and operational assumptions when those stages apply.
The handoff records exact input/output revisions, approvals, evidence, exclusions, unresolved issues, affected downstream state, next authority and requested action.
Distinguish drafted architecture, executed experiments, verified evidence and approved decisions. An illustrative example is SYNTHETIC, not empirical support.

## Completion and evaluation

Implementation needs sufficiently specified affected behavior, contracts and material risk disposition. Reuse an existing repository pattern when it resolves the choice. Never silently rewrite requirements or invent objective weights, vendor contracts or accepted risk. ISO 42010 describes architecture descriptions; it does not prove design quality.

A handoff records responsibility and exact state; it does not end a broader assignment. Continue already authorized stages using their skills, retaining failures and reconciling unknown outcomes before retries. Evaluate relevant [cases](../../evaluations/cases.md) against frozen independent oracles. Structural validity is not action eligibility, authentic authorization or observed success.
