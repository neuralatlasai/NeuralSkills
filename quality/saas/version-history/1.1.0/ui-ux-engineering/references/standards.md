# Standards to acceptance

Use current applicable editions when executing. The [research record](../../../../quality/saas/v1.0/ui-ux-engineering/evals/evidence/research/standards-research.json) captures the 2026-11-05 public-source inspection; full normative ISO text was unavailable. The mappings below guide artifacts, not clause-level conformance.

| Reference | Apply through |
| --- | --- |
| [ISO/IEC/IEEE 29148:2018](https://www.iso.org/standard/72089.html) | Requirement ID, stakeholder need/source, conditions, observable acceptance and evidence |
| [ISO/IEC/IEEE 42010:2022](https://www.iso.org/standard/74393.html) | Relevant stakeholder concerns, views, interfaces/owners, relationships and decision rationale |
| [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html) | Selected product-quality concerns expressed as measurable scenarios |
| [ISO 9241-210:2019](https://www.iso.org/standard/77520.html) | Users/tasks/context, alternatives, iteration and actual evaluation; label absent research |

An agent review is not a user study. Obtain applicable normative text and an agreed assessment scope before claiming formal conformance; never invent clauses or certification.

## Coding evidence

Run the project's configured compiler, build and lint checks. Validate external values at runtime, keep state/side-effect ownership explicit, and verify rendered behavior. Add abstractions or dependencies for demonstrated needs. A typecheck alone proves neither interaction correctness nor accessibility.

## Web accessibility

Default to all applicable [WCAG 2.2 Level A and AA](https://www.w3.org/TR/WCAG22/) requirements across complete pages/processes and responsive variants. This selected review map is not exhaustive:

| Risk | Selected criteria | Observe |
| --- | --- | --- |
| Structure/status | 1.1.1,1.3.1,2.4.6,4.1.2,4.1.3 | Names, roles, states, alternatives, announcements |
| Keyboard/focus | 2.1.1,2.1.2,2.4.3,2.4.7,2.4.11 | Task completion, order, overlay entry/return, visible unobscured focus |
| Readability/adaptation | 1.4.3,1.4.4,1.4.10,1.4.11,1.4.12 | Contrast, text resize/spacing, reflow, boundaries; applicable exceptions |
| Pointer/gesture | 2.5.3,2.5.7,2.5.8 | Name matches label, drag alternative, targets/exceptions |
| Forms/authentication | 3.3.1,3.3.2,3.3.3,3.3.7,3.3.8 | Labels, recoverable errors, repeated entry, password-manager/paste paths |

AA target size is 24x24 CSS px with exceptions;44x44 belongs to enhanced AAA. AA 2.4.11 addresses focus not entirely obscured;2.4.12/2.4.13 are AAA.

[APG](https://www.w3.org/WAI/ARIA/apg/about/introduction/) is informative widget guidance. Prefer native controls; for custom widgets verify the selected pattern's keyboard/focus behavior with supported browsers/AT. [Automated testing](https://playwright.dev/docs/accessibility-testing) misses violations; inspect incomplete results and scan relevant opened states. [Lighthouse scores](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) omit manual checks. Record actual coverage using [verification](verification.md).

## Tokens and performance

[DTCG 2025.10](https://www.designtokens.org/TR/2025.10/format/) is a Final Community Group Report, not a W3C Standard. Use it for supported interchange: resolve types/values, aliases, units, cycles and theme mappings. Primitive/semantic roles are design decisions; CSS variables alone do not establish format conformance.

[Core Web Vitals](https://web.dev/articles/vitals) targets: LCP <=2.5 s, INP <=200 ms, CLS <=0.1 at field p75, segmented mobile/desktop. Record population, period and grouping. A local trace/Lighthouse run does not prove field percentiles. Measure immediate feedback separately from eventual asynchronous completion and retain task-specific lab budgets.
