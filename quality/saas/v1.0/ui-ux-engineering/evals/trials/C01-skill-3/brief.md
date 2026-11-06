# C01 brief and acceptance contract

Supplied source: evals/inputs/C01.json only. Mode: explore; scope: one component; output: runnable native TypeScript/CSS. Active modules: M1, M3, M4, M5, M6, M8. M7 scoped to clipboard mutation resilience; no data/navigation workload. No external references, assets, libraries, public uploads or publishing.

Audience/task: teammate copying the supplied team invitation. Devices: desktop keyboard/pointer and 320 CSS pixel viewport. Locale: English plus supplied German expansion fixture.

Requirements and verification fixed before execution:
- C01-R01: one reusable native TypeScript/plain CSS button, no React/UI library/icons/full page. Verify strict compile, imports and rendered component.
- C01-R02: exact original label and exact copied URL. Verify browser clipboard and writer argument.
- C01-R03: synchronous pending guard prevents duplicates. Verify unresolved promise plus repeated native activation.
- C01-R04: success label for about two seconds, then original label. Verify sampled timing in browser (accept 1.8–2.4 seconds).
- C01-R05: unavailable and rejecting clipboard produce useful inline feedback and deliberate retry. Verify both paths and successful recovery.
- C01-R06: keyboard operation, status live region, visible focus, >=44x44 CSS pixel target. Verify Enter/Space, focus/DOM semantics, screenshot, geometry; actual screen reader remains unverified.
- C01-R07: fit 320px and supplied German text without clipping; restrained polish and runnable setup. Verify narrow/desktop screenshots, scroll geometry, long label, server/build instructions.

Decisions: native button with local instance state; aria-disabled plus guard retains focus; polite status region is outside aria-busy button. Error provides manual selectable URL. Only pending prevents activation. Clear previous success timer on new attempts; destroyed instances cannot render stale results. No concurrent data requests, so A/B request ordering does not apply.

Visual criteria: one clear task, system font, dark slate action, neutral surface, semantic feedback color with text, consistent spacing, 3px focus outline with offset. Tokens in styles.css are the sole authority. No motion. Native wrapping and max-inline-size protect translated labels. Target minimum 48px height; no fixed label height.

Assumptions: requirement IDs map in listed order to the seven grouped criteria above because input supplies IDs without individual descriptions. A local fixture does not require packaging or publishing. Modern Chromium is the available browser; no cross-browser support claim. Accessibility target A/AA is a design target; no certification. No field performance claim or comparison benchmark; performance measurements and assistive-technology tests unperformed unless evidence records otherwise.
