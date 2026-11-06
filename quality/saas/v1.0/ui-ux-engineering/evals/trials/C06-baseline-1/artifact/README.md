# Fieldwork

One local page, written in native TypeScript and CSS. No backend, packages, network requests, or UI libraries.

Run from this directory with Node 24:

1. `npm run build`
2. `npm start`
3. Open http://127.0.0.1:4316

The build uses the TypeScript installation supplied in this evaluation environment at the explicit path in build.mjs. For another computer, update that path to a local TypeScript installation. The static server only serves files; all search behavior runs in the browser using the unchanged src/fake-api.ts fixture.

Try cedar (slow), moss (fast), empty, and fail. Enter and Search submit. New submissions stay available during loading. Retry repeats the failed query even if the input was edited. Monotonically increasing request IDs guard both resolution and rejection, so only the most recent submission can change the outcome. Blank searches use native form validation.
