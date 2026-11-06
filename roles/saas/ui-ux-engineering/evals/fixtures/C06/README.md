# Deterministic local data fixture

Copy fake-api.ts unchanged into your source. It has no network dependency. Submit queries explicitly with Enter or Search; every invocation returns a new Promise. The timings are intentional:

- cedar: 1200 ms, one result.
- moss: 180 ms, two results including a long title.
- empty: 300 ms, no results.
- fail: 650 ms, always rejects; Retry should make a new attempt even though it will also fail.
- other queries: 300 ms, one general result.

For race checks submit cedar, then submit moss approximately 100 ms later; wait at least 1400 ms after the first submit. Separately submit fail, then moss approximately 100 ms later; wait at least 850 ms. A stale Promise is not cancelled by this fixture.

