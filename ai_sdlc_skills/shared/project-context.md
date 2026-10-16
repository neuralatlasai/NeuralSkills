# Project context contract

Version: 2.0.0. Collect inputs for the active task; this file does not assign a project, risk class, authority or deployment environment to the reusable pack.

Use [context.json](templates/context.json) and [context.schema.json](schemas/context.schema.json). Each parameter records state, value, authority, evidence_ids, owner, blocks and rationale. Values come from actual task/repository evidence and applicable governing policy. The user/task owner can hold relevant roles where policy permits; a separate organization or formal policy document is not always necessary.

## State restoration

Context includes id, project_id and revision and required state_stores refs: manifest, ledger, trace_graph, approval_registry and execution_journal. Resolve these against the contained pinned bundle described by [ART-1](artifact-contracts.md). Each store ref names exact ID, revision and relative local location. Restore these records after compaction or handoff; do not reconstruct approval/completed actions from unsupported memory.

For a new task, initialize honest state within the authorized artifact location and record sources as inspected. No historical handoff is expected for a project that has not begun. Missing store evidence blocks claims that depend on it, while independent authorized analysis/drafting can continue.

## Resolve on use

| Input group | Parameters | Needed when |
|---|---|---|
| Intent/ownership | product_domain, stakeholder_roles, authorized_sources, scope_and_non_goals | Attributing requirements, defining affected scope or intent |
| Acceptance/priority | acceptance_policy, prioritization_policy | Choosing material thresholds/priorities or acceptance |
| Implementation | repository_state, technology_stack, toolchain | Editing, building or stack-specific contracts |
| Release | deployment_environment, release_policy | Environment-specific preparation, rollout or recovery |
| Data/law | data_classification, privacy_retention_policy, jurisdiction | Sensitive data, fixture handling or legal applicability |
| Risk/security | criticality, risk_policy, security_requirements | Selecting risk controls and required review |
| Domain controls | accessibility_applicability, safety_applicability, sector_requirements | Relevant behavior or justified exclusions |
| AI functionality | ai_product_applicability, ai_governance | Product-AI controls; AI-assisted authorship alone is insufficient |
| Operations | service_objectives, metric_definitions, alert_policy | Health, severity/alert interpretation or closure |
| Bounds | resource_budgets, retry_policy, concurrency_policy | Cost-sensitive execution, retries or concurrent writers |
| Access/authority | tool_permissions, authorization_roles, enforcement_inventory | Mutations, privilege, required decisions or external controls |
| Evidence | standards_baseline, freshness_policy, evaluation_policy | Edition choice, reused evidence or measured evaluation claims |

[gates.json](gates.json) identifies the machine-required context subset for each eligible stage action; the actual task can require additional relevant values. Sufficient task instructions, repository acceptance tests, identified local tool scope and session limits may resolve these parameters when appropriate. Do not invent enterprise approval barriers for an authorized local fix. Production/privileged/destructive actions retain their actual binding and external-control requirements.

RESOLVED needs a concrete value and evidence. NOT_APPLICABLE needs scoped rationale and applicable authority. UNRESOLVED is a visible unknown, not permission to guess or to block unrelated work. A blank template's placeholders are not findings about the active project.

Keep instantiated context, ledgers, source snapshots, receipts and review reports in the project's artifact location outside reusable definitions. On relevant changes preserve old revisions and assess affected downstream evidence under [GOV-1](governance.md). Do not carry approvals, unresolved reports or assumptions from a different project into this one.
