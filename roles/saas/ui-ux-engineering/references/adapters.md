# Discover host capabilities

Use only capabilities actually exposed by the host. Metadata grants no access. This package requires no cloud account or publishing permission.

| Capability | Evidence it enables | If unavailable |
| --- | --- | --- |
| Filesystem/shell | Actual repository, inspected builds/checks | Deliver specification/patch; runtime unverified |
| Browser | Rendered states, keyboard/focus, viewport captures | Visual/runtime claims unverified |
| Figma | Accessible frames, variants, variables, layout | Record inspected scope; request the minimum missing export |
| Web | Current primary guidance/version/license | Label dated sources; current claims unverified |
| Scanner/AT | Actual rule and AT/browser observations | Separate missing categories |
| Profiler/field telemetry | Workload traces or real-user distributions | Keep lab and field claims distinct |

Follow any host-required tool prerequisite. The optional loopback lab uses Node 24+, a discovered Playwright module and a local Chromium-family browser; configure actual paths. On Windows, npm.cmd can avoid a blocked npm.ps1 without changing execution policy. Missing dependencies/network remain explicit.
