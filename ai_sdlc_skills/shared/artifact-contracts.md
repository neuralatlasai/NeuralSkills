# Artifact and handoff contracts

Contract ID: ART-1. Version: 2.0.0. Authority: [GOV-1](governance.md). Pack filenames/formats are conventions, not standard-mandated information items. Equivalent task/issue/repository artifacts are allowed through a documented mapping preserving identity, revision, evidence, status and affected decision content.

## Serialization and common records

The selected dialect is [JSON Schema 2020-12](https://json-schema.org/draft/2020-12). Schemas resolve locally; validation does not fetch network resources. Definitions live in [common.schema.json](schemas/common.schema.json). A Markdown stage artifact contains one fenced JSON record conforming to [artifact.schema.json](schemas/artifact.schema.json); prose cannot override its status. Context uses [context.schema.json](schemas/context.schema.json), transfer [handoff.schema.json](schemas/handoff.schema.json).

A revision identifies immutable commit/document version or content digest. UNRESOLVED is legitimate incomplete/unknown state, not proof for a dependent eligible action. IDs are stable within the project namespace; preserve old revisions/history and do not reuse retired IDs.

| Record | Required semantic content |
|---|---|
| ref | id, revision, location; resolve exact bytes/version, not a mutable latest label |
| evidence | id, claim_class, kind, source ref, observed_at, observer, method, execution, result, limitations, classification, retention_policy |
| issue | id, statement, owner, blocks, resolution, evidence_ids; blocks names stable action IDs, canonical gate IDs or * |
| decision | id, revision, question, alternatives, selection, rationale, authority, evidence_ids |
| control | id, authority_type, authority ref, applicability, owner, enforcement, coverage, bypass_paths, timeout, error_policy, proof_ids |
| gate | id, stable action, outcome, criteria, input_refs, control_ids, evidence_ids, owner, rationale, applicability_authority |
| approval | id/revision, status, authority, policy ref, scope, artifact_refs, actions, target_refs, configuration_refs, expires_at, evidence_ids |
| trace | from/to refs, relation, evidence_ids, state CURRENT/STALE/GAP, reason |
| action | operation_key, stage, task_id, action, subject_ref, target, target_ref, configuration_refs, authorization_ref, input_revision, execution, receipt, retries_used, evidence_ids |

Evidence time is an offset ISO 8601 timestamp or explicitly unresolved where allowed. Approval expiry is an offset timestamp, or NONE only with policy-backed non-expiry. Subject/candidate, target, configuration and stable action bindings must match the actual requested operation. Approval snapshots must match the authoritative registry; genuine identity/authority and effective enforcement require external verification beyond JSON.

## Pinned state bundle

Context v2 includes id alongside project_id and revision, plus state_stores refs named manifest, ledger, trace_graph, approval_registry and execution_journal. These locate the authoritative state; embedded arrays are revision-bound snapshots, never competing ledgers.

The manifest/bundle has schema_version, id, revision and records. Each record contains kind, a ref with id/revision/location and sha256 of the exact file bytes. Locations are relative to the bundle root. The context manifest ref identifies the bundle itself; other state-store refs identify indexed store records. Keep the bundle's own identity in its root fields rather than recursively hashing itself. Store files include schema_version, id and revision plus their payload:

| Store | Payload |
|---|---|
| ledger | evidence, controls, requirements, decisions, issues |
| trace_graph | trace |
| approval_registry | approvals |
| execution_journal | actions |

Index the context, stage artifacts, handoffs, stores and other referenced local evidence files using the validator's supported record kinds. Reconcile each reference by ID/revision and bytes. Action subject_ref.revision must equal input_revision; stage/task/subject bindings prevent reuse of another operation receipt. Duplicate/undefined IDs, conflicting snapshot content, mismatched revision/digest or unresolved required links block dependent eligibility. Bootstrap from honest templates; do not fabricate missing approvals, receipts or successful execution to populate the bundle.

The validator permits only contained local relative file locations for this offline bundle: no network fetch, symlink escape or path traversal. Retain external evidence as scoped redacted source references and inspected local records. A local record of an external approval does not authenticate the external approval.

## Stage records and handoff

Every stage artifact includes schema_version, id/revision/task_id/stage/synthetic, independent status axes, input_refs, approval, evidence, controls, decisions, unresolved, gates, trace, history and typed data. Keep every canonical gate from [gates.json](gates.json); drafts can remain BLOCKED. Empty arrays mean data not supplied, not a justified exclusion.

| Stage / template | Essential typed data and consumer |
|---|---|
| PLAN: [intent.md](templates/intent.md) | Attributed sources; pain/need/solution distinction; scope/non-goals; stable requirements and measurable criteria; constraints/risks/conflicts/priority; DESIGN/TEST consume sufficient authorized intent |
| DESIGN: [architecture.md](templates/architecture.md) | Boundaries/components; affected interfaces/data/failure/compatibility contracts; alternatives/decisions; conditional analyses; operating/quality obligations; BUILD/TEST consume implementable contracts |
| BUILD: [build-record.md](templates/build-record.md) | Repository/base/head and owned scope; implementation; changed dependencies/licenses; toolchain/model/skill versions; checks; actual produced digests/provenance; docs/defects; TEST consumes exact candidate |
| TEST: [test-report.md](templates/test-report.md) | Candidate/environment; criteria/policy; matrix/exclusions; oracles/data; windows/repetitions where applicable; actual per-run results, defects/coverage; consumers receive truthful acceptance evidence |
| DEPLOY: [release-record.md](templates/release-record.md) | Candidate, target/configuration and secret refs; authority; IaC/migration compatibility; rollout/windows/health; required recovery/rehearsal; actual pre/postchecks/journal; MAINTAIN receives actual version and ownership |
| MAINTAIN: [maintenance-record.md](templates/maintenance-record.md) | Service/release; definitions/objectives/limits/alerts/windows/data quality; observations/diagnosis; authority/actions/verification; vulnerabilities/dependencies/proposals/retirement/transfer; consumers receive substantiated linked changes |

Detailed records use explicit IDs and bounded-purpose details maps. Schema shape alone cannot establish all interface or risk semantics; the stage procedure supplies that assessment. Include only applicable content and support exclusions. A trivial compatible fix may map its existing task/repository contracts instead of creating unnecessary new product decisions.

Handoff v2 adds id, revision and synthetic to task_id/stage, input/output refs, evidence, controls, decisions, unresolved, gates, trace, actions, next_consumer, next_authority, requested_action and status. The execution journal retains stage operations even where typed stage data has no journal. No output yet means empty output_refs with an honest issue, not a fabricated artifact. Receiver restores pinned state, verifies revisions and continues already authorized work.

## Structural validation and action eligibility

From the pack directory:

    python -B scripts/validate_pack.py --self-test
    python -B scripts/validate_pack.py --mode structural --instance PATH --schema artifact
    python -B scripts/validate_pack.py --mode eligible --action ACTION --instance PATH --schema artifact --bundle BUNDLE

Use schema context or handoff for those record types. Structural is the default and accepts honest incomplete drafts; it checks format and contradictions without passing a lifecycle gate. Eligible requires an explicit supported stable action and pinned local bundle. The action choices are draft, baseline, prepare, execute, accept, close and handoff; stage applicability and required gate subsets are defined in gates.json. An unsupported stage/action is an error. Draft and DEPLOY prepare do not require downstream passing gates.

Before execution, validate the execute action; after observation, assess accept/close/handoff as applicable. Never require post-execution evidence to grant a pre-execution action. Conversely, precheck success cannot prove postconditions. Use --at with an offset ISO timestamp only for reproducible expiry testing; ordinary omission uses current UTC.

A zero exit from eligible means the selected machine-checkable consistency conditions passed at the supplied time. It does not authenticate approvals, inspect normative clauses, establish real test results, prove external controls, authorize release or replace the responsible decision-maker. Retain stdout/stderr and exit status as validation receipts.

Use Python -B for helper execution/imports to avoid bytecode outside evaluation write scope. Development dependencies are pinned in [requirements-dev.txt](../requirements-dev.txt). Their installation belongs in an authorized isolated environment, not global configuration.

## v1 compatibility

Version 2.0.0 is a breaking record-contract change. Do not relabel a v1 record by editing only schema_version. Preserve the immutable old bundle and its historical receipts. Migrate into a new location, adding canonical gate inventories, explicit store refs, bundle identities/digests, handoff identities and exact approval/action bindings from real evidence. Unknown fields stay unresolved and affected gates stay blocked.

Run structural validation first, then action eligibility only when the new pinned state is sufficient. Rerun affected behavioral/host checks; old passes remain historical. Rollback restores the prior complete pack plus compatible records without rewriting history. A pack rollback does not reverse application or database side effects; those require their authorized compatible recovery procedure.
