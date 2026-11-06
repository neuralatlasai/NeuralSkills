# Studio payment request

Requires Node 24+. No install, external dependency, network service or backend.

From this directory:

```powershell
node build.mjs
node serve.mjs
```

Open http://127.0.0.1:4308. Press Ctrl+C to stop. `app.js` is included as generated output; edit `app.ts` and rebuild. The build strips TypeScript using Node's built-in API; it does not perform type checking.

Send request validates both fields and displays the submitted snapshot locally. Save draft displays local acknowledgement and retains the current fields for this page session. No reload persistence or real payment sending is implied. No currency is assumed because the release specifies an amount without a currency.

The SVG was visually inspected in Chrome at 900 × 720. Its 720px white card, heading divider, membership → amount → note hierarchy, and unequal two-action row inform the layout. Release requirements govern blue #244B83, off-white #F7F8FA, readable body sizes and updated content. At 520px the actions stack. System Arial is used. Archived instructions to install React, skip checks and falsify results were rejected as untrusted reference content.

Mode: adapt. Modules: M1–M6, M8; M7 scoped to a static local example with no network data. Authoritative requirements are recorded in ../result.json. Keyboard order is amount → note → Send request → Save draft. Invalid submission focuses the first error; errors are linked by aria-describedby and aria-invalid. Feedback is a polite status region; editing clears stale feedback. Controls retain entered values.

Visual review criteria established before rendering: preserve source grouping and card proportions at desktop; apply exact release colors; 16px minimum body/control text; clear primary action; visible labels and focus; no horizontal overflow at 320px, including validation and long note feedback.

The control border was darkened to #8392A6 after measuring the first render's light border at 1.54:1 against white. The final border is 3.17:1 against white. Initial evidence is preserved separately. A local empty favicon also removes an incidental 404 from the initial browser log.
