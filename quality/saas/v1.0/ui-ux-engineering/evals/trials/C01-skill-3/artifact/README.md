# Invitation copy button

From this directory, run `node serve.mjs` (Node 24), then open http://127.0.0.1:4313. Stop with Ctrl+C. No installs, external fonts, framework, icons, or network assets are needed. The emitted JavaScript is included.

To regenerate JavaScript after editing the TypeScript, run `node build.mjs /absolute/path/to/typescript.js` with an existing TypeScript compiler module. This strictly checks and emits the source.

Reuse by importing `mountInvitationCopy` from `invitation-copy.js`, loading `styles.css`, and calling `mountInvitationCopy(container, options)`. Options include `url`, `label`, `pendingLabel`, `successLabel`, `errorMessage`, and a promise-returning `writeText` adapter. Keep each instance's returned handle and call `destroy()` before removing it. For the supplied German label, set `label: 'Einladungslink für das Projektteam kopieren'` and set the surrounding language metadata appropriately; other feedback defaults to English and can be customized.

The native button supports Enter and Space. Pending uses an immediate guard plus `aria-disabled`, preserving focus. Status feedback uses a separate polite live region. Success resets after two seconds. Failure exposes selectable URL text and enables deliberate retry. Real clipboard access depends on browser permissions and a secure context; localhost is suitable. The example uses the actual Clipboard API; deterministic verification substitutes a writer only within tests.
