# SaaS skills

Both roles use explicit requirements/architecture traceability and truthful coding checks. Read the [frontend coding note](ui-ux-engineering/references/coding-standards.md) and [backend coding note](backend-engineering/references/coding-standards.md) for the applicable IEEE-related basis and its limits.

## Frontend role skill

[ui-ux-engineering](ui-ux-engineering/SKILL.md) covers UI/UX requirements, flows, design decisions, frontend implementation and evidence-based review for SaaS products. It adapts selected upstream mechanisms into original instructions and respects an existing product's design system and stack.

See its [source decisions](ui-ux-engineering/references/sources.md) and [standards boundaries](ui-ux-engineering/references/standards.md) for what was inspected, what was adopted and what remains unverified.

Use the local skill for an interface component, page, flow, application or design system. It accepts a text brief, screenshot/sketch, Figma reference, URL, repository, brand/tokens or documents, including combinations. Choose specification, editable design, prototype, implementation, audit or refinement; it routes to reproduce, adapt, explore or improve-existing. Example: “Use ui-ux-engineering to improve this billing form's keyboard behavior, preserving its stack and brand.” A brief request is enough; the agent inspects available context and asks only consequential questions.

The skill runs inside the host's actual permissions and capabilities. It preserves the existing stack, labels assumptions and mocks, and cannot establish inaccessible Figma fidelity, a real backend integration, full accessibility conformance or real-user performance without the corresponding evidence. Node tooling requires Node 24+; browser checks additionally require existing local browser automation and a browser. Nothing is globally installed or published by adding this folder. See the [resource manifest](ui-ux-engineering/assets/manifest.json), [evaluation protocol](ui-ux-engineering/evals/protocol.md) and [actual evaluation report](ui-ux-engineering/evals/report.md).

## Backend role skill

[backend-engineering](backend-engineering/SKILL.md) covers design, implementation, extension, debugging, optimization, review and migration across the24 backend responsibility areas. Its [meet.md](backend-engineering/meet.md) is the supplied acceptance source; [sources](backend-engineering/references/sources.md) records the Architecture Book, primary specifications and inspected upstream mechanisms. The package distinguishes working local HTTPS/SQLite evidence from unsupported deployment/provider guarantees.

Example backend request: Use backend-engineering to repair this inventory transaction race while preserving the API; provide working changes, real-database tests and operating limits. It accepts requirements, code, API/schema/architecture/infra artifacts, logs/traces/profiles, incidents and performance evidence. Output modes include design, implementation, extension, debugging, optimization, review and migration. Conditional platform guidance is separate from demonstrated runtime support.

Read its [resource manifest](backend-engineering/assets/manifest.json), [evaluation protocol](backend-engineering/evals/protocol.md) and [actual assessment](backend-engineering/evals/report.md). Its demonstrated fixture uses Windows, Node24.12.0, SQLite3.50.4 and local HTTPS/HTTP1.1; TypeScript6.0.3 checks the contract file. Runtime JavaScript is not claimed to be fully statically typechecked. No upstream package is globally installed or published by this folder.

Backend references reviewed through skills.sh include [Node.js Backend Patterns](https://skills.sh/wshobson/agents/nodejs-backend-patterns), [API Design Principles](https://skills.sh/wshobson/agents/api-design-principles), [Saga Orchestration](https://skills.sh/wshobson/agents/saga-orchestration), and [Supabase Postgres Best Practices](https://skills.sh/supabase/agent-skills/supabase-postgres-best-practices). They are referenced and critically adapted, not installed or treated as complete backend verification.

## Curated UI/UX skills.sh shortlist

Choose by the work at hand. These five serve different roles; this is a task-based shortlist, not a universal quality ranking. Links identify upstream references **reviewed on 2026-11-05**, not packages installed by this change.

| Role or task | Candidate | Why it fits / boundary |
| --- | --- | --- |
| Skill author and maintainer | [Anthropic skill-creator](https://skills.sh/anthropics/skills/skill-creator) | Progressive disclosure, realistic evaluations and evidence-backed iteration. Its Claude-specific tooling requires adaptation. |
| Visual designer implementing a new direction | [Anthropic frontend-design](https://skills.sh/anthropics/skills/frontend-design) | Brief-specific typography, palette, layout and visual critique. Apply within the product's brand, conventions and accessibility needs. |
| UI quality reviewer | [Vercel web-design-guidelines](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines) | Concrete code-location findings and interaction checks. Guidance is a review aid; it does not establish WCAG conformance. |
| React/Next.js performance engineer | [Vercel React Best Practices](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) | Prioritizes network and payload bottlenecks and provides contextual implementation rules. Verify the installed framework and measured problem. |
| Design explorer selecting patterns across stacks | [UI/UX Pro Max](https://skills.sh/nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max) | Searchable pattern guidance, focused queries and global decisions with explicit page exceptions. Retrieval relevance and preset catalogs require judgment and validation. |

The new local role skill is present at the link above. The five upstream packages are **referenced, not installed or vendored**; their installers and scripts were not executed. Selecting an upstream package later is a separate installation decision. Pin its version, inspect its dependencies and applicable license, and validate the actual workflow before relying on it.

## Recorded acceptance (2026-11-05)

| Package | Actual gate status | Evaluation boundary |
| --- | --- | --- |
| Backend | G01-G10 PASS | Local Windows/Node24.12/SQLite3.50.4 HTTPS fixture;47 scored criteria PASS,13 integrated groups,18 load runs. Four original comparison pilots retained separately after corrected common-input reruns. No production/distributed/platform-wide guarantee. |
| Frontend | G1-G5/G7 PASS; G6 UNVERIFIED |18 implementation trials;123 canonical criteria PASS,4 UNVERIFIED in C05 because genuine React/Vite dependencies are unavailable. C07 full German native200% zoom now PASS. No full accessibility/field-performance/conformance claim. |

These are evidence-based gate decisions, not a10/10 self-rating. Both roles apply the stated IEEE-related traceability basis; full normative clause-level conformance is unverified. Read each actual report for retained failures, resource limits and unsupported capabilities. The final delivery audit and complete payload inventory are in delivery-evidence/; browser runtime caches are explicitly excluded from distribution.
