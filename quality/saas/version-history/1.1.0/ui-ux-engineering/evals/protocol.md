# Frozen frontend skill evaluation protocol

This suite is authored before execution. It contains tasks and criteria, not executed results. Do not report trial counts, success rates, visual ratings, token savings or time savings until the corresponding runs actually exist.

## 1. Freeze and isolate

Freeze the skill, linked references/assets, cases.json, activation.json, rubric.json and all fixtures before the first scored trial. Record SHA-256 hashes and the repository revision (or an explicit uncommitted-file list). Do not tune the skill from held-out C07/C08: leave heldout/C07.json, heldout/C08.json and their fixtures unread until the skill freeze, then distribute them only for final skill-only runs. If the skill changes after a trial, create a new evaluation version and rerun the relevant comparison; never mix versions silently.

Implementation agents receive only a common output wrapper, their case task and the fixture files named by that case. Do not give them requirement checks, rubric, other case prompts, example solutions, previous trial outputs, tuning notes or setup answers. Each trial uses a fresh agent context with no conversation-history fork. Use the same configured model family/version and reasoning setting in both arms, without per-arm model overrides.

## 2. Arms and scope

C01 and C06 each run three times per arm: baseline disables this skill and all its linked content; skill enables only the frozen skill plus the same task/fixtures. Keep tools, browser, dependencies, machine, resource/time budget, viewport set and user instructions identical. Generic host instructions apply equally. Baseline must not inherit a parent context that has read the skill. Record unavoidable differences as limitations.

Predeclare an alternating order: C01 B1,S1,S2,B2,B3,S3; C06 S1,B1,B2,S2,S3,B3. Use fresh contexts for all twelve comparative trials. C02–C05 and final held-out C07/C08 each have one skill-only run. Those six observations have no baseline and cannot establish comparative improvement. Do not claim broad statistical superiority from this small suite.

Run activation separately using the skill's name/description as routing context and the twelve prompts in activation.json. Record each actual classification and exact confusion counts. Do not include expected labels/reasons in the classifier prompt.

## 3. Trial output and evidence

Before starting an agent, the orchestrator records caseId, arm, run, start UTC, model/settings, enabled skill hash, fixture hashes, tool availability and resource budget. Give the implementation agent an empty isolated trial directory. Required implementation files go in trial/artifact/. Keep the provided API and initial fixture repository separate so changes can be diffed.

Every trial writes trial/result.json containing:

```json
{
  "caseId": "C01",
  "arm": "baseline",
  "run": 1,
  "route": "native TypeScript component",
  "requirementCoverage": ["C01-R01"],
  "assumptions": [],
  "decisions": [],
  "checks": [
    {
      "id": "C01-R01",
      "status": "UNVERIFIED",
      "evidence": "Describe actual evidence or why this check was not observed."
    }
  ],
  "limitations": []
}
```

Supply the case's requirement IDs in the common wrapper without their evaluator checks, so agents can record coverage against the task. Use PASS, FAIL, UNVERIFIED and NOT_APPLICABLE only. No NA alias. A required behavior cannot become NOT_APPLICABLE because it was omitted. An agent may add check IDs for build/runtime evidence. Results must distinguish static/code inspection, executed commands, actual browser observations and unavailable checks. If a reference cannot be viewed, disclose it; do not pretend a filename or SVG source parsing was visual inspection.

At completion record end UTC, elapsed wall-clock seconds, actual host token counts only if exposed, and SHA-256 hashes of the raw artifact and result/evidence files. Use actualTokens: null and tokenAvailability: "not exposed" when unavailable; do not estimate executed tokens. Preserve failed commands, console/runtime errors, screenshots, viewport sizes and interaction notes. Do not rewrite raw agent results after review; corrections belong in a separate evaluator record.

## 4. Independent review

Review objective requirements before aesthetics using rubric.json. A screenshot is not evidence of interaction correctness. Exercise specified success/error/empty/pending paths, keyboard actions, dialog focus, race sequences and viewport checks. Record PASS/FAIL/UNVERIFIED/NOT_APPLICABLE for every objective requirement with concrete evidence. Missing browser access leaves the affected checks UNVERIFIED, not PASS. No functional, accessibility, truthfulness or scope failure can be offset by attractive visuals.

When feasible, give a fresh evaluator neutral artifact IDs, the case task/requirements and reference files, withholding arm, skill-enabled metadata, run labels and agent result.json until its initial observations are recorded. Then unblind only to authenticate evidence and compare. State when blinding is infeasible or broken. Do not let the implementation agent be the sole reviewer.

Rate only applicable visual dimensions with anchored 0/1/2 from rubric.json, or UNVERIFIED/NOT_APPLICABLE. Cite screenshots/reference regions and concrete mismatches; do not invent an overall score or unsupported quality label.

## 5. Report

Publish raw per-trial objective statuses, evidence paths, visual dimensions, start/end times, exposed token counts (or null), artifact hashes and material limitations. Report C01/C06 paired outcomes and exact failure/unverified counts, preserving individual runs rather than selecting the best output. Describe remaining cases as skill-only findings. Report activation independently. Explicitly state all unexecuted trials, unavailable tools, limited baseline coverage and the held-out status. This protocol itself provides no executed metrics.

