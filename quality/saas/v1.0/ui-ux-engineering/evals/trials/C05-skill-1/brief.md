# C05 working brief

Mode: improve-existing. Active responsibilities: M1, M3, M4, M5, M6, M8. M7 is limited to preserving the static fixture; no network requests or performance claims are needed.

Supplied source: `evals/inputs/C05.json` and the named C05 starter files. The starter owns content, React 19.0.0 / TypeScript 5.7.3 / Vite 6.1.0, styling and purple variables. No outside references or other evaluation artifacts were inspected.

Requirements and acceptance:

- C05-R01: Preserve the React/TypeScript/Vite stack, dependency versions and package scripts.
- C05-R02: Preserve existing invoice data, screen content, CSS variables and visual character; change only the disclosure structure and associated styles.
- C05-R03: Each invoice has an independent Payment schedule disclosure; opening or closing one preserves other rows' open state.
- C05-R04: Each native button exposes aria-expanded and a stable aria-controls relationship to its panel; hidden panels remain mounted and hidden.
- C05-R05: An open panel displays that invoice's supplied due date and all three supplied date/amount entries.
- C05-R06: Native Enter/Space activation, visible inherited focus, readable 375px layout, and appropriate existing package checks.

Assumptions: disclosures begin collapsed, multiple rows may remain open, and disclosure state is local and resets on page reload. Existing placeholder navigation stays outside this task.

Component contract: App owns a boolean record keyed by invoice ID. A button toggles only its key with a functional updater. Focus remains on the activating button. The panel ID and labelled-by button ID derive from the stable invoice ID. A native hidden attribute removes collapsed details from display and the accessibility tree. No fetch, animation, persistence, routing, validation or recovery state is introduced.

Visual decisions: reuse all existing tokens and focus styles; a two-column invoice grid preserves identity/amount alignment and gives schedule details a full-width grid row. The payment list wraps when necessary. New controls have at least 44px height.

Verification planned before results: compare all named files and supplied data; check TSX syntax with the available TypeScript API as a separately labelled fallback; run npm typecheck/build; render desktop and 375px and exercise keyboard/row isolation only if the actual pinned React/Vite stack can run. Missing dependencies limit those runtime claims.
