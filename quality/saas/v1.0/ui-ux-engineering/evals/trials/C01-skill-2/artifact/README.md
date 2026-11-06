# Invitation copy button

Native TypeScript and plain CSS; no runtime dependencies, icons, or framework.

From this directory run `node build.mjs`, then `node server.mjs`. Open http://127.0.0.1:43182. Node 24 and TypeScript are required for rebuilding; this host's existing compiler is the default. On another host set `TYPESCRIPT_PATH` to the absolute path of TypeScript's `lib/typescript.js`. Generated JavaScript is included, so `node server.mjs` alone runs the example.

Reuse by importing `createInvitationCopy` from `invitation-copy.js`, loading `styles.css`, and calling `createInvitationCopy(container, { url, label })`. All labels and the error message can be localized. The function returns cleanup. The optional `writeText` adapter supports host integrations and deterministic tests; normal usage calls the browser clipboard. Keep the URL stable for the lifetime of a mounted instance. Use localhost or HTTPS for Clipboard API access.

The native button supports Enter and Space. A synchronous pending guard blocks duplicate activations while keeping keyboard focus. A persistent polite status region announces progress, success, and failure. Success resets after 2000ms. A failure exposes retry and a selectable fallback link. No automatic retries or legacy clipboard fallback are used.
