# Verify the affected interface

Set acceptance before implementation. Retain failed runs and rerun affected checks after a repair. Each result records requirement ID, PASS/FAIL/UNVERIFIED/NOT_APPLICABLE, evidence, conditions and remaining scope.

| Request | Required observations | Add when relevant |
| --- | --- | --- |
| Component | Actual action/states, name, keyboard/focus, rendered long label | Pending duplicate, rejection/retry |
| Page/reproduction | Primary task, declared desktop/narrow renders, reference geometry/type/assets | Intermediate width, loading/empty/error, zoom |
| Flow/application | Complete journey and recovery, Back/reload/deep-link, shared state | Races, unsaved edits, revoked permission, partial/offline failure |
| Design system | Token/component contracts and representative usage | Theme, locale, migration, runtime cost |
| Design-only | Content, composition, specified behavior/inclusive operation | Runtime/AT/backend/performance remain unverified |

Review identity/fidelity, hierarchy, readability, spacing, density, consistency and interaction clarity against the brief. Inspect actual rendered states. A visual rating cannot override a failed task or accessibility requirement. Give independent reviewers the task and artifacts without the desired verdict; record broken blinding.

Record accessibility coverage separately: scanner/tool/rules; keyboard/focus; zoom/reflow; contrast/content; AT/browser pair. Scan opened overlays/errors as well as the initial state, review incomplete results, and keep unperformed categories unverified. Use the [standards baseline](standards.md), not a scanner score, for applicable requirements.

## Local commands

From this package on Node 24+:
~~~text
node scripts/validate.mjs
node scripts/test-tools.mjs
node scripts/measure.mjs --help
node scripts/serve.mjs --help
~~~

The validator checks a bounded schema/link/manifest subset. [Lab instructions](../evals/fixtures/lab/README.md) provide actual build/browser commands and host options.

For important lab comparisons retain at least 3 runs, median/range, build/tool/browser, device, network/CPU, viewport, dataset, cache and workload. Label feedback latency, asynchronous completion and browser diagnostics separately; none is automatically INP or field p75. Record actual time/resource counts; unavailable tokens/cost remain null.

## Authoring gates

| Gate | Exit evidence |
| --- | --- |
| G1 Contract | Tasks, inputs/outputs, constraints, actual capabilities, acceptance |
| G2 Evidence | Inspected sources, provenance, adoption and standards applicability |
| G3 Architecture | Routing, <=8 module contracts, shared authority, frozen evaluations |
| G4 Package | Complete resources/scripts and explicit host boundaries |
| G5 Structure | Metadata/links/schema/dependencies and exercised script success/failure |
| G6 Behavior | Fresh activation/tasks, objective/rendered checks, comparison and variation |
| G7 Delivery | Manifest, reproducible evidence, demonstrated scope and remaining gaps |

Required FAIL/UNVERIFIED prevents an unqualified completion claim. Start with 3 substantive revision cycles; expand for a named defect or coverage gap. Freeze criteria before scoring. Keep holdouts out of tuning; a tuned-on case needs a replacement holdout. Preserve historical results under their evaluated version.
