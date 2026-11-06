# Fieldnotes — Find a field guide

One local page using native TypeScript, CSS, and the supplied fake API copied unchanged. No backend, runtime dependencies, network calls, React, or UI library.

## Setup

Requires Node.js (tested with Node 24) and the preinstalled TypeScript API. `build.mjs` imports TypeScript from the supplied VS Code path; change that import if running on another machine.

From this folder:

```powershell
npm run build
npm start
```

Open http://127.0.0.1:4186. Set `PORT` to use another local port.

Submit `cedar`, `moss`, `empty`, or `fail` with Enter or Search. Retry repeats the failed query even if the input has since changed. Search stays enabled while loading. A monotonic submission number guards every fulfilled and rejected promise. Stale requests finish without updating the current UI. Status feedback is a persistent polite live region; no automatic result focus jump occurs. Retry returns focus to the input before its button is hidden.

The sibling `verify.mjs` uses the supplied local Playwright and Chrome to record browser evidence. Run the server, then execute `node ../verify.mjs` from this folder.
