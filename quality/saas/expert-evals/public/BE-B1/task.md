# BE-B1: repair local reservation consistency
A Node24 service uses file-backed SQLite. reserve(path, command, hooks?) opens a separate connection per call. Concurrent requests sometimes oversell or repeat local reservation events. A caller may lose acknowledgement after commit and retry. Fix the small fixture, preserving init/reserve/readState exports. All data is disposable synthetic data; init schema may change. This is a local transactional effect log, not external messaging/payment. No framework, server database, broker, distributed lock or dependency.

Requirements:
- B1-R1: stock=5, two concurrent different keys each qty=4 yield one reserved and one sold_out; stock never negative and each accepted reservation has exactly one local event. Enforce storage/transaction invariants, not a process-only mutex.
- B1-R2: same tenant+operation(reserve)+key and same sku/qty replay one durable outcome, even concurrently or across restart. Same key with different sku/qty returns conflict without another effect. Different tenants use same key independently; keys never authorize cross-tenant replay.
- B1-R3: stock change, durable receipt and local event are atomic. hooks.failBeforeCommit=true rolls back all three. hooks.failAfterCommit=true simulates lost acknowledgement after local commit; retry reconciles without decrement/event duplication. Define this simulation's boundary.
- B1-R4: reject noninteger/nonpositive qty before mutation. Bind SQL values and close connections on every exit. Explain SQLite contention and bounded busy/retry policy; no unbounded-concurrency or remote-exactly-once guarantee.

Command {tenant:string,key:string,sku:string,qty:number}; return {status:'reserved'|'sold_out'|'conflict',reservationId?:string}; invalid input may throw. init(path,stock=5) creates SKU widget for tenants red and blue. readState returns {stock:[{tenant,sku,qty}],receipts:[...],events:[...]}. Optional hooks are fault injection, preserve meanings rather than faulty ordering. Add focused tests and handoff.md with requirement→mechanism→limit→failure→executed evidence. Scope is storage path; no network/auth system.

