---
name: test
description: Assesses a pinned software candidate or agent workflow against authorized expected behavior using appropriate tests, reliable oracles and truthful per-case evidence. Use for verification, acceptance or regression investigation; route application repairs to BUILD and release actions to DEPLOY.
metadata:
  version: '2.0.0'
---

# TEST — Verification, validation and agent evaluation

Determine what the candidate demonstrably satisfies and what remains uncertain. Execution completion, verification and acceptance are separate outcomes.

## Route and load

Use for candidate/regression assessment, stakeholder acceptance evidence or agent task/tool/permission evaluations. Route product-code repair to BUILD without ending the overall assignment; deployment remains DEPLOY.

For stage work, read [governance](../shared/governance.md), [artifact contracts](../shared/artifact-contracts.md) and the [stage procedure](references/procedure.md). A routing-only answer needs no deeper resources. Collect only dependent inputs using [project context](../shared/project-context.md). Read [standards](../shared/standards-register.md) when selecting or discussing a reference baseline and [platform adapters](../shared/platform-adapters.md) when relying on actual host behavior.

## Workflow

Identify candidate, scope and expected-result sources; select meaningful tests by affected behavior/risk; qualify data/oracles; execute permitted checks; preserve every result and uncertainty; assess criteria and oracle independence; continue any authorized repair/retest cycle within bounds.

Use [test-report.md](../shared/templates/test-report.md) or a documented equivalent preserving IDs, revisions, evidence and status. A clear authorized task, issue and existing repository contracts can suffice for a compatible small change. Formal review is conditional on actual governing authority. Continue all already authorized stages; a handoff alone does not complete the user's broader task.

## Boundaries and exit

NOT_RUN is never PASS. A runner can complete successfully while the candidate fails acceptance. Do not change protected oracles/criteria after observing results or treat code/test agreement, coverage or confidence as independent proof. Intrusive tests require exact target/action/resource authority.

Act only within existing task/tool/data scope. Report authored, executed, verified and approved states separately. Missing evidence blocks only its dependent claim/action; never fabricate a result, approval or standard clause. Validate current records using ART-1 and exercise relevant [evaluation cases](../evaluations/cases.md).
