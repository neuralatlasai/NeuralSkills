# Handoff — UI-U1

Implemented the bounded native picker repair using the supplied ui-ux-engineering 1.1.0 skill. Source of requirements: supplied UI-U1/task.md; repository implementation was the behavioral reference. No framework, dependency, transport contract, account, cache service or shared checker changed. `mount(root, search) => {dispose()}` and all supplied IDs/roles remain compatible.

## Diagnosis and causal evidence

The original assigns every awaited search result directly to items, including old successes, and every catch changes current status. It also unconditionally searches on input and calls input.blur() inside render. These are separate mechanisms, rather than a network latency or browser autofocus explanation. The browser tests import the preserved `baseline-app.ts`, inject independently controlled promises that ignore AbortSignal, finish B before A, and observe A overwrite B and focus leave #query. A separate composition-start/input probe observes an unwanted search before commitment. Those baseline probes PASS because they reproduce the original defects; they are not repaired-component successes.

Original CSS imposed input min-width:360px inside a padded 320px page and nowrap on suggestions. Correcting intrinsic width and wrapping at their owner avoids hiding overflow or clipping content.

## Requirements and executed verification

All commands below use `node test.mjs` from this artifact. Final native exit code: 0. Real browser: Chrome/156.0.8078.80, Node v24.12.0, preinstalled Puppeteer, headless, pipe transport, no network service. The injected deterministic search deliberately ignores abort. [Structured results](test-results.json), [retained final output](final-test-output.txt), and [320px](render-320.png), [768px](render-768.png), [1280px](render-1280.png) screenshots are retained.

| ID / meaning | Mechanism and file | Operating limit / failure mode | Actual check and result |
| --- | --- | --- | --- |
| U1-R1 latest committed query; clear invalidates | app.ts generation ticket guards success and failure; invalidate increments before abort and on clear; active/results/status cleared for new intent | One mount owns this picker. Abort alone is only an optimization. An unguarded old catch or result would restore incorrect rows/status. | PASS: A starts/B starts/B finishes/A succeeds; latest state including active reference unchanged. PASS: stale failure after newer success, clear then stale success, clear then stale failure. PASS: Escape during pending request prevents late reopening. |
| U1-R2 composition and focus/text | app.ts compositionstart/end plus isComposing gates; forced final commit followed by same-value deduplication; render changes only list content, never replaces/blurs input | Composition tests dispatch browser CompositionEvent/InputEvent sequences; an actual Japanese OS IME was not operated. A duplicate post-commit input otherwise creates two requests. | PASS: zero mid-composition requests, exactly one final Japanese query, final duplicate input suppressed, value/focus retained after completion and further real browser typing. |
| U1-R3 keyboard, selection and ARIA | app.ts ArrowDown/ArrowUp move active visible option; Enter writes #chosen and closes; Escape closes; render removes inactive descendant and derives expanded from visible rows. index.html keeps input/listbox IDs and options retain role=option. | Keyboard interaction remains in textbox. Option IDs are local render indices, not persisted identities. External mutation of owned DOM is unsupported. | PASS: arrows select actual visible option with focus in #query, live descendant resolves to Beta, Up/Enter selects Alpha, Escape closes without moving focus and removes descendant. |
| U1-R4 reject/retry/dispose | app.ts guarded catch exits Loading, exposes retry; retry forces same query; dispose advances generation and removes all registered listeners | A never-settling transport has no added timeout; task transport is deterministic. Generic failure text deliberately does not expose transport details. | PASS: current rejection becomes Search failed with retry; retry uses same query and recovers; dispose then late success leaves root byte-equivalent, subsequent input causes no search. Late rejection uses the same disposed/generation guard but was not separately executed. |
| U1-R5 narrow long content | styles.css width:100%, min-width:0, wrapping options/text; existing visible focus outline retained | Long option may become tall; no virtualization or truncation. Tested one long unbroken label at DPR1, viewport height800. | PASS: rendered widths320/768/1280; document scroll widths exactly320/768/1280; input widths222/490/490; focus remains query and computed outline3px. Captured all screenshots and visually inspected hierarchy, readable label/input/options and unclipped focus. |

