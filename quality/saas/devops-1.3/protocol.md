# DevOps extension evaluation

Version 1.3 adds three on-demand procedures. It remains one flat installable skill. Evidence here is authoring work, not agent default context.

Freeze the skill, task fixtures and acceptance before collecting results. D01 and D02 each receive one baseline and one skill-enabled fresh context with the same inherited model configuration, tools, raw inputs and limit of six tool calls/240 seconds. Baseline cannot read the skill or prior outputs; enabled starts at roles/saas/SKILL.md. No target deployment is permitted. Exact model revision/tokens/cost are unavailable. Capture actual tool counts when exposed; do not infer them from final prose.

D01 modifies Kubernetes configuration and produces runtime.json plus report.md. D02 produces decision.json plus report.md. Their checker evaluates explicit invariants, not a quality score. Use an independent source review for mechanism correctness and evidence boundaries. Each comparison is single-run, so it cannot establish superiority or statistical confidence. D03 is held out from tuning: produce an HPC recovery contract from raw input without showing criteria to the acting agent. Activation uses six positive/six negative compact prompts in a single fresh context, not twelve independent contexts.

Commands from repository root:

```
node quality/saas/validate-saas.mjs
node quality/saas/devops-1.3/check.mjs D01 quality/saas/devops-1.3/trials/D01-skill
node quality/saas/devops-1.3/check.mjs D02 quality/saas/devops-1.3/trials/D02-skill
```

Run equivalent baseline commands with `D01-base`/`D02-base`. An unchanged unsafe D01 fixture and an infeasible D02 decision must fail; preserve all failures. Local render/parse/arithmetic checks do not establish Kubernetes admission, provider behavior, recovery time, GPU performance or global reliability. Docker engine unavailable, no cloud/cluster/scheduler authorization/configuration: those checks remain UNVERIFIED. Retain version/capability receipts and raw command output.
