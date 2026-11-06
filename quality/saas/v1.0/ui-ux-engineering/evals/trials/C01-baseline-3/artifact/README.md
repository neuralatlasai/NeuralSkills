# Invitation copy button

Run `node serve.mjs` from this directory using Node.js 24, then open http://127.0.0.1:4173. Stop with Ctrl+C. No downloads or runtime dependencies are needed. The supplied machine's TypeScript compiler is used by default; set `TYPESCRIPT_PATH` to a local TypeScript `lib/typescript.js` on another machine. Emitted JavaScript is included, so a static local HTTP server can also serve the example directly.

Reuse `attachInvitationCopy(button, status, fallback, options)` from `invitation-copy.ts`. Supply a native button, a persistent status element, a hidden manual-copy element containing the same URL, and the invitation URL. Include the component CSS or adapt its button, status, focus and wrapping rules. Call the returned `destroy()` when removing the component. Messages and labels can be localized through options, including `label: 'Einladungslink für das Projektteam kopieren'`.

The example copies `https://example.test/invite/team-river`. While awaiting the Clipboard API, the button is disabled. Success lasts 2 seconds. Clipboard failure exposes a retryable inline explanation and a selectable URL. Clipboard support depends on the browser and a secure context (localhost is suitable).

Run the trial's browser checks from this directory with `node ../verify.mjs`. They use the provided local Playwright and Chrome installations, simulate delayed, successful, rejected and unavailable clipboard APIs, and save raw evidence one directory above. Real operating-system clipboard permissions and actual screen-reader announcements require manual checking.
