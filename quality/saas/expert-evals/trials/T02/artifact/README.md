# Assignee picker repair
Native TypeScript/CSS; no installation or framework. Public API stays `mount(root, search) => { dispose() }`. The injected `Search` remains Promise-based with an optional AbortSignal; stale completions are ignored even when the transport ignores it.

From this artifact directory:

- `node ../../../serve-fixture.mjs . 4173` serves the interactive demo locally.
- `node test.mjs` runs real headless Chrome via preinstalled Puppeteer. Set `CHROME_PATH` if the installed browser is elsewhere. No browser download is performed.

The server strips TypeScript syntax; this is not a static type check. Tests retain JSON and screenshots. `baseline-app.ts` is the untouched original used only for causal regression probes. `initial-browser-failure.txt` records two unavailable browser launch configurations before the successful pipe-based configuration.

See `handoff.md` for requirement trace and limits.
