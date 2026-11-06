# BE-B2: repair SQLite worker lease ownership
Two worker instances consume a local SQLite queue. A slow worker completes after lease expiry/reclaim and overwrites the new owner's result. Sometimes both claim one job. Repair minimal native Node24 SQLite adapter. No broker, distributed lock library, dependency or new service. Disposable schema may change.

Requirements:
- B2-R1: concurrent claim(path,{now,worker,leaseMs}) with separate connections grants at most one current lease for one due job. Return {id,worker,token,leaseUntil,payload} or null. Eligible: pending dueAt<=now or processing leaseUntil<=now, ordered dueAt then id. Future jobs cannot starve due work.
- B2-R2: each reclaim has fresh fencing token; complete(path,claim,result,{now}) returns boolean, succeeds only current owner/token with unexpired lease. Expired/stale completion returns false without touching current state/result. Completed jobs never reappear.
- B2-R3: ownership survives connection/process restart; expired lease reclaimable, completed jobs ineligible. Reject noninteger/nonpositive leaseMs; bound lock waiting/retries; close connections on all exits. Injected now is authoritative, no wall-time override.
- B2-R4: local completion fencing does not prove arbitrary remote effects exactly once. State a valid provider-side ownership/idempotency approach and one operating limit of single-file topology. Implement this local path only.

Exports: init(path); enqueue(path,{id,payload,dueAt}); claim(path,{now,worker,leaseMs}); complete(path,claim,result,{now}); readJobs(path). Payload/result strings, numbers/strings JSON-safe. Preserve return shapes. Deliver fix/tests + handoff.md with causal interleaving, mechanism/alternative, limits and requirement evidence. No authentication/UI/deployment.

