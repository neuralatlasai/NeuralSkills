# Invitation copy button

Run with Node.js 24 (no dependencies):

```sh
node serve.mjs
```

Open http://127.0.0.1:4175. Use http://127.0.0.1:4175/?lang=de for the long translated label. The demo translates the label only. Clipboard copying requires localhost or HTTPS and browser permission. If copying fails, the inline message offers retry and a selectable manual-copy field.

The checked-in JavaScript is compiled from the TypeScript source. Reuse `createInvitationCopy({url, label})` from `invitation-copy.js`, append its `element`, and include the `.invitation-copy` CSS rules. Call `destroy()` before removing the host view. Each instance owns its pending state, live region, and two-second reset timer. The native button supports Enter and Space, keeps focus while pending, and ignores repeated clicks until the current request settles.

To rebuild with a locally installed TypeScript compiler:

```sh
tsc invitation-copy.ts main.ts --strict --target ES2022 --module ES2022 --lib ES2022,DOM
```

No React, UI libraries, icons, network requests, or build step are needed to run the supplied example.
