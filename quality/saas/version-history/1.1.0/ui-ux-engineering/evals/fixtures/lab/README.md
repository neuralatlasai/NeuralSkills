# Local work-queue fixture

This small SaaS request queue is a bounded implementation fixture, not a client application or a reference reproduction. It uses native semantic HTML, responsive CSS, typed TypeScript modules, and a synthetic in-memory transport. It connects to no account or remote API. Request data resets on page reload.

From the skill directory, run Node 24 or later:

```powershell
npm.cmd run build:lab
npm.cmd run serve
```

Open the loopback URL printed by the server. Search, status filtering, empty recovery, refresh, stop refresh, retry, and a native create-request dialog work locally. Expand “Demo controls” to fail the next request. Existing results stay visible and are marked stale during refresh/failure/cancellation. The next successful request clears the stale state. The status region announces these transitions. Creation disables both actions while pending and has a second mutation gate against programmatic duplicates.

The [state module](state.ts) uses both AbortController and an increasing intent identifier. The identifier prevents late completions from overwriting the latest intent even if a transport ignores abort. [The app](app.ts) owns query input and synthetic server data; the reusable loader owns request lifecycle and results. DOM projection uses text nodes, not HTML interpolation.

[The build script](../../../scripts/build-lab.mjs) discovers an existing TypeScript compiler through the local package, `TYPESCRIPT_MODULE`, or standard global/VS Code locations. With a compiler, it runs a strict semantic check and emits ES2022 JavaScript. Without one, it uses Node’s built-in erasable TypeScript syntax stripping and explicitly reports **no semantic type checking**. It never downloads a compiler. The browser consumes the checked-in generated [app.js](app.js) and [state.js](state.js); rebuild after editing `.ts` files.

```powershell
npm.cmd test
npm.cmd run lab
npm.cmd run measure -- evals/evidence/lab/runs.json
```

The optional browser lab requires an already installed Playwright module and Chrome/Edge/Chromium. It discovers the local package or a global `@playwright/cli` installation. Set `PLAYWRIGHT_MODULE` and `CHROME_PATH`, or pass `--browser PATH`, for other installations. `--out DIR` chooses its evidence directory. No browser or package is installed by these tools. `npm.cmd test` exercises malformed-input paths, an actual A-start/B-start/B-complete/A-complete race against a transport ignoring abort, cancellation, failure recovery, mutation duplication, numeric summaries, TypeScript build, and loopback traversal rejection.

The lab records three navigation/refresh runs and their median, minimum and maximum; these are controlled lab observations. The synthetic transport includes a 320ms delay, so these timings are not production performance predictions or field Core Web Vitals. It also captures desktop, mobile, empty, background-error and dialog-error screenshots. Browser checks cover selected semantics, keyboard focus, retry, stale preservation, abort, duplicate prevention, 390px page overflow, reduced motion, selected 24px targets, and 13 computed text/background pairs against 4.5:1 using the WCAG sRGB luminance formula. They do not establish full WCAG conformance, assistive-technology compatibility, comprehensive contrast, forced-colors/zoom behavior, or cross-browser support. The table scrolls inside its container on small screens. Operational text/controls use 14px; metadata, status, and secondary information use at least 12px. Decorative footers and eyebrows use smaller text.

The server listens only on `127.0.0.1`. It rejects decoded traversal, backslashes, malformed escaping, directory access, realpath escape, and methods other than GET/HEAD. Use Ctrl+C to stop the standalone server.
