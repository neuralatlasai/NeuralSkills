# FIELDNOTES workshop reservations

No dependencies, build step, network access, or backend. Open `index.html` directly in Chrome or another current browser. For optional loopback hosting, run `node server.mjs` from this folder and visit http://127.0.0.1:43031. Stop with Ctrl+C.

Use New reservation, select a workshop, enter an attendee name, and submit. Empty or whitespace-only names show an associated error. Escape, Cancel, and the close button dismiss the native modal; focus returns to New reservation. Valid submissions appear in the session list. Reload clears local additions and the original workshop capacity totals remain unchanged.

Overview, Reservations, and Settings are links to sections of this single page. Reservations stays the active workspace. Narrow screens replace the sidebar with compact navigation and stack the summary after the workshop list.

Reference roles: `brand.svg` supplies the forest/lime/clay/canvas/text/border palette and FIELDNOTES wordmark; `layout.svg` supplies the sidebar, heading/action, workshop list and summary grouping only; `typography.svg` supplies Georgia headings (44/26px), Arial body (17px), tracked uppercase labels and bold 16px actions. Smaller headings and vertically stacked row metadata adapt the supplied scale on narrow screens.
