# Independent backend fixture review

Reviewed `meet.md`, the implementation, fixture contracts, integration harness, and the captured integrated/network/load/smoke evidence without assuming a preferred conclusion. The inspected source bundle hash was `26110b595a6ce1ba8f1730462986fb5bf1f1cddb3f6a134180f405d30ca82a37`, matching the existing captured evidence. This review changes only files under `evals/evidence/independent-review/`.

The fixture demonstrates a real HTTPS → trusted loopback HTTP → application → disk-backed SQLite path. Its existing 13 PASS results are credible executions of their particular assertions. They do not establish the broader authorization and update invariants: independent probes reproduced an ownership-revocation race and replay disclosure.

## Independent execution

- Node v24.12.0, native HTTPS with CA verification enabled, ephemeral local CA, disk-backed SQLite; no installs, network services, global trust changes, or publishing.
- `node evals/evidence/independent-review/probes.mjs`: 18 probe claims, 29 HTTPS requests, 8,058.3971 ms including certificate generation; 12 PASS, 5 FAIL, 1 UNVERIFIED. Raw collection: `probe-results.json` and timestamped copy. Exit 0 means collection completed; the per-probe statuses contain the actual findings.
- `node evals/evidence/independent-review/race-probe.mjs`: three separate streamed-body interleavings, 12 HTTPS requests, 566.721 ms excluding certificate generation; the same ownership race reproduced 3/3 times. Raw collection: `race-results.json`. Together these executions made 41 HTTPS requests and evaluated 19 distinct claims, with 12 PASS, 6 FAIL, 1 UNVERIFIED; race repetitions are not counted as separate distinct claims.
- The transport helper is imported from the fixture, a shared harness dependency. The race probe independently uses `https.request`. Both use real storage and keep writes in a separate review directory. No existing raw integrated evidence was rewritten. Existing suites were inspected, not rerun by this reviewer.

Future reruns can preserve these originals with an explicit output directory: `node evals/evidence/independent-review/probes.mjs evals/evidence/independent-review/post-repair` and `node evals/evidence/independent-review/race-probe.mjs evals/evidence/independent-review/post-repair`. After the original run, P07's executable predicate was clarified to accept a minimal tombstone outcome with any documented HTTP status, provided it contains no old representation fields and does not recreate the item; the original full-body disclosure still fails this requirement. The original raw output remains unchanged.

## Findings and recommendations

### F01 — FAIL, high: slow PATCH can undo an administrator's ownership revocation

`scripts/service.mjs:165` reads and authorizes the item before `await body(req)` at line 183. PATCH builds its replacement from that old row at line 185 and writes all columns with only tenant/id/version predicates at line 186.

Reproduced 3/3: limited user owns version 1; a PATCH with `If-Match: 2` sends its initial `{` and pauses; administrator transfers ownership to alice, committing version 2; limited user finishes `{quantity:777}`. That request returns 200 and commits owner=limited, quantity=777, version=3. An omitted privileged field is restored from stale state, and the user regains the object after revocation. The administrator's ownership mutation was a successful API write, not privileged direct SQL.

Impact: object and field authorization can be bypassed under an ordinary asynchronous request interleaving. Atomic version checks alone do not protect authorization or PATCH preservation when the row was read before an await and a future version is supplied. I03's two complete-body adjustments and I05's static denials miss this case.

Recommendation: finish parsing before reading/authorizing the current row; ensure the relevant version and ownership predicate hold in the write transaction/storage operation. For PATCH, update only allowed supplied fields or derive the complete result from the current version under the transaction. Add this streamed-body revocation regression and a concurrent omitted-field preservation regression.

### F02 — FAIL, high: idempotency replay bypasses current object authorization

`scripts/service.mjs:115-118` checks tenant/key, parameters and subject, then returns the stored representation without `find` or equivalent current object policy. A limited user creates an item; an administrator transfers it to alice. A subsequent GET by that user returns 403, while replaying the original POST/key returns 201 and the full historical representation with `idempotency-replayed: true`.

Impact: revocation does not apply across the advertised API/replay path. A caller with its own old key can continue retrieving a representation no longer in its object scope. This does not require guessing another tenant's key.

Recommendation: retain operation identity separately from disclosure permission; authorize access to any replayed representation against current policy, or return a minimal operation result with an explicit disclosure contract. Exercise owner transfer/revocation and credential-role change before replay.

