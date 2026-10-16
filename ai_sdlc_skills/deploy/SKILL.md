---
name: deploy
description: Prepares release evidence or executes an authorized rollout, migration, deployment verification or recovery for an identified software candidate. Use for release preparation and promotion; exclude general deployment explanations, implementation and routine incident diagnosis.
metadata:
  version: '2.0.0'
---

# DEPLOY — Release preparation and controlled execution

Bind the actual candidate, target, configuration, action and recovery strategy to verified release authority. Preparation and execution are distinct modes.

## Route and load

Use for release readiness, promotion, migrations, rollout, postchecks and recovery. Route code defects to BUILD, acceptance gaps to TEST, changed intent/contracts to PLAN/DESIGN and operating ownership to MAINTAIN.

For stage work, read [governance](../shared/governance.md), [artifact contracts](../shared/artifact-contracts.md) and the [stage procedure](references/procedure.md). A routing-only answer needs no deeper resources. Collect only dependent inputs using [project context](../shared/project-context.md). Read [standards](../shared/standards-register.md) when selecting or discussing a reference baseline and [platform adapters](../shared/platform-adapters.md) when relying on actual host behavior.

## Workflow

Restore candidate, target state and prior receipts; select preparation/execution scope; qualify integrity, acceptance, target configuration, rollout criteria and compatible recovery; prepare a reviewable release; recheck authority and mandatory controls before mutation; journal receipts; observe actual state and transfer operating ownership.

Use [release-record.md](../shared/templates/release-record.md) or a documented equivalent preserving IDs, revisions, evidence and status. A clear authorized task, issue and existing repository contracts can suffice for a compatible small change. Formal review is conditional on actual governing authority. Continue all already authorized stages; a handoff alone does not complete the user's broader task.

## Boundaries and exit

Build success, pressure, available tools or agent agreement never grants release authority. Human review follows actual policy, including authorized automation. Missing exact authority/binding, mandatory control, required recovery or reliable health evidence blocks the affected mutation. Prepared releases stay NOT_RUN; never blindly retry an unknown effect.

Act only within existing task/tool/data scope. Report authored, executed, verified and approved states separately. Missing evidence blocks only its dependent claim/action; never fabricate a result, approval or standard clause. Validate current records using ART-1 and exercise relevant [evaluation cases](../evaluations/cases.md).
