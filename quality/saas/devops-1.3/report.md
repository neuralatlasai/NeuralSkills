# DevOps extension: implemented scope and evidence

Version 1.3.0 adds three conditional procedures to the same flat roles/saas skill: [DevOps](../../../roles/saas/devops.md), [selected cloud platform](../../../roles/saas/devops-platforms.md), and [containers/HPC](../../../roles/saas/devops-compute.md). The entry is 307 whitespace-delimited words, eight more than 1.2; the folder has 18 files and no subfolders. File/word counts are not token or cost measurements. Existing UI/backend procedures remain unchanged.

The procedures support designing, implementing, reviewing and diagnosing authorized infrastructure/delivery work for AWS, Azure, Google Cloud, Cloudflare, Docker/Compose, Kubernetes, and site-specific Slurm/Apptainer workloads. Other providers require capability discovery. No provider CLI adapter, cloud account integration or prebuilt production topology is bundled. A downstream task must generate and verify changes against its actual environment.

| Acceptance | Result | Evidence and scope |
| --- | --- | --- |
| G1 Contract/routing | PASS | Existing single entry now routes DevOps, then selected platform/compute concern; explicit inputs, output, limits and failure paths. |
| G2 Source basis | PASS | [Register](../../../roles/saas/source-register.md#devops-extension): three pinned skills and supporting files inspected, adoption/rejection and licenses recorded; current official provider/runtime docs checked. No installers ran. |
| G3 Architecture | PASS | Three on-demand procedures reuse existing state, capacity, recovery and standards contracts; the eight responsibility modules remain authoritative. |
| G4 Package | PASS | Exact 18-resource manifest; no new installable folder or duplicated entry. |
| G5 Structure/scripts | PASS | [Results](results.json): 54 resolving local links, metadata/manifest, 24 backend areas, eight workflow contracts. New checker exercised both success/failure branches and invalid invocation; [controls](validation-controls-initial.json). These are bounded checks, not full YAML/API conformance. |
| G6 Bounded behavior | PASS | Seven fresh task contexts, including two initial comparisons, a held-out HPC plan and a corrected-contract comparison. Final D01/D02-v2 configurations/plans pass the frozen checks; details below. |
| G6 Live operations | UNVERIFIED | No running Docker engine, target cluster, cloud account or HPC allocation. No real rollout, fault-domain evacuation, restore, global SLO or scalability guarantee was measured. |
| G7 Delivery | PASS | Complete source, task inputs, scripts, controls, observations and limitations retained; frozen sources unchanged and navigation resolves. |
| Formal ISO/IEEE conformance | UNVERIFIED | Applicable standards guide acceptance/traceability; full normative assessment and certification are unavailable. |

## Actual observations

| Case | Baseline / enabled | Interpretation |
| --- | --- | --- |
| D01 Kubernetes repair | 12/12 checks PASS in each condition | Real JSON configuration changes: replica/failure capacity, rollout/PDB, peak connection demand, health/drain, resources and privileges. No API admission or runtime test. |
| D02 initial cloud/edge plan | 7/8 each, FAIL | Task omitted output types. Baseline status strings and enabled hardBoundary string failed different format assertions. These failures do not demonstrate an engineering advantage. |
| D02-v2 clarified contract | 8/8 each, PASS | Fresh contexts received identical explicit types; checker and instructions were unchanged. Pool three gives 33/40; immediate revocation/inventory retain authoritative state; measured recovery remains null. |
| D03 held-out HPC | PASS for plan coverage; runtime UNVERIFIED | [Review](heldout-review.json): explicit restart, checkpoint/publication identity, timing bounds and failure schedule. No wrapper, solver, scheduler or multi-node execution. |
| Activation | Six positives/six negatives correct | [Selections](trials/activation/result.json), one fresh context, not twelve independent contexts. |
| Independent reviews | PASS for static scope | [Instructions](content-review.json) and [four anonymous artifacts](blind-review/findings.json); no critical engineering defect. Operating acceptance remains UNVERIFIED. |

[Initial source/task/checker freeze](freeze.json) and [cycle-2 freeze](freeze-v2.json) remain unchanged. Cycle 2 repaired the case contract; it did not alter thresholds, skill instructions or prior submissions. See [defects](defects.json). This is two comparison tasks with single observations per condition and a separate schema-clarification rerun, not three repeated trials or statistical evidence of superiority. Exact model snapshot, tokens and cost are unavailable. Agent-reported tool counts are in results.json; partial timings are not comparable total completion times.

Two agent reports had extra EOF blank lines. Their exact original bytes/hashes and the initial whitespace-check failure are retained in [normalization evidence](presentation-normalization.json); only presentation endings were normalized. Task artifacts and instruction/checker freezes remain unchanged.

Compose 5.6.1 accepted the synthetic fixture configuration. Its example image digest is intentionally a placeholder and was neither pulled nor built. Docker 29.9.2 client could not contact an engine. kubectl v1.36.1/Kustomize v5.8.1 was present, but offline rendering failed with filesystem Access is denied using relative and absolute workspace paths. No permission changes or cluster calls followed. Azure CLI version inspection also failed on protected profile access; AWS/GCP/IaC/Slurm/Apptainer clients were not found in the initial inventory. [Raw host receipt](host-capabilities-initial.json) and controls preserve failures. These are Windows authoring observations, not deployed adapter versions.

## Reproduce

Use [protocol](protocol.md) and raw cases. Keep old trials intact, create fresh output directories, and give baseline only the same raw task/tools/budget; enabled also receives the skill entry path. Use D02-v2 for the corrected format. Apply the existing checker to both outputs:

```
node quality/saas/validate-saas.mjs
node quality/saas/devops-1.3/check.mjs D01 quality/saas/devops-1.3/trials/D01-skill
node quality/saas/devops-1.3/check.mjs D02 quality/saas/devops-1.3/trials/D02-v2-skill
```

Evidence supports the reusable instructions, configuration correction and plan checks described here. Reliability/scalability in a real local, regional or global deployment requires its declared workload, identity boundaries, dependency limits, fault and recovery tests. No numerical quality rating or unqualified all-environments pass is supported.
