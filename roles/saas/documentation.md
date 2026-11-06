# Produce reviewable engineering records

Use for requested specifications, architecture/decision records, procedures and verification reports. Preserve an applicable project template first. These are repository conventions informed by [standards](standards.md) and published [engineering guidance](source-register.md#documentation-profile), not an official IEEE template or conformance assessment. Scale content to the change: a component correction needs one short record; a complex application or cloud/HPC change may need linked records. Do not generate every document type automatically.

## 1. Identify the record

State title/ID, purpose/audience/scope, revision/date and relevant build/configuration baseline. Record owner or UNASSIGNED and actual lifecycle/review status; never invent assignment, acceptance or approval. Mark supplied requirements, observed facts, assumptions, decisions and measurements distinctly. Link authoritative sources instead of duplicating their contents. Administrative metadata records the project's existing process; it creates no new permission gate.

## 2. Specify verifiable requirements

Use `requirement ID | source/type | condition and required behavior | acceptance/limit | verification/evidence`.

Keep requirements individually testable, unambiguous and stable across revisions. Include applicable audience/tasks, constraints, interfaces, quality targets and exclusions; justify unresolved assumptions and their consequence. Separate required outcomes from a chosen implementation. Missing thresholds stay unresolved or explicitly proposed; do not fabricate requirements to fill a template. A proposed requirement is not an accepted commitment.

## 3. Describe architecture and decisions

Identify the system/entity, boundaries, stakeholders and relevant concerns. Select only useful views: task/content structure, component/interface, data/state/authority, deployment/failure or another justified viewpoint. Show relationships and ownership consistently across views; link related requirement IDs.

For consequential choices record `decision ID | context/options | decision/status | rationale/tradeoffs | operating limits/failures | verification | consequences/reconsideration`. Record why rejected options were unsuitable. A decision record supports the architecture description; it does not replace needed views. Supersede material decisions explicitly and preserve the original rationale. Routine compatible edits need no separate ADR.

## 4. Write executable procedures

State trigger/objective, execution host/OS/shell, tool/version, working directory, exact target and prerequisites. Use numbered action-first steps; locate the action before its command when host/context is ambiguous. Give one independently verifiable action per step; a wrapper must preserve each consequential child result.

For each consequential command retain exact arguments, side effects/authority, deadline, expected exit/output, postcondition and stop/recovery path. Distinguish syntax/render checks, remote validation, mutation and operating acceptance. Use real established values, or label unresolved placeholders as prerequisites rather than ready-to-run commands. Check version-specific flags; adapt [DevOps procedures](devops.md#environment-and-command-procedure) for cloud/HPC. An example or planned command is not an execution receipt.

## 5. Report verification and traceability

Record `test/requirement ID | artifact/build/environment/data | method/steps | expected | actual | status | evidence/defect/rerun`.

Use PASS, FAIL, UNVERIFIED or NOT_APPLICABLE with a reason. Preserve initial failures and distinguish a proposed test from a run. Keep raw output/conditions available; summarize only the evidence needed for review. Record manual/automated coverage and measurement populations separately using [verification](verification.md).

Maintain the chain `requirement -> source/assumption -> decision -> artifact/baseline -> verification -> result`. IDs and links must resolve, contradictions must be reconciled, and changed decisions must update affected artifacts. A requirement without evidence stays unverified; a passing unrelated check cannot close it.

## 6. Keep records useful

Use descriptive headings, concise active sentences, semantic Markdown and focused tables for comparisons/traceability. Diagrams need defined notation and accompanying explanation when they add value. Keep current procedures synchronized with code/configuration changes; retain historical decisions/evidence with their baseline. Review when requirements, interfaces, supported versions or failure assumptions change. Remove duplicated operational guidance, empty template sections and unsupported claims; preserve required failure/history evidence. Completeness means relevant information is reviewable, not that every heading is filled.
