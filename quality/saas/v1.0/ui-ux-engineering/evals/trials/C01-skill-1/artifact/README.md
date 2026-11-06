# Invitation copy button

Node 24 and a TypeScript compiler are required. No packages or network downloads are needed in the supplied environment.

Run from this directory:

```powershell
node build.mjs
node serve.mjs
```

Open http://127.0.0.1:4171. Localhost provides a secure context for the browser clipboard API; the browser may request clipboard permission. Stop the server with Ctrl+C.

`build.mjs` uses the supplied VS Code TypeScript compiler. On another machine set `TYPESCRIPT_PATH` to the absolute path to `typescript.js` before building.

Reuse `createInvitationCopy({ url, label?, pendingLabel?, successLabel?, copy? })` from `copy-invitation.ts`, append its `element`, and include the `.invitation-copy` styles/tokens. Call `destroy()` when removing it. Each instance owns its pending state and two-second success timer. `copy` permits a host adapter or deterministic tests; the default uses the real clipboard. Custom labels should be supplied together in the target language.

Native button semantics support Tab, Enter and Space. Pending operations remain focusable and block repeated activation. Status uses a polite live region; failures retain the address for manual copying and permit retry. This is a component example, with no backend or invitation creation service.
