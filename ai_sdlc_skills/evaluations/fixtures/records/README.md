# Deterministic v2 record fixtures

`positive/bundle.json` pins six complete stage artifacts, six handoffs, context,
authoritative stores and local sources for one isolated arithmetic example.
Every artifact is explicitly synthetic. The observations and receipts are
constructed fixture data; they are **not actual tests, releases, approvals or
host enforcement evidence**. A validator PASS only establishes the expected
data contract behavior.

Run `python -B scripts/validate_pack.py --self-test` from the pack root. The same
suite is discoverable with `python -B -m unittest discover -s scripts -p
test_validator.py`. It validates positive stages independently, then changes one
fact at a time to exercise negative outcomes, authority/evidence/revision
bindings, stage status separation, local file boundaries and migration.

For a new isolated copy, run `python -B scripts/fixture_records.py --output
NEW_DIRECTORY`. Generation refuses an existing destination. Behavioral scenario
fixtures and real host trial reports are separate evidence categories.