### F03 — FAIL for deletion completeness, medium: hard-deleted data survives in replay storage

After DELETE 204 and GET 404, the original create replay still returns 201 and the complete deleted item, while the item table has zero matching rows. `scripts/service.mjs:189-192` records the deletion but neither redacts nor makes the representation in `idempotency.response` inaccessible. The data is not recreated in `items`; this is retained representation disclosure, not a duplicate mutation.

Impact: backup deletion reconciliation that only deletes `items` does not prove the requirement that deleted data cannot unintentionally reappear through other paths. The current README acknowledges growing persistent tables but does not specify replay retention versus hard deletion. Keeping a minimal deduplication tombstone can be valid; retaining and serving the full body requires an explicit deletion contract.

Recommendation: define retention and replay behavior after deletion, redact stored bodies while preserving safe operation identity where necessary, and test replay after both source deletion and restored deletion reconciliation. Do not claim comprehensive deletion compliance from GET 404 alone.

### F04 — FAIL, medium: SQLite does not enforce integer inventory quantities

`scripts/service.mjs:22` declares `quantity INTEGER` with a range CHECK in a non-STRICT SQLite table. A direct alternative writer successfully stored 1.5; SQLite `typeof(quantity)` was `real`, and GET returned quantity=1.5 with status 200. API validation correctly rejects nonintegers, but the required database boundary does not enforce this invariant for other writers. Existing I02 tests only -1, so its CHECK failure proves range enforcement, not integer semantics.

Recommendation: use an applicable STRICT table migration or CHECK `typeof(quantity)='integer'` alongside bounds, and audit equivalent required type/domain constraints. Test valid bounds, fractional values, text and NULL through the actual database writer path. Direct SQLite file authority is privileged; this is an integrity defect, not a claim of database tenant isolation from its owner.

### F05 — FAIL, low: authorization scheme is not validated

`scripts/service.mjs:201` strips an optional exact `Bearer ` prefix and hashes the remainder. `Authorization: fixture-token-a` returns 200. Invalid secrets still return 401, so this is contract/parser permissiveness, not secret-free access. Require a valid Bearer scheme with defined case/whitespace handling and reject unsupported schemes. Synthetic credential expiry, issuer/audience and production OAuth/JWT remain explicitly unsupported.

### F06 — FAIL, low: cursor parser ignores trailing components

`scripts/service.mjs:128` destructures only the first two dot-separated components. A valid cursor plus `.unexpected` is accepted with 200. Forged signatures and cross-caller cursors were independently rejected with 400. This is noncanonical input acceptance, not signature forgery or tenant bypass. Require exactly two components and canonical encodings.

### F07 — UNVERIFIED: committed-effect deletion and delayed worker semantics

Deleting an item cascaded its job, while its committed `effects` row remained. `effects` has no foreign key (`scripts/service.mjs:25-26`). The retained payload is a synthetic item identifier; no effect-ledger retention contract is supplied, so this observation is not labeled a privacy breach. Both worker implementations select pending work before beginning their transaction. Concurrent deletion/claiming and delayed effects are untested; no external worker guarantee follows from the local unique key. Define retention and deletion fencing, then test delete during selection/effect/ack and concurrent workers if that operating mode is supported.

## Review of the 13 integrated claims

