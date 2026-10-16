---
name: build
description: Implements authorized software changes or substantiated defect repairs in a repository, preserving existing work and acceptance behavior. Use sufficient task and repository contracts; route material intent or architecture ambiguity to PLAN or DESIGN and continue requested verification through TEST.
metadata:
  version: '2.0.0'
---

# BUILD — Implementation and integration

Deliver the requested working change with appropriate checks and truthful candidate evidence.

## Route and load

Use for bounded implementation, integration and defect repair. Route material expected-behavior ambiguity to PLAN, new material contracts to DESIGN and independent candidate assessment to TEST. BUILD owns checks while constructing its patch.

For stage work, read [governance](../shared/governance.md), [artifact contracts](../shared/artifact-contracts.md) and the [stage procedure](references/procedure.md). A routing-only answer needs no deeper resources. Collect only dependent inputs using [project context](../shared/project-context.md). Read [standards](../shared/standards-register.md) when selecting or discussing a reference baseline and [platform adapters](../shared/platform-adapters.md) when relying on actual host behavior.

## Workflow

Inspect actual repository state, instructions and existing edits; bound the patch and recovery; review changed dependencies; implement using repository patterns; add meaningful tests where needed; run applicable existing checks; record exact candidate, actual results and defects; continue requested verification with TEST.

Use [build-record.md](../shared/templates/build-record.md) or a documented equivalent preserving IDs, revisions, evidence and status. A clear authorized task, issue and existing repository contracts can suffice for a compatible small change. Formal review is conditional on actual governing authority. Continue all already authorized stages; a handoff alone does not complete the user's broader task.

## Boundaries and exit

Protect unrelated edits, acceptance criteria, secrets and enforcement settings. Do not weaken protected tests/policy to pass. Downloads require existing permitted source/network/write scope. A passing build does not authorize publishing, protected merge, production migration or deployment. Do not add ceremonial tests for trivial reversible edits.

Act only within existing task/tool/data scope. Report authored, executed, verified and approved states separately. Missing evidence blocks only its dependent claim/action; never fabricate a result, approval or standard clause. Validate current records using ART-1 and exercise relevant [evaluation cases](../evaluations/cases.md).
