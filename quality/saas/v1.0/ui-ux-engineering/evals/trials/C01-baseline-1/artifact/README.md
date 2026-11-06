# Invitation copy button

Open `index.html` in a modern browser. The compiled JavaScript is included, so no server, dependencies, or install step is needed. Clipboard access depends on browser support and permission; the example shows an inline retry message when access is denied.

Reuse the component by loading `invitation-copy.css` and `invitation-copy.js`, then adding:

```html
<invitation-copy link="https://example.test/invite/team-river"></invitation-copy>
```

The `label` attribute customizes the resting label, for example `label="Einladungslink für das Projektteam kopieren"`. Set attributes before attaching the component. The pending, success, and error messages are English; localize these strings in the TypeScript source as needed.

To rebuild after editing TypeScript, run `node build.cjs <path-to-typescript.js>` using an existing TypeScript compiler installation (or omit the argument if TypeScript is already resolvable). No package installation is needed.

In the supplied evaluation environment:

```powershell
node build.cjs 'C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js'
```

The native button handles Enter and Space. Pending requests disable it and use a second internal guard. Status uses a polite live region; failures use an alert. Success resets after two seconds. CSS gives the button a minimum 48px height and allows long labels to wrap.