| Existing case | Independent assessment | Evidence and limits |
|---|---|---|
| I01 CRUD/trace | PASS for the demonstrated lifecycle | Real transport/storage, scoped list and trace header; does not cover every contract, dependent data or interleaving. |
| I02 duplicate create | PASS for one logical same-key create | Eight concurrent requests, changed parameters and real range CHECK. Integer/type enforcement fails separately (F04). No precommit process-kill exercise. |
| I03 competing updates | FAIL for the general update invariant | Simultaneous atomic adjustments are sound and independent complete-body PATCH gave 200/409. Streamed-body PATCH loses ownership/preservation (F01). |
| I04 lost response/retry | PASS for exactly one create; FAIL for replay authorization | Socket loss after commit is real and creates once; replay disclosure bypasses current policy (F02/F03). |
| I05 authorization | FAIL | Static tenant/object/field/cache/job denials are useful and real; they omit current-policy replay and authorization changes during body parsing (F01/F02). Direct SQLite DCL/RLS isolation is NOT_APPLICABLE to the declared adapter. |
| I06 bytes/syntax/deadline/cost | PASS for bounded parser seams; UNVERIFIED for CPU-heavy work/memory isolation | Actual malformed/compressed/deep/framing/slow inputs. `costMs` is an awaited timer, not CPU work; no expensive CPU workload mixed with ordinary requests. Synchronous SQLite cannot be preempted. Health returns before cost/dependency controls. |
| I07 queue exhaustion | PASS for declared application gate | Bounded active/queued counts and recovery observed by original harness. Database pool exhaustion is NOT_APPLICABLE to one synchronous connection; abandoned queued requests/cancellation and OS resource limits unverified. |
| I08 cache/dependency | PASS for declared fault seams; UNVERIFIED for origin protection | Cache bypass and pre-SQL 503 are accurately disclosed. Every cached GET first calls `find`, performing a database SELECT; a cache hit is not evidence of reduced database read load. No real disk, lock-contention or external cache failure. |
| I09 effect/ack | PASS for local SQLite effect deduplication | Original suite actually exits a separate worker process 77 and restarts; independent exported API corroborates two attempts/one effect. No remote effect, power-loss, lease or concurrent consumer claim is established. |
| I10 rotation | PASS for trusted TLS and synthetic credentials | Actual invalid certificates, live certificate change, revoked old token; independent live rotation corroborates. Fingerprint reporting helper always returns original certificate at service.mjs:232; wire peer fingerprint correctly measures rotation. Production identity protocols NOT_APPLICABLE here. |
| I11 migration/shutdown | PASS for additive legacy SQL compatibility and local drain; UNVERIFIED for rollout/termination guarantee | Old SQL reader/writer actually work after migration and admitted requests drain. Independent stop completes after work, but signal termination under work, durable-job handoff, interrupted migration, termination deadlines, fleet coexistence and destructive rollback are not exercised. |
| I12 backup/restore | PASS for local snapshot and item-ledger reapplication; FAIL for complete deletion exclusion | Original comparison omits owner and credentials and checks only one own/cross-tenant path. Independent backup integrity=ok and pre-backup revocation remains inactive. Item GET404 alone misses replay storage (F03); post-snapshot revoked credentials also need reconciliation policy if required. |
| I13 telemetry | PASS for local bounded queue/drop counters | Actual 16-entry ring and loss counters. Healthy sink immediately discards entries; no exporter, retry, collector or network outage is modeled. This limit is already disclosed. |

## Harness credibility and capacity limits

The source hashing, timestamped raw requests, preserved failed attempts, real TLS verification and real SQLite improve credibility. The existing result summary's 13 PASS/0 UNVERIFIED is a count of broad test cases, not a requirement-level verdict: important unknowns appear only inside details. Keep distinct criterion statuses in addition to case execution status.

The current load evidence records 822 intended arrivals, 621 generated and 201 generator drops across 18 runs. Of generated requests, 382 were useful, 136 rejected, and 103 classified as failed (101 expected during injected dependency failure and two in overload). Latencies include all generated outcomes and drops are visible. This accounting is appropriate. The generator shares a process/event loop with the service, uses fresh TLS connections, only 40 items and fixed scenario order; sustained runs last about one second of scheduled demand. Cache condition depends on preceding runs. These observations do not establish production capacity, a memory envelope, resource soak, scaling, filesystem-cold behavior or optimization speedup.

`scripts/load.mjs` marks every measurement PASS after accounting and leak assertions; it has no scenario-specific useful-completion, recovery, latency or throughput acceptance threshold. An all-failed normal/recovery workload could still pass those checks. Therefore its PASS is harness/accounting success, not an SLO verdict. Add explicit workload-specific criteria or label these runs as observations. The typecheck covers a standalone contract interface, not the service JavaScript's behavior or agreement with its actual returned schema.

DNS evidence genuinely uses a controlled UDP authority and real resolver and reports replacement use after 574.8373 ms, with 50 fresh TCP connections and zero remaining sockets. It accurately narrows negative caching to an application cache without SOA. IPv6, QUIC, recursive DNS behavior, NAT/descriptor pressure and blackholed half-open connections remain UNVERIFIED.

There is no overall score. F01 and F02 are sufficient to reject a blanket claim that the fixture preserves authorization and update invariants. The remaining passing observations remain useful evidence within their stated limits.
