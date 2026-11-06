# Conditional responsibilities

Use this when a task spans concerns or needs explicit ownership. Routine edits use the relevant procedure and a short contract; do not create eight documents.

Use the [documentation profile](documentation.md) when durable engineering records are requested or warranted; keep one authoritative identity/baseline and link active module outputs rather than duplicating them.

All modules inherit the user's constraints and available tools. Dependencies are outputs of active modules, not mandatory phases or agents. Consequential decisions remain within the agreed scope. One contract owns requirements, interface versions, trusted identity, state, tokens, deadlines and acceptance. Delegate only after interfaces/ownership are fixed; one coordinator reconciles results.

| Module | Activate; inputs; dependencies | Decision/procedure -> output | Acceptance; failure/recovery |
| --- | --- | --- | --- |
| M1 Intake | Every task; request/repo/evidence; none | Classify objective/artifact/context/constraints, inspect actual components, mark assumptions -> brief, IDs, route | Scope and sources explicit; ask only consequential blockers, finish independent work |
| M2 Evidence/architecture | Conflicting references, uncertainty or structural change; M1 | Assign reference roles; inspect relevant sources; compare feasible mechanisms by invariants/change/failure/workload -> decision and reconsideration condition | Trace choice to evidence; inaccessible material stays uninspected, no invented compatibility |
| M3 Interface | User-facing change; content/state/reference; M1/M2 as needed | Compose task hierarchy, semantic tokens, responsive transformations, interaction/focus/error contracts -> specified or rendered interface | Every control works; test long content/keyboard/reflow; native fallback if custom behavior cannot be verified |
| M4 API/identity | Request/authorization/domain path; actual callers/contracts; M1/M2 | Map trust transitions, validation, legal transitions, projection and retry identity -> working operation contract | Denial and error boundaries hold; ambiguous effects require reconciliation rather than blind retry |
| M5 State/data/effects | Persistent/derived/async state; engine/schema/invariants; M1/M4 | Choose atomic invariant enforcement, ownership, ordering, replay/retention and failure recovery -> adapters/migrations/effect contract | Real-engine races/crashes preserve postconditions; external effects stay outside assumed local atomicity |
| M6 Implementation | Requested working changes; existing conventions/versions; active design/contracts | Separate rendering/domain/state/data/side effects where useful, validate external values, bound resources -> integrated change | Existing checks and behavior preserved; isolate failures, retain warnings, avoid unrelated migration |
| M7 Verification | Every changed path; acceptance/artifact/host; active outputs | Execute applicable function, accessibility, security, concurrency and recovery checks; profile only a performance problem/change -> evidence and defects | Frozen criteria, actual conditions and failures retained; fix and rerun affected probes |
| M8 Delivery | Every task; trace/results; active outputs | Reconcile components, shared definitions and claims -> artifacts, commands, limits | Resources resolve, execution claims supported; required FAIL/UNVERIFIED blocks unqualified completion |

For combined interfaces/services, define payload/error/version semantics, authorized scope, freshness, pending/mutation outcomes and correlation at the boundary. URL state requests context; it never authorizes it. Test both valid transitions and recovery across that boundary.
