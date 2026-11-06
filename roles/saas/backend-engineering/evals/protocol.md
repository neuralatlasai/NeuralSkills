# Backend skill evaluation protocol

This authored suite is not executed trial evidence. It is separate from the integrated HTTPS fixture; that fixture's result cannot establish skill-level agent behavior.

## Freeze and isolate

Before scoring, freeze SKILL.md and linked references/assets/scripts plus cases.json, activation.json, rubric.json, protocol.md, skill-fixtures and heldout. Record repository revision or uncommitted-file list and sorted relative-path SHA-256 manifest at evals/evidence/skill-suite-freeze.json. PowerShell Get-FileHash -Algorithm SHA256 exists. Record actual hashes. No nonexistent evaluation runner is prescribed: the coordinator launches fresh agents with available tools and independently preserves their outputs.

B05/B06 are sealed author-held-out tasks. Do not read heldout/B05.json, heldout/B06.json, their fixtures or heldout/grading.json during instruction tuning. Public cases contain pointers only. After freeze release held-out tasks only for final skill-only runs. Keep grader probes hidden from task agents even then. A later skill/fixture/rubric change creates a new suite version and requires affected reruns; do not silently mix versions.

Each implementation agent receives the common wrapper, its task, requirement IDs AND plain meanings, and exactly its named raw fixtures. Baseline receives no backend skill, linked content, prior outputs or parent-history fork. Skill adds only the frozen skill and needed linked content. Withhold evaluator probes, suspected fixes, other tasks, solutions and tuning notes. Copy originals into isolated trial/artifact before modification; preserve originals for diffs. Agents create their own verification.

## Runs and resource limits

Use the same inherited model/version/reasoning, tools, machine, dependencies, task wrapper and budget in both arms; no model/reasoning override. Each trial has a 360-second wall-clock and 20-tool-call cap; record stricter host limits. Stop at either limit, preserve partial artifacts and mark required unobserved behavior UNVERIFIED. A task-agent invocation of an external tool counts as a call; when a wrapper batches several operations, record underlying operations separately where exposed. Preserve actual host wrapper and nested-operation counts, not an invented estimate.

Predeclared order: B01 baseline1, skill1; B02 skill1, baseline1. B03/B04/B05/B06 each run once skill-only. Total: four comparative trials and four skill-only trials, each a fresh context with no history fork. This design shows individual outcomes, not broad superiority or statistical confidence. Keep every trial without best-of selection.

Activation is separate: twelve fresh routing contexts see only frozen name/description and one prompt, without expected labels. Record raw selections and exact TP/FN/FP/TN counts. Incidental UI, unrelated writing and conceptual backend terminology do not establish activation.

## Common task wrapper and output

Tell agents to work only in their isolated trial directory, use supplied local built-ins and real SQLite, preserve contracts/hooks and deliver working changes with reproducible checks. Supply every case requirement ID and its plain meaning. Do not supply hidden grader checks. Require trial/artifact plus trial/result.json:

```json
{
  "caseId": "B01", "arm": "baseline", "run": 1,
  "route": "actual selected execution route",
  "coverageDispositions": [{"area":"L01","disposition":"OUT_OF_SCOPE","component":"loopback fixture","reason":"task-specific reason","evidence":[]}],
  "requirements": [{"id":"B01-R01","status":"UNVERIFIED","evidence":[]}],
  "decisions": [{"requirement":"B01-R01","mechanism":"implemented/recommended mechanism","limit":"operating boundary","failure":"failure mode","verification":"actual check/result or unverified"}],
  "checks": [{"id":"local-check-1","status":"UNVERIFIED","command":"actual command if executed","exitCode":null,"evidence":[],"kind":"runtime|static|measurement|unavailable"}],
  "evidence": [], "assumptions": [], "limitations": [],
  "startUtc": null, "endUtc": null, "elapsedSeconds": null,
  "actualTokens": null, "tokenAvailability": "not exposed",
  "actualCost": null, "costAvailability": "not exposed",
  "toolCalls": null, "toolCallAvailability": "orchestrator records observed count",
  "limits": {"wallSeconds":360,"toolCalls":20,"breaches":[]}
}
```

Include all 24 coverage dispositions exactly once, with concise proportional evidence/reasons. These differ from acceptance statuses. Only PASS, FAIL, UNVERIFIED, NOT_APPLICABLE are valid check statuses; no aliases. Required omitted behavior cannot be NOT_APPLICABLE.

Authoritative start/end/time, model/settings, host token/cost counts and observed tool counts belong to the coordinator. Agent leaves unavailable values null; coordinator writes trial/meta.json without rewriting raw result.json. Never estimate executed tokens or cost. Preserve trial/artifact, result, commands/stdout/stderr, initial failures and repaired outputs, and final hashes. Record runtime/SQLite versions and permissions.

## Actual fixture entry points

From a copied case directory these commands exist:

- B01: `node service.mjs` starts loopback HTTP and prints port; agent creates HTTP/reopen tests.
- B02: `node probe.mjs race.sqlite` runs controlled asynchronous race and prints persistent state. Use fresh files for independent probes; agent creates rollback/validation tests.
- B03: `node seed.mjs parcels.sqlite` then `node bench.mjs parcels.sqlite` supplies actual plans and three samples per tenant. Preserve baseline before edits and after after task-created reproducible index application. Do not reduce seed/cardinality or alter benchmark semantics.
- B04: `node worker.mjs jobs.sqlite --seed --crash-after-effect` intentionally exits 73; `node worker.mjs jobs.sqlite` executes restart. Preserve both and actual persisted state; agent creates other identity/failure tests.
- B05/B06: sealed READMEs supply entry points after freeze; agents create their verification and record exact executed commands.

No network installation is required. Node 24 node:sqlite is required; record actual SQLite version. TypeScript is optional. These small HTTP tasks do not establish TLS or production support; integrated HTTPS evidence is maintained separately.

## Independent review and report

A fresh evaluator receives the case, frozen rubric, hidden grading probes and artifact. Hide arm/skill/run metadata and agent result until initial objective observations when feasible; record broken blinding. Dynamic SQLite/HTTP/race/crash/recovery checks require execution. Keep evaluator records separate and unblind afterward to authenticate reported evidence. Self-reported PASS is not evaluator PASS.

Apply function, authorization, boundedness, persisted correctness, compatibility/scope and truthfulness gates. No aesthetics or global 10/10 rating. Report every criterion with evidence, FAIL/UNVERIFIED counts, individual B01/B02 arms, actual resource counts/nulls, over-limit runs, hashes, held-out status and every unexecuted trial. Remaining cases are skill-only findings. Never invent metrics or substitute integrated fixture success for an unexecuted agent trial.

