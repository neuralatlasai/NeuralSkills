# Repaired settings widget

No installation. From this artifact directory run `node verify.mjs` to execute real Chrome checks and retain JSON/screenshots. To serve interactively, run `node ../../../serve-fixture.mjs . 0` and open the printed loopback URL.

The shared helper strips TypeScript for browser delivery; it does not statically typecheck it. See `handoff.md` for requirements, mechanism, commands, retained failures, and verification limits. `baseline.json` is historical evidence from the original copied fixture; rerunning `baseline.mjs` now probes the repaired widget instead.
