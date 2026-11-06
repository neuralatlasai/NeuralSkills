# Engineering checks

Use ISO/IEC/IEEE 29148:2018 for sourced verifiable requirements and 42010:2022 for relevant concerns, views, owners and relationships. Public scope was inspected; full normative conformance is unverified.

Retain requirement -> mechanism -> operating limit -> failure -> verification. Keep identity, contracts and state authority consistent across writers.

Inspect the stack/lockfile. Use explicit types where supported, validate untrusted inputs at runtime, enforce invariants atomically in the real database, and bound work/retries/deadlines. Run existing compiler/build/lint and affected contract, concurrency, authorization, fault and recovery checks. JavaScript checked only by syntax/integration is not fully typechecked. Preserve failures and unsupported boundaries.
