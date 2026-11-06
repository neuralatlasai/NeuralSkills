# Fieldnotes — Find a field guide

A small native TypeScript and CSS page. No runtime dependencies, backend, React, or UI library.

## Run

The checked browser JavaScript is supplied in `public/`, so no build is needed to try the page. With Node 24 installed:

```sh
node serve.cjs
```

Open http://127.0.0.1:4173. Stop with Ctrl+C.

To type-check and rebuild in this evaluation environment, run `node build.cjs`. The build script uses the provided local TypeScript installation through its absolute path. For another computer, change that one `require` to the location of a local TypeScript installation. No install is needed here.

Try `cedar`, `moss`, `empty`, and `fail`. Submit with Enter or Search. Search remains available during pending requests. Retry repeats the failed submitted query even if the input was edited. The source fixture `src/fake-api.ts` is copied unchanged.

A monotonically increasing request ID guards both promise handlers; only the latest submitted request can update results. A persistent polite live status announces loading and outcomes. Results have `aria-busy`; keyboard focus stays in the search form, and Retry returns focus to the search input. Motion respects reduced-motion preferences.