Implemented: ordering/lifecycle guard, composition policy, keyboard/ARIA state, retry cleanup and intrinsic responsive CSS. Changed index.html only to connect status description, make status atomic, and hide the initial empty listbox. demo.ts remains an explicitly deterministic transport that intentionally ignores abort. Inherited: original typography, colors, page hierarchy and injected Search signature. Simulated: search completion/error ordering, not a real API or server authorization test.

Accessibility coverage is scoped to executed keyboard/focus, ARIA references and the rendered narrow/long-content checks. Automated WCAG scanner, actual assistive technology, native browser zoom, real Japanese OS IME, static TypeScript type checking and field performance are UNVERIFIED and not claimed. No formal conformance or performance claim is made. There are no unresolved required fixture failures in the executed checks.

## Choice and rejected additions

Abort-only cancellation is a plausible simpler alternative when the transport guarantees abort settlement and suppresses every late callback. This fixture expressly allows ignored abort, so a monotonically increasing request generation plus disposed guard fits better; cancellation remains opportunistic. A native select would become appropriate for a fully loaded bounded option set, but would not preserve this injected asynchronous searchable contract. A cache service/state library/framework migration is unnecessary: one component owns one current query and finite option list, and none would fix completion eligibility by itself.

## Execution record and limits

First observed start: 2026-11-06 03:13:17 UTC from clock tool; the initial dispatch read was batched with it. The literal requested PowerShell UTC form was captured on the next read at 2026-11-06T03:13:27.1914244Z, rather than in the first call. This procedural deviation is disclosed.

Read only dispatch, selected skill, active module/implementation/verification/design references, supplied task/wrapper/output contract/reference map, own artifact, and permitted serve-fixture.mjs. No old skill snapshots, other trials, forbidden protocol, grading, or evaluation reports inspected. No child agents or installations. A capability-path question was sent to the parent; its later addendum supplied installed Playwright/Chrome locations without mechanism guidance. Successful browser work already used the independently located installed Chrome and preinstalled Puppeteer. Every test server requested its own ephemeral port0.

Actual commands and retained failures:

- Capability check: `node --version` and module-resolution probes found Node24/Puppeteer, while local Playwright/TypeScript module resolution was unavailable. This was discovery, not a dependency installation.
- First `node test.mjs`: exit1 after 2.5166s; Puppeteer cached Chrome138.0.7204.94 missing. No assertions ran.
- Second `node test.mjs` using installed Chrome with default transport: TimeoutError after waiting30000ms, before assertions. Polls yielded without assertion output. A process-diagnostic Get-CimInstance attempt was denied by host permissions; it did not change files.
- Third `node test.mjs`, pipe transport and bounded protocol timeout: exit0, 5.8652s command wall time. All initial focused assertions passed.
- Final `node test.mjs *> final-test-output.txt` after added clear/stale-error/Escape case and markup/doc refinements: native exit0, 8.0660s command wall time, 11 named checks PASS (including two original-defect reproduction probes). Node emitted its experimental stripTypeScriptTypes warning; it remains in retained output.

[Initial browser failure summary](initial-browser-failure.txt) preserves the failed configurations; full tool errors also remain in the execution transcript. The successful browser's render/geometry evidence is actual, not a DOM fake. Test server strips TypeScript syntax and does not establish type correctness. The first two failed launches occurred before the script's assertion cleanup block, so automatic cleanup of their child servers is not established; successful assertion runs kill their own server and close their own browser. No unrelated process was terminated.

Resource record: tokens:null; monetary_cost:null. Total underlying tool invocations:20, including one parent coordination message; functions wrappers are not double-counted. Budget:360seconds; no child delegation.

Observed final artifact-write time: 2026-11-06T03:18:43.2492813Z. Work stopped after this twentieth underlying invocation.
