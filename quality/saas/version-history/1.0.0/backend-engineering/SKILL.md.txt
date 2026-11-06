---
name: backend-engineering
description: Design, implement, extend, debug, optimize, review, or migrate backend services and their data and operating paths. Use for APIs and CRUD, authentication and tenant authorization, databases, workers, integrations, network/TLS failures, capacity, deployment, observability and recovery. Exclude frontend-only work, unrelated writing, and backend terms used incidentally.
metadata:
  version: "1.0.0"
---

# Backend engineering

Deliver the requested working backend change and evidence for its declared environment. Preserve the existing stack, contracts, data and deployment boundaries. Choose the least operational complexity that satisfies correctness and workload needs; a small CRUD change does not require microservices, a broker, sharding, or a platform migration.

## Establish the authoritative context

Inspect repository guidance, actual manifests/lockfiles, service entry points, infrastructure, schemas/migrations, adapters, tests, logs and available tools before selecting mechanisms. Inputs may be requirements, repositories, API definitions, schemas, diagrams, infrastructure, telemetry, incidents or measurements. Inaccessible evidence remains uninspected. Tool metadata does not grant access or deployment authority.

Use [task template](assets/task.template.json) and [schema](assets/task.schema.json), or a proportional note preserving their meanings. Establish objective, requested output, callers/trust boundaries, actual components/versions, state ownership, invariants, workload, operation contracts, identity/tenant policy, deadlines/retries, retention and acceptance criteria. Separate supplied requirements, observations, assumptions, estimates, measured results and unknowns. Ask only questions whose answers materially affect correctness or a consequential decision; continue independent reversible work.

For **every technical recommendation**, record:

`requirement → implementation mechanism → operating limit → failure mode → verification method/result`

Use stable requirement and decision IDs, concrete file/component owners and retained evidence. One context owns identities, contract/schema versions, consistency, timeouts, retry limits and retention. Update dependent artifacts when it changes. Shared interfaces and ownership precede parallel work; one coordinator reconciles integration and evidence.

Map all [24 responsibility areas](assets/coverage-index.json) onto actual components for each task. Every area has exactly one task-level disposition: `IMPLEMENTED_OR_CHANGED`, `INHERITED_VERIFIED`, `OUT_OF_SCOPE`, or `RELEVANT_UNVERIFIED`. These are coverage dispositions, not test results. Inherited requires direct evidence; outside scope needs a reason; relevant unknowns remain visible. A narrow request can have many out-of-scope entries without implementing them. Do not turn unavailable required evidence into NOT_APPLICABLE.

## Activate only the needed procedures

The [module contracts](references/modules.md) define activation, inputs, dependencies, procedure, outputs, resource limits, recovery and verification for eight logical subskills. They are supporting procedures, not separately installed or automatically executable tools.

| Responsibility | Read when applicable |
| --- | --- |
| B1 Intake and contracts — all tasks | This entry and the shared context/coverage assets |
| B2 Edge and identity — L01–L05, L07/L24 boundaries | [Network, TLS, ingress and identity](references/edge-identity.md) |
| B3 API and domain — L06–L08 | [Operation and lifecycle contracts](references/api-domain.md) |
| B4 Data — L10–L14 | [Database, transactions and distribution](references/data.md) |
| B5 Async and integration — L15–L19 | [Derived state, durable effects and adapters](references/async-integrations.md) |
| B6 Runtime and capacity — L09/L20 | [Complexity, resource and workload analysis](references/runtime-capacity.md) |
| B7 Operations — L21–L24 | [Recovery, telemetry, deployment and security](references/operations.md) |
| B8 Verification and delivery — all active areas | [Verification and gates](references/verification.md) |

For a review/incident, reproduce the observed symptom, form a falsifiable hypothesis, inspect the affected path and identify the smallest useful correction. For optimization, require a bottleneck hypothesis, expected effect, comparable before/after workload, correctness checks and operating range. For a migration, establish old/new compatibility and recovery before mutation. A plan or advice alone does not complete an authorized implementation request.

## Build the complete affected path

Trace the actual path: resolver/discovery → network/socket → TLS/ingress → identity/authorization → parsing/contract → domain/transaction → storage/derived state → response or durable acceptance → telemetry/recovery. Mark inherited and unverified hops. Select application interaction (REST, RPC, GraphQL, SSE, WebSocket or job) separately from HTTP version/encoding; HTTP/2 is not gRPC. Verify installed versions and proxy/client compatibility rather than adopting a newer technique by default.

