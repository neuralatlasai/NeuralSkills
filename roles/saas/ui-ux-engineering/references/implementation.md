# Implementation decisions: authority, lifecycle and rendering

Use for M5/M7 with relevant M3/M6. Preserve installed versions, conventions and dependency interfaces. Add abstraction/dependency only for a concrete consumer, invariant or lifecycle; a directory diagram is not architecture evidence.

## Trace one complete action

Follow event -> state transition -> side effect -> eligible result -> rendered feedback. Identify who can invalidate each stage. Compile-time types do not validate external payloads.

| Owner | Contract and consequence | Probe |
| --- | --- | --- |
| URL/router | Own committed shareable filters/sort/page; draft typing may remain local | Parse bounded allowed parameters; Back/reload restores intent without two stores overwriting each other |
| Data owner | Bind payload to query and trusted identity/permission scope | Old success, error and cleanup cannot populate a new query/tenant |
| Selection | Stable resource IDs plus authorized scope; declare page-only/cross-page policy | Reorder/disappear records; row indices must not select a different object |
| Editor | Dirty fields and base representation version within valid scope | Refresh preserves dirty input or requests explicit conflict resolution; no invented save |
| Identity/policy owner | Invalidate dependent visible state, caches and pending work on known scope/revocation | Complete an earlier authorized request afterward; sensitive old data must not return |
| Preference owner | Explicit scope, initialization and storage-failure behavior | Unreadable storage falls back; do not persist confidential drafts by habit |

Client route values can request a context but do not authorize it. Cache keys and UI guards ensure consistency, not server denial.

## Accept completions deliberately

On asynchronous/data-driven paths use cancellation plus an authority epoch and request generation/key, or equivalent scoped mechanism. Success, failure and cleanup require current authority and intent. Invalidation must work without a new request. Independent background work needs its own merge rule, not one counter for unrelated operations.

Illustrative transition sketch, requiring adapter tests:

    scope change: advance authority epoch and intent; cancel; invalidate scoped results/selections;
                  reconcile drafts using the declared privacy/work-preservation policy
    query start: capture scope/epoch and next intent; enter initial load or permitted refresh
    completion: ignore unless captured scope/epoch/intent remain eligible;
                validate outcome and transition the current state

Model initial loading, ready, permitted refreshing, recoverable failure with permitted prior data, and authority-denied distinctly. Derive flags rather than independently mutating contradictory booleans.

| Event | Decision/failure | Recovery probe |
| --- | --- | --- |
| Refresh/reorder/delete | Merge/version policy; avoid losing focus or changing selected identity | Recover focus to a surviving resource/action or meaningful heading |
| Failed refresh | Prior data allowed by freshness and authority, or unavailable | Identify stale/error scope and provide bounded retry; initial failure is not empty data |
| Timeout/offline/partial result | Define finite pending/retry limits, completeness and permitted prior data under the actual API contract | Stall a response, fail one segment and disconnect/reconnect: pending exits by its declared limit, partial/stale/empty stay distinct and bounded retry recovers |
| Dirty draft/new representation | Pristine/dirty field merge and save precondition | Change both kinds remotely; test conflict handling without silent overwrite |
| Pending mutation/view exit | Not sent, rejected, accepted, committed or outcome unknown | Local cancellation is not proof of failure; reconcile lost responses and suppress irrelevant view updates |

Local duplicate prevention is not server idempotency. Retry mutations/keys only under the actual API contract. Preserve permitted user work; known authority invalidation takes precedence over keeping sensitive stale content visible.

## Evolve component contracts

Specify typed inputs/events, controlled versus uncontrolled ownership, valid state combinations, errors and supported styling extension points. Keep runtime validation at trust boundaries. Avoid unrelated boolean flags that admit contradictory states.

For a consequential change, enumerate representative consumers; classify visual/semantic/behavioral/API impact; choose compatible defaults, a temporary adapter/alias or explicit migration; name removal ownership and evidence. A changed default can break consumers despite successful type checking. Verify affected themes, long content, error/pending states and keyboard/focus. Expose semantic variants/slots instead of relying on private DOM nesting; an escape hatch has a compatibility cost.

Reuse native/existing accessible primitives. Compare a dependency by actual API/access behavior, maintenance, compatibility, bundle/runtime cost and license, not popularity.

## Diagnose CSS at its owner

Inspect the winning declaration, inherited values, containing block, formatting context and overflow owner before adding rules. Correct shared ownership rather than increasing specificity repeatedly.

| Symptom | Hypothesis to confirm | Small experiment and acceptance |
| --- | --- | --- |
| Long content widens a panel | Intrinsic minimum, unbreakable content or fixed track | Inspect the element/track; apply appropriate minimum/wrapping and retest identifiers, focus rings and intended scroll regions |
| Theme differs unexpectedly | Semantic binding/cascade diverged | Trace computed value to definition; render affected state/theme consumers |
| Sticky header hides focus | Scroll container/overlay geometry conflict | Inspect actual focus at zoom; verify keyboard navigation after scoped correction |
| Component fails in sidebar | Viewport-space assumption | Test region widths; choose intrinsic wrapping or supported container rules with fallback |
| Hover/error moves targets | Border/font/dimension/message changes layout | Stabilize justified geometry or allow content-driven flow; inspect all adjacent states |

Use the existing cascade convention; layering changes can alter precedence. Verify installed CSS tooling and computed outcomes before migration. Logical properties follow meaning; physical shorthands may conflict. Container queries/containment require actual compatibility and sizing checks. Do not infer production suitability from a draft's existence, remove focus styles, or use unexplained global important overrides.

## Optimize the observed bottleneck

Record build/workload/conditions and baseline, form one hypothesis, change one meaningful cause and compare correctness plus measured user effect.

| Evidence | Candidate mechanism | Verification/rejection condition |
| --- | --- | --- |
| Independent requests start serially | Remove a confirmed waterfall | Preserve authorization/dependency order; avoid costly speculation |
| Input waits behind synchronous work | Reduce/move attributed costly handlers/transforms | Measure feedback and eventual completion separately; timers do not prove CPU isolation |
| Repeated layout/paint | Confirm read/write or geometry churn | Trace affected elements and compare the same journey; render counts alone prove no benefit |
| Materialization/DOM grows with all records | Pagination, bounded results or justified virtualization | Retest selection/focus, AT exposure, find/print/content access; reject lost required behavior |
| Repeated unrelated renders | Narrow actual subscriptions/state dependencies | Memoize only confirmed expensive work; reject complexity or stale values without benefit |
| Resources rise across navigation | Lifecycle cleanup may be incomplete | Inspect retained requests/listeners/subscriptions/nodes under declared repetition; short snapshots do not prove leak freedom |

Apply the [measurement protocol](verification.md): representative data/cache/device/network conditions, comparable runs and raw evidence. Keep lab proxies separate from field CWV and report failed hypotheses. Conditional React/Next changes require the installed framework's primary documentation; browser-native work does not inherit server-framework rules.

## Cross-boundary regression schedule

Execute only applicable cases:

- A starts, B starts, B finishes, then A success/error/cleanup: only eligible B data/status remains.
- Trusted identity/tenant changes without a new request, then the old request finishes: no old rows, selection or status return.
- Stable-ID selection survives declared reorder/removal policy; revoked actions are blocked/reconciled without claiming server tests.
- Dirty editing, refresh and language change follow field/version policy; labels/errors translate without inventing acceptance.
- Render changed composition at narrow/intermediate/desktop regions, long content and native zoom; inspect screenshots and computed geometry.

Record results and unperformed checks; scheduled tests are not results.
