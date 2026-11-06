# Field library

A compact native TypeScript/CSS page using the supplied deterministic fake API. No network service, React, UI library, or package installation is required.

## Run

Use Node 24+. From this artifact directory:

1. `node build.mjs` (strict type check and ES2022 output).
2. `node serve.mjs` and open the printed loopback URL. Stop with Ctrl+C.

The build uses the existing TypeScript 6.0.3 API at the host path in build.mjs. On another host set TYPESCRIPT_API to an existing TypeScript lib/typescript.js. Compiled dist files are included so serving alone also works.

Search with Enter or Search. Try cedar, moss, empty, and fail. Search remains available during pending requests. Retry repeats the last failed submitted query, including if the text field has been edited. The fake fail scenario always fails; this is expected. Fixture API source is copied byte-for-byte and unchanged.

## State and design contract

Supplied: labeled form, initial/pending/results/empty/failure+retry, latest submitted query wins for success AND failure, two specified races, responsive 320px, local page only.

Assumptions: English, current Chrome, system Georgia/Arial-family fonts; no deep link or persistence required. Fixture is the only data authority. Goal is WCAG A/AA; a full conformance assessment is not claimed.

Route: adapt; small component responsibilities M1/M3/M4/M5/M6/M7/M8. M2 is limited to the supplied fixture's API/content contract. No external research needed to consume this fixed API.

State: input text is a local draft; each explicit search gets an incrementing generation. Both Promise branches and finally check generation before rendering. New searches clear prior results, preventing misleading query/data mixtures. An obsolete request never clears a newer pending state. Search is intentionally not disabled. Retry is deliberate (no loops), captures failed query, clears its old error, and focuses the persistent input before hiding the Retry control. Ordinary submissions preserve focus. Status is a stable polite live region outside the busy content region. Cards are semantic list/article/heading elements and contain no inactive fake links.

Visual criteria chosen before rendering: compact one-column warm paper panel, clearly labeled primary form, restrained forest action color, system typography, 46px+ control height, 320px stacked controls, wrapping long titles and queries, visible keyboard focus, no unnecessary animation. CSS custom properties are the token authority. No images/fonts/assets were fetched.

Requirements mapped locally because input provides IDs without individual descriptions: R01 stack/fixture; R02 form/Enter; R03 initial+pending; R04 cards+empty; R05 failure+retry; R06 latest intent/stale success+failure; R07 accessible feedback/focus; R08 320px+delivery/checks.

Not claimed: real backend availability, screen reader output, broad browser support, field performance, full automated accessibility scan, or user study.
