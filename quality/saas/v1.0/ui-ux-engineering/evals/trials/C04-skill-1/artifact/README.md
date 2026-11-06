# Contact preferences

Run with Node 24: `node scripts/serve.mjs` from this artifact directory, then open http://127.0.0.1:4174. Stop with Ctrl+C. No install, network, framework, backend or external assets are required. The generated `app.js` is included. `npm start` is an alias; on Windows PowerShell with scripts disabled use `npm.cmd start`.

To rebuild the native TypeScript, run `node scripts/build.mjs` (`npm run build` / `npm.cmd run build` is an alias). The script uses an existing TypeScript compiler or the provided host's VS Code TypeScript API. On another host, set `TYPESCRIPT_PATH` to an existing `typescript.js` compiler API file. `PORT` can change the loopback server port.

This is an independent text-brief implementation. Figma is deliberately unavailable in the supplied simulation; no connector was attempted, and Figma visual fidelity is **UNVERIFIED**.

Design assumptions: system font, 32rem maximum page width, off-white canvas, charcoal text, dark-blue action and focus, one stacked form. Fields and checkbox labels use native semantics; Tab follows document order, Space toggles a checkbox, Enter submits. Invalid email is described inline and receives focus. Local-only saving means memory within the current page; reloading resets the form and summary. No consent is sent or persisted.

On save, a separate immutable snapshot supplies the visible summary. Editing leaves that summary unchanged and shows unsaved changes. Invalid saves preserve the last successful snapshot. Saving with no categories is allowed and shown explicitly.

When Figma becomes available, check the actual frame and viewport, typography, colors, dimensions, spacing, borders, control variants, validation and success states, responsive layout and any intended persistence behavior. Compare under declared browser/font conditions; preserve keyboard focus and readable contrast if the reference needs correction.

Verification evidence and exact environment are in the sibling `evidence` folder and `result.json`. Browser assertions cover behavior and basic semantics, not a full accessibility audit or assistive-technology test. No field performance claim is made.
