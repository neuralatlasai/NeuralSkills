# DOC-PROFILE-140 — Engineering documentation profile

| Control | Value |
| --- | --- |
| Revision / date | 1.4.0 / 2026-11-06 |
| Status / owner | Reviewed for bounded authoring checks; long-term maintainer UNASSIGNED |
| Author / reviewers | Coordinating agent; independent profile and artifact reviewers linked below |
| Audience / scope | Agents producing frontend, backend and DevOps engineering records; documentation only |
| Baseline | Parent commit fbb29430c9d90643476aa435fdda47833db3d0e2; [frozen source/cases](freeze.json) |

## 1. Requirements and sources

| Requirement | Source / mechanism | Acceptance / verification |
| --- | --- | --- |
| REQ-DOC-01 Consistent professional records | User request; one [documentation profile](../../../roles/saas/documentation.md) for requirements, architecture/decisions, procedures and verification | Relevant fields, stable IDs, source/type and baseline relationships; TEST-DOC-02/03 |
| REQ-DOC-02 Standards/practice basis | Public ISO/IEC/IEEE catalogues plus selected Google, Microsoft and AWS guidance in [source register](../../../roles/saas/source-register.md#documentation-profile) | Distinguish repository tailoring from normative requirements; no invented clauses/approvals; TEST-DOC-02/03 |
| REQ-DOC-03 Minimum default context | Earlier user constraint; one flat folder, formats loaded on demand | Entry <=320 words; exact manifest and resolving references; TEST-DOC-01 |
| REQ-DOC-04 Evidence integrity | Earlier user requirement; separate supplied facts, proposed behavior and actual results | Unrun tests stay UNVERIFIED; profile review and fresh records; TEST-DOC-02/03 |

The public catalogue checks cover 29148:2018, 42010:2022, 15289:2019 and 29119-3:2021. Published editions, revision/draft status and access limits are recorded in standards.md/source-register.md. Full normative texts were not inspected. The profile is original repository tailoring, not a reproduced IEEE or corporate template.

## 2. DEC-DOC-01 — Load one tailored profile

Decision: use one on-demand format resource shared by the existing eight workflow responsibilities. Keep a small change in one short record; add linked views/records when complexity warrants them. Existing project templates take precedence.

Alternatives: embedding all formats in the entry would load unrelated detail; always creating separate SRS/ADR/runbook/test documents would add maintenance without proportional benefit. The selected approach adds one resource, no subfolder, and three entry words. It also separates a decision record from an architecture description's needed views.

Consequences: requirements, architecture choices, operating procedures and verification share document identity and traceability. Review status cannot imply approval or execution. Current procedures update with code/configuration; historical decisions and failures remain version-attributed. Reconsider when project templates, normative editions or document consumers change.

## 3. Procedure and verification

1. From the repository, run `node quality/saas/validate-saas.mjs` with the available Node runtime. Expect exit0 and bounded metadata/link/manifest checks; preserve and repair a failure before publication.
2. Follow [protocol](protocol.md): author F01/F02 in isolated fresh contexts from the frozen tasks, without product implementation or operational commands. Check word limits and local references; retain outputs.
3. Review against [criteria](criteria.json) independently. Distinguish document acceptance from product behavior and formal conformance; record limits and any defect before an affected rerun.

| Test / trace | Expected / actual | Result / evidence |
| --- | --- | --- |
| TEST-DOC-01 → REQ-DOC-03 | Flat valid package with entry <=320 words; actual 310 words, 19 resources, 65 local links | PASS — [structural receipt](structural.json); bounded check, not full specification conformance |
| TEST-DOC-02 → REQ-DOC-01/02/04 | Proportional source profile with truthful status/authority distinctions | PASS — [independent profile review](review/profile.json) |
| TEST-DOC-03 → REQ-DOC-01/02/04 | Fresh component and cloud/HPC records respect their constraints and evidence | PASS for both records — [observations](observations.json), [independent artifact review](review/artifacts.json); product outcomes remain UNVERIFIED |
| Formal standards assessment | Full normative requirements and defined scope needed; unavailable | UNVERIFIED |
| Product implementation/runtime | No change/build/deployment/test requested by these fixtures; none performed | NOT_APPLICABLE to authoring evaluation; fixture behavior remains UNVERIFIED |

F01 is one record of 399 words; F02 is one record of 730 words. Two fresh single-run contexts used four/five agent-reported underlying tool calls. They are not user studies, live application tests or baseline comparisons. Exact model revision, model tokens, cost and comparable elapsed times are unavailable. Twenty-two frozen source/case files remain unchanged.

## 4. Maintenance and limits

The profile applies across frontend/backend/DevOps outputs; technical implementation procedures remain unchanged. Source references are selected public material, not proof of a universal company-wide policy. No new script or human approval ceremony was introduced. Existing standards traceability and all prior failure/runtime limits remain attributed to their tested versions. Formal ISO/IEEE conformance and production quality are not established by document formatting.
