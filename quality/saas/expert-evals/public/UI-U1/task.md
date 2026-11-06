# UI-U1: repair the async assignee picker
The native TypeScript/CSS fixture is a small assignee picker. Users report old people reappearing after fast typing, Japanese input triggering searches mid-composition, and the textbox losing focus. Diagnose and fix the working component, retaining mount(root, search) => {dispose()}. The search transport may ignore AbortSignal and settle in either order. This is a deterministic fixture transport, not a real API. No framework, dependencies, cache service, state library or application architecture.

Requirements:
- U1-R1: only the latest committed query may change results, status, active option or error; ignore stale successes and failures even if cancellation is ignored. Clearing query invalidates pending work and empties results.
- U1-R2: composition input must not call search until composition commits; typing retains textbox focus/text. Committing composition produces one search for its final value.
- U1-R3: ArrowDown/ArrowUp chooses a visible option with focus in input; Enter selects into #chosen; Escape closes suggestions without moving focus. aria-expanded and aria-activedescendant accurately reflect visible state with no missing referenced node. Keep input/listbox IDs; options use role=option.
- U1-R4: current rejection shows failure; #retry repeats current query and success recovers. dispose prevents late responses mutating root. Failure must not leave indefinite loading.
- U1-R5: 320px viewport plus long unbroken label has no document horizontal overflow; input, label, suggestions and keyboard focus remain readable.

Edit app.ts, styles.css, index.html, demo.ts and add focused tests/docs. Preserve IDs, roles and injected search contract. Node24/preinstalled browser tools available. Shared wrapper/output contract apply. Deliver implementation plus handoff.md with causal evidence, justified alternative, operating limit, unnecessary architecture rejected and requirement-to-test trace. Browser checks establish focus/layout; static checks alone cannot.

