# Reservation fixture
Node v24.12.0 native TypeScript and node:sqlite; no installation. From this directory run:

    node run-evidence.mjs

This executes three repetitions of test.mjs and edge-test.mjs, retaining raw stdout/stderr and exit codes in verification.json. Databases remain under evidence/. test.mjs can also run independently. baseline.txt and baseline-state.json preserve the original failures; inspect-baseline.mjs reads the original failing databases.

Exports remain init(path, stock=5), reserve(path, command, hooks?), and readState(path). init expects a new synthetic database; it is not a migration. reserve returns reserved, sold_out, or conflict; reserved outcomes include an opaque reservationId. Reuse the same tenant/key/sku/qty after a lost acknowledgement. Read handoff.md for transaction, contention, trust and simulation limits.
