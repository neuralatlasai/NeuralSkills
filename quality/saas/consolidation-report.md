# One-folder consolidation, version 1.2.0

The active package is roles/saas: one folder, no subfolders, one entry point and 14 on-demand resources. The default entry is 299 whitespace-delimited words. This is a package-size observation, not measured model token use. Detailed frontend/backend techniques, standards mappings and the 24-area backend index remain available without loading them for unrelated tasks.

| Check | Status | Evidence / limit |
| --- | --- | --- |
| Flat structure, metadata, manifest, links, coverage | PASS | [Validation receipt](routing-1.2/validation.json): 15 files, 45 local links, 24 backend areas; eight workflow contracts. Bounded validator, not full specification certification. |
| Validator failure path | PASS | Same receipt: nonexistent root rejected with exit 1. |
| Frozen active source | PASS | [Source freeze](routing-1.2/source-freeze.json), verified before aggregation; all 15 hashes unchanged. |
| Selective reading | PASS | [Six cases](routing-1.2/cases.json), [R01](routing-1.2/R01.json), [R02](routing-1.2/R02.json), [R03](routing-1.2/R03.json), [R04](routing-1.2/R04.json), [R05](routing-1.2/R05.json), [R06](routing-1.2/R06.json). Five single-domain cases read one procedure; the full-stack case read two boundary procedures. Each used three underlying tool calls. |
| Activation sample | PASS | [Selections](routing-1.2/activation.json): six positives and six negatives, all expected. One fresh context containing 12 compact prompts; no general accuracy or statistical claim. |
| Independent source review | PASS | [Review receipt](routing-1.2/review.json): routing, context budget, preserved limitations and selected UI/data techniques. |
| Full implementation transfer to 1.2 | UNVERIFIED | New revision received routing/source checks, not repeated fresh implementation comparisons. Prior implementation evidence belongs to 1.1. |
| Formal ISO/IEEE conformance | UNVERIFIED | Public guidance mapped to acceptance/evidence; full normative assessment unavailable. No certification claim. |
| Token/cost/latency improvement | UNVERIFIED | Exact model, token and cost telemetry unavailable. No measured efficiency score. |

The construction gates have distinct scopes: G1 contract, G2 source basis, G3 routing architecture, G4 package and G5 structural checks PASS for the consolidation. G6 PASS for the routing-only observations; its broader implementation-comparison requirement remains UNVERIFIED for 1.2. G7 package delivery is reviewable with these limits; an unqualified all-gates claim is not supported.

Run `node quality/saas/validate-saas.mjs` from the repository. For the negative path run `node quality/saas/validate-saas.mjs --root roles/missing-saas` and expect exit 1. To repeat routing observations, start one fresh context per cases.json task, give only the entry path and task, permit relevant procedure reads, and record actual reads separately from planned reads. Do not reveal expected route or previous results. These observations test selection, not working application behavior.

The two former skill packages were moved byte-preservingly into version-history/1.1.0, with archived entry filenames changed to SKILL.md.txt. Their source, scripts, fixtures and failures remain attributed to that version. See [layout receipt](consolidation-layout.json). Authoring evidence stays outside the installable folder.
