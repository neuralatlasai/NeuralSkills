# Operations and domain boundaries - B3

Activate L06-L08; use B1/B2 callers/policy, schemas, invariants and real adapters. B4 owns storage semantics, B5 external effects. Output one operation contract and working route-to-storage path. Map these five decision fields to actual requirement IDs.

| Requirement | Mechanism | Limit | Failure | Probe |
| --- | --- | --- | --- | --- |
| Create | Accepted fields/defaults/IDs, current authorization, tenant uniqueness; atomic effect/operation identity and parameter binding where retries matter; Location versus durable async acceptance | Input/key, transaction/retry/retention, projection | Concurrent duplicate, pre-commit crash, lost committed response, same key/different parameters | Independent callers and commit/ack faults; inspect logical effect count/conflicting replay |
| Read one | Tenant/object/field rules before projection/cache; declared absent/deleted outcome, version/consistency | Bytes/deadline/permitted freshness | Revocation, stale replica, sensitive field | Direct API/repository/cache/result access, deleted/revoked objects |
| List/search | Allowlisted filters/sorts, bounded page, total order/tie-breaker; cursor scoped to applicable tenant/actor/filter/order/expiry | Query/offset/results/bytes; cursor is not a snapshot | Ties, concurrent writes, tampering/changed filters, costly search | Insert/delete between pages; ties, cross-scope cursor, oversized page and actual plan/materialization |
| Replace | Full PUT representation, required/server-owned fields, absent-resource and atomic version policy | Validation/transaction/lock bounds | Silent overwrite, omission, privilege/invariant change | Competing versions, required omissions and durable state |
| Partial update | Chosen format/paths; absent/null semantics; validate result; apply allowed fields against current row | Bytes/depth/count, version/retry policy; PATCH not inherently idempotent | Half-patch, replayed delta, mass assignment, stale owner restored | Invalid paths/null/absence, rollback, competing edits and ownership change during wait |
| Delete | Hard/soft/async, authority/precondition, repeated outcome, references/dependents, cache/index cleanup and deletion ledger | Fan-out/batch/retention/completion | Update/delete race, FK conflict/orphan, delayed event/restore resurrection | Repeat/race/references/late events, derived removal and isolated restore |
| Upsert/bulk if selected | Conflict target and insert/update authority; atomic batch or per-item outcomes; durable identity/checkpoint | Items/bytes/memory/locks/retry/cancel | Duplicate/conflicting items, interrupted/restarted batch | Interrupt/resume/cancel; outcome accounting/invariants; reject unsupported operations |
| L07 Parse/serialize | Compatible OpenAPI/Protobuf/schema; validate path/query/header/body and required/optional/null/unknown/immutable/privileged fields; explicit projection | Numeric precision/ranges, timestamps/text/collections/depth, media/encoding and encoded/expanded bytes, parse/response work | Malformed/deep/compressed input, precision loss, binding privilege, huge errors | Adversarial bounds/types, immutable fields, compression/media contract and consumer compatibility |
| L07 Errors | Stable safe code/correlation/retryability; RFC9457 where suitable; malformed/denied/absent/precondition/conflict/overload/dependency/unknown distinctions | Detail/bytes/redaction and existence-disclosure policy | Retry permanent conflict or uncertain effect reported definite | Each outcome/projection and lost acknowledgement |
| L08 Lifecycle | Handler maps transport, application service owns transaction, domain owns transitions, adapter implements selected effects | Context/tenant/operation-attempt/deadline propagation; explicit sync/async/compensation | Alternate caller bypass, illegal ordering, nested commit, remote side effect escapes rollback | Direct service calls, transition sequences, injected partial failure and cleanup |

## Authority must be ordered with the effect

Schedule: A authenticates and waits for body/queue; B revokes role or transfers ownership and commits; A resumes. Checking A's captured identity/object again observes no change. Define when authority is evaluated, then re-evaluate current policy at that effect boundary and coordinate policy/mutation ordering. Keep object/tenant/version/field guards in the actual write.

One PostgreSQL protocol locks the relevant grant row, checks returned policy, then mutates the object in fixed lock order; revocation takes a conflicting lock on the same row. This orders a permitted mutation before a waiting revocation or observes completed revocation. Enumerate every policy writer; a snapshot EXISTS alone does not establish ordering. Test both schedules, lock timeout/deadlock and replay/cache/job retrieval. Other engines/policies require their own mechanism.

Keep input unknown until runtime validation produces a narrow command; construct identity in the trusted adapter, never request JSON. An illustrative TypeScript boundary is:

~~~typescript
type ReserveResult =
  | {kind: 'committed'; reservationId: string; version: number}
  | {kind: 'denied' | 'absent' | 'conflict' | 'overloaded'}
  | {kind: 'unknown'; operationId: string};
~~~

Exhaustive response mapping prevents timeout automatically becoming definite failure. Types alone validate nothing at runtime; this contract is not an executed adapter.

Trace bounded parse -> trusted identity -> admission -> transaction/current policy -> guarded update plus related insert -> commit -> safe projection. One helper owns commit/rollback. Patch omitted fields against current storage state; spreading an object captured before await can restore old ownership. Remote calls do not enter the local atomicity boundary.

Checked2026-11-06: [PostgreSQL18 isolation](https://www.postgresql.org/docs/18/transaction-iso.html), selected Read Committed rechecks; [locks](https://www.postgresql.org/docs/18/explicit-locking.html), row locks/deadlocks. Conditional original guidance; PostgreSQL was not run. Existing protocol/schema/security sources: [register](sources.md).
