# Verification, authoring gates and delivery — B8

Activate for every task, using only affected responsibilities. Inputs are the authoritative context, real artifacts, actual capabilities and acceptance criteria established before results. Output working change, risk-to-check trace, raw outcomes, reproducible commands and exact support limits. A unit/mock pass does not establish an integration, database invariant, deployed recovery or skill behavior.

## Risk-based verification

| Requirement | Mechanism | Limit | Failure | Verification evidence |
| --- | --- | --- | --- | --- |
| Complete affected path | Trace resolver/socket/TLS/ingress/auth/parser/domain/transaction/data/async/result/telemetry owners; mark inherited hops | Scope and actual supported versions | A gap between isolated passing components breaks contract or bypasses authority | Real selected-engine/protocol integration plus direct/bypass checks; mocked boundaries explicitly named |
| Critical invariants | Force interleavings, ambiguous commits/effects, revoked/tenant/field authority and invalid state transitions | Frozen logical-operation, transaction, replay and privilege boundary | Lost update, duplicate effect, unauthorized result or deletion resurrection | Actual stored state, logical effect counts and defined error outcomes, not merely2xx responses |
| Bounded operation/recovery | Inject slow/overloaded/down dependencies, crash/rotation/migration/restore and telemetry loss | Frozen deadline/queue/pool/cache/buffer/retention/RPO/RTO and authorized blast radius | Resource growth, retry storm, lost durable work or unusable recovery | Raw resource/demand/outcome accounting and measured usable recovery under declared conditions |
| Reliable claims | Keep build/config/workload/versions, raw samples and initial failures; separate observations from assumptions/models | At least3 important measurement runs; exact samples/units and unavailable resources | Cherry-picked success, invalid denominator, scripted timer called production performance | Median/range plus raw evidence, failed/censored/drop outcomes and precise limitations |

Use `PASS`, `FAIL`, `UNVERIFIED` or `NOT_APPLICABLE` for each criterion. Required failure or missing evidence blocks an unqualified completion claim. Unsupported technology may be outside a task with a concrete reason; an applicable required test cannot become inapplicable because it failed or tooling was inconvenient.

## Maintaining this skill package only

The remaining package commands, fixture assertions, authoring gates and skill trials apply when maintaining/evaluating this package. Ordinary application work uses its project checks and the affected-risk verification above.

### Local package checks

From the skill directory, Node24.12+ and existing OpenSSL/TypeScript paths as described in [adapters](adapters.md):

```text
node scripts/check.mjs
node scripts/integrated.mjs
node scripts/dns-network.mjs
node scripts/load.mjs
node scripts/smoke.mjs
node scripts/validate-package.mjs
```

Inspect scripts before running. They operate on isolated local fixtures and write timestamped evidence; no live production change or registry install is implied. The fixture README documents service/cert commands. Smoke tests exercise CLI/module success and invalid paths; structural validation checks this package and bounded contract invariants, not complete JSON Schema or protocol conformance. Run every newly shipped script and its relevant failure path. Preserve original failed attempts, console warnings and instrumentation corrections; corrected results do not erase them.

The integrated suite covers13 case groups from `meet.md` §6: CRUD/trace/persistence; duplicate create; concurrent version update; post-commit lost response; tenant/object/field denial; malformed/oversize/slow/costly input; applicable permits/queue exhaustion; cache/dependency fault; worker crash effect/ack; certificates/credentials; migration/drain; actual backup restore with permissions/deletions; bounded telemetry outage. Inspect exact subcases and limits in the evidence. A group pass does not silently establish every technology listed in L01–L24.

Network tests use actual local DNS/UDP and TCP plus declared application caches. Load uses3 repetitions of6 chosen open-arrival workloads and accounts for generated, admitted, useful, rejected, failed, timed-out, retried and dropped work. All generated-request latency samples include failures/rejections; dropped arrivals have no response latency and must remain a separate demand category. Describe any generator/host saturation and the exact measured workload; do not infer distributed capacity or a production percentile.

### Authoring gates

[gates.json](../assets/gates.json) is authoritative for G01-G10; record each source/status/evidence/remaining limitation without duplicating or weakening its criteria. These gates decompose meet.md, not a10-point quality rating.

Continue through satisfied gates without asking for recurring permission. Start with3 substantive evaluation/revision cycles; expand only for a concrete remaining failure/coverage gap. Never weaken a threshold after results. An instrumentation correction must preserve the original failure, the old/new method and the rationale; if the original criterion actually changes, version/freeze it and rerun affected comparisons.

### Skill-level evaluation

Use the [evaluation protocol](../evals/protocol.md), [cases](../evals/cases.json), activation suite and frozen objective rubric. Holdout definitions stay unread during instruction tuning. Compare the same inherited model/tool budget/input/start state with the skill disabled, and label single runs. Actual tokens/cost or counts not exposed by the host remain unavailable; do not estimate them from text. Agent self-reported PASS requires evidence review, not automatic adoption.

Independent review receives task inputs, artifacts and criteria without a preferred conclusion; report whether arm blinding was feasible. Assess correctness, authority, constraint adherence, resource behavior and truthful reporting before any qualitative recommendation. A small sample has no unsupported statistical confidence or universal10/10 quality result.

Deliver implementation, coverage/decision/requirement trace, tested versions, commands and raw evidence. Separate implemented/inherited/specified/simulated/unperformed behavior, measurements/models and production unknowns. Preserve meet.md. Current instructions require [their own behavioral evidence](../evals/expert-report.md); the [v1.0 report](../evals/report.md) is historical. Unchanged fixture-code evidence does not by itself validate revised skill instructions.
