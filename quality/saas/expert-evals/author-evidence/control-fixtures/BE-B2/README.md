# Runnable broken original
Node24 native TypeScript + actual node:sqlite; no install. Import init/enqueue/claim/complete/readJobs from service.ts. Use fresh disposable database path per scenario. Intentional defects: read/await/write claim race, stale completion updates by id without ownership token/expiry, invalid lease accepted. These simulate local storage concurrency and failover only.