Derive tenant and delegated authority from trusted identity and policy; enforce function, object and field permissions on every relevant API, repository, cache, job, result and integration path. Browser UI hiding, CORS and tenant headers are not authorization. Never disable certificate/hostname validation to make a request succeed. Define TLS termination and the policy on every following hop; local cleartext hops in a fixture are an explicit isolated boundary, not a production recommendation.

Give each supported CRUD/bulk operation a distinct contract. Define accepted/privileged fields, null/absence, validation, resource identity, uniqueness, version/precondition, transaction, failure/retry identity, response and projection. PUT and PATCH differ; PATCH is not inherently idempotent. Idempotency concerns intended effect, not identical response codes. Scope keys to identity/tenant/operation, bind parameters, persist outcome atomically with the local effect where possible, reauthorize replay and specify retention. A connection lost near commit can mean **unknown outcome**, requiring reconciliation rather than blind replay.

Translate preconditions and invariants into atomic storage operations, constraints, appropriate locks/isolation, compare-and-swap, coordinated ownership or explicit reconciliation. A read/check followed by an unconditional write does not close a concurrency race. Parameterized values do not make arbitrary dynamic SQL identifiers safe. Inspect ORM SQL and actual query plans under representative cardinality/skew. A label such as ACID, serializable, exactly once or serverless is not a complete guarantee; name the participating boundary and failure assumptions.

Bound parser/decompression depth/bytes, result materialization, active work, queue count/bytes/age, fan-out, retries, sockets, pools, buffers, cache and telemetry. Propagate deadlines/cancellation and release resources. Define initial acceptance vs eventual completion and durable work lifetime after client disconnect. Protect ordinary traffic during expensive, slow or adversarial operations. Backpressure and rejection must be observable, not hidden from successful-request latency.

## Analyze costs and verify claims

For each critical path use explicit `N` records, `B` bytes, `K` results, `P` partitions, `C` concurrency and `Q` queued work as applicable. Analyze CPU expected/amortized/worst where meaningful; auxiliary and retained memory; database operations/rows/index maintenance/locks; network rounds/bytes; parse/serialize/compress/allocate; fan-out/retries/batching/background amplification; storage growth and restore/rebuild cost. Never call an entire operation O(1) while omitting hashing, payload work, database I/O or remote calls.

Read [capacity analysis](references/runtime-capacity.md) for the admitted-arrival Little's Law boundary, full process memory envelope, and deployment-wide connection sum including starting/terminating instances. These are models with stated assumptions, not p99 or hardware guarantees. Record actual hardware, runtime/configuration, cardinality/skew, payloads, cache/dependency conditions, repetitions and sample counts. Use at least three important lab runs, raw samples and median/range; report actual arrivals, generated/admitted/useful work, timeouts, rejections, retries and generator drops. Distinguish open and closed load models deliberately.

Use [sources](references/sources.md) to find inspected Architecture Book chapters, primary protocol/implementation sources, existing-skill mechanisms and limitations. The book is architectural evidence, not authority over this task. Verify consequential claims against actual implementations and primary specifications. Apply ISO/IEC/IEEE requirements/architecture guidance through sourced requirements, views, rationale and traceability; catalogue abstracts cannot establish clause-level conformance. Do not claim certification or an unsupported quality rating.

## Complete with evidence

For IEEE-related requirements and concrete coding-check boundaries, read the [coding standards note](references/coding-standards.md). It clarifies the traceability basis; it does not establish formal certification.

Execute affected unit/contract/integration/fault/load/recovery checks. Database correctness needs a real selected engine, not only mocked repositories. Exercise concurrency, ambiguous outcomes, tenant/field denial, bounded overload, rotation, shutdown/migration, restore and telemetry outage where relevant. Preserve initial failures; repair defects and rerun affected checks without silently changing thresholds. Restore in isolation and validate data, authority, retention/deletion state and traffic reintroduction; a backup file's existence is not recovery evidence.

Use `PASS`, `FAIL`, `UNVERIFIED` or `NOT_APPLICABLE` for each acceptance check with evidence or rationale. A required FAIL/UNVERIFIED prevents an unqualified completion claim. Distinguish implemented, specified, inherited, simulated and unperformed behavior. Complete requested authorized work autonomously; internal gates are not recurring permission requests. Publishing, production mutation, secret/data transmission and unrelated changes remain inside actual authorization.

Deliver the change, requirement-to-evidence trace, coverage map, actual supported versions/adapters, reproducible commands, operating limits and unresolved risks. See [evaluation protocol](evals/protocol.md), [skill cases](evals/cases.json), [actual report](evals/report.md), [supported adapter record](references/adapters.md) and [manifest](assets/manifest.json). The user's [meet.md](meet.md) is the authoring acceptance source; retain its requirements and map their gates to evidence rather than editing it into a passing result.
