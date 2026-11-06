Node 24.12+ native node:sqlite; built-ins only. Copy to trial/artifact. Run `node service.mjs`; stdout reports a loopback HTTP port. DB_FILE and PORT are optional. Import openStore/createService for isolated tests; use a file database for restart checks. This local cleartext HTTP task does not establish HTTPS support.

Existing identities: Bearer north-reader, north-editor and south-editor. The registry is fixture input, not production authentication. The same t1 identifier exists in two tenants.

Implementation verification: `node verify.mjs` (built-ins only) creates a temporary
file database under this artifact, starts actual loopback HTTP listeners, exercises
schema/auth/tenant/size errors and same-version concurrent requests, then closes
and reopens SQLite and HTTP to check persistence. Temporary databases are removed.

PATCH accepts application/json (parameters allowed), at most 2048 raw body bytes,
and an object containing a positive safe integer version plus optional title/note.
Title is trimmed; lengths count Unicode code points. A version-only patch is valid
and increments version while preserving both optional fields. Only null note clears
state. Authentication and permission checks precede body parsing. The fixture's
in-memory identity registry remains the identity authority; tenant headers are
ignored. A conditional SQL UPDATE with RETURNING performs each version increment
atomically. Stale versions return 409; tenant-scoped absence returns 404.
