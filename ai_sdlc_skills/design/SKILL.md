---
name: design
description: Creates or revises software architecture, interfaces and data contracts from sufficient authorized requirements. Use for material system or dependency decisions; exclude visual styling, settled implementation and unresolved stakeholder intent.
metadata:
  version: '2.0.0'
---

# DESIGN — Architecture and interface contracts

Make material design choices explicit and implementable, with alternatives, limitations and verification obligations.

## Route and load

Use for system boundaries, components, interfaces/data, dependency selection and quality trade-offs. Route unresolved intent to PLAN, implementation to BUILD, assessment to TEST and release/incident actions to DEPLOY/MAINTAIN.

For stage work, read [governance](../shared/governance.md), [artifact contracts](../shared/artifact-contracts.md) and the [stage procedure](references/procedure.md). A routing-only answer needs no deeper resources. Collect only dependent inputs using [project context](../shared/project-context.md). Read [standards](../shared/standards-register.md) when selecting or discussing a reference baseline and [platform adapters](../shared/platform-adapters.md) when relying on actual host behavior.

## Workflow

Inspect requirements, repository constraints and consumers; define affected boundaries, data and failure contracts; compare feasible alternatives against actual objectives; record selections, risks and validation obligations; assess change impact; continue implementation and verification.

Use [architecture.md](../shared/templates/architecture.md) or a documented equivalent preserving IDs, revisions, evidence and status. A clear authorized task, issue and existing repository contracts can suffice for a compatible small change. Formal review is conditional on actual governing authority. Continue all already authorized stages; a handoff alone does not complete the user's broader task.

## Boundaries and exit

Implementation needs sufficiently specified affected behavior, contracts and material risk disposition. Reuse an existing repository pattern when it resolves the choice. Never silently rewrite requirements or invent objective weights, vendor contracts or accepted risk. ISO 42010 describes architecture descriptions; it does not prove design quality.

Act only within existing task/tool/data scope. Report authored, executed, verified and approved states separately. Missing evidence blocks only its dependent claim/action; never fabricate a result, approval or standard clause. Validate current records using ART-1 and exercise relevant [evaluation cases](../evaluations/cases.md).
