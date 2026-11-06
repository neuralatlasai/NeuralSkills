# Find a field guide

A small native TypeScript/CSS local page. No backend, dependencies, external fonts, or network calls. Data and delays come from the supplied deterministic fake-api.ts, copied unchanged.

## Run

Use Node 24+. Run `node build.mjs`, then `node serve.mjs` from this artifact directory and open http://127.0.0.1:4176. Stop the server with Ctrl+C. No npm install is required. The build uses the supplied local TypeScript API path; on another machine set TYPESCRIPT_API to an existing typescript/lib/typescript.js. Built browser modules are included in dist/.

## Behavior

Search or Enter explicitly submits. A new request clears prior results and announces pending feedback; Search remains available. An incrementing request generation guards success, failure, and final busy cleanup. Only the latest submission owns visible state. Input edits are preserved. Retry uses the failed submitted query even if the input has subsequently changed; it stays in the DOM while retrying, marks itself aria-disabled, and prevents duplicate retry clicks. Failed retries remain recoverable. No automatic retries or cancellation are claimed.

The polite live status announces loading/outcomes separately from the busy results container. Native input/buttons support keyboard operation and visible focus. Results are informational cards. The layout stacks the form at narrow widths and wraps titles.

## Checks

Use cedar (1 guide, 1200 ms), moss (2, 180 ms), empty (0, 300 ms), fail (always fails, 650 ms). Submit cedar then moss about 100 ms later and wait over 1400 ms; repeat fail then moss and wait over 850 ms. Only moss should remain. Retry after fail must make another pending attempt for fail. The trial-root verify.mjs runs browser checks and saves raw evidence/screenshots.

## Working brief

Scope: one compact local page; mode: adapt the supplied API into native UI. Audience: English-language curious readers, keyboard/pointer, desktop and 320px. Reference role: fake-api.ts defines data and asynchronous behavior; README defines scenario timings. No visual reference/brand supplied. Active responsibilities: M1, M2 fixture inspection, M3/M4, M5/M6/M7/M8. CSS variables are the sole token authority. Local state owns request generation, pending flag and failed query; fixture owns results. No URL/persistence requirement. Applicable acceptance gates: strict build, unchanged API, all states, latest intent races, retry query identity, keyboard/focus, 320px overflow, desktop/narrow visual inspection. Performance field data, assistive technology and full automated accessibility audit remain unverified; no conformance claim.
