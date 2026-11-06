# Environment/procedure regression

Freeze active skill, cases and criteria. Run E01/E02 and E03/E04 in two fresh contexts with the same entry path; permit relevant instruction reads and output writing only, no actual infrastructure commands. Supply cases and output contract, withholding criteria/prior results. Each context has six tool calls/180 seconds. Save outputs separately. Independent review receives raw cases, criteria and outputs; assess every case with located reasons and explicit runtime limitations. Do not tune instructions from a failure without recording a new revision/cycle.

Run `node quality/saas/validate-saas.mjs` for bounded package structure. Reproduce decision observations with the frozen cases.json. A separate Node subprocess control can emit exit2 or normal stderr to exercise capture logic; it is not Terraform, Modules or cloud execution. No new runtime helper is shipped in the active skill.

The purpose is to make next steps, execution location and stop conditions explicit. Count supplied-fact questions if useful, but do not infer a real steering reduction without a comparable measured baseline. Prior 1.3 deployment limitations remain: unavailable daemon/cluster/HPC allocation, protected profile, and no cloud runtime verification. Documentation was selectively rechecked; full ISO/IEEE conformance remains unverified.
