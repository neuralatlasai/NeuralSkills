# Independent v2 implementation review

Seven material defects were reproduced from the current positive fixtures and isolated TEMP state. Source was read only. The initial failures are preserved in `initial-observations.json`; `probe.py capture` produces immutable receipts containing the actual command, raw stdout/stderr, exit code, probe digest and before/after source digests.

| ID | Defect and practical effect | Evidence |
|---|---|---|
| IR-1 | A PLAN requirement snapshot could change target 5 to 999 while its authoritative ledger kept target 5, yet baseline remained eligible. | `validate_pack.bundle_record_errors` omitted requirement snapshots. |
| IR-2 | An unresolved `blocks:['*']` issue in the authoritative ledger did not block DEPLOY acceptance. | Gate and eligibility checks considered embedded unresolved arrays only. |
| IR-3 | The grader validates completed BUILD/TEST artifacts without their bundle, causing valid positive artifacts to fail for absent execution journals. | Standalone `record_errors` fails while the same positive bundle passes eligibility. |
| IR-4 | A handoff whose task ID differs from its output artifact remains eligible. | Handoff output lookup binds stage and revision, but omitted task identity. |
| IR-5 | A Windows junction at the stage destination root directed packaging writes outside the requested output while returning PASS. | Actual junction probe wrote sibling TEMP `outside-output/SKILL.md`. |
| IR-6 | Failed runtime exits skip integrity and permission grading, hiding an actual protected-file tamper. | `grade_trial` returned INCONCLUSIVE and no assertions despite observed tamper. |
| IR-7 | A denied protected `fixture_write` attempt can still receive overall PASS. | Global denied-action check covered `fixture_act` only; successful E27 typo work concealed the attempted violation. |

The first captured rerun, `receipts-2026-10-16T081902.154041_0000.json`, observed rejection of IR-1, IR-2 and IR-5 after authors' fixes. IR-3 and IR-4 remained reproducible at that point. Source hashes changed during that capture, so those remain explicitly interim observations.

The final coherent-source rerun, `receipts-2026-10-16T082338.719882_0000.json`, rejected divergent requirements, authoritative blockers and wrong-task handoffs; rejected the actual Windows junction without an outside write; and rejected the unsafe manifest member. Both scoring probes now report FAIL with critical evidence visible, including after failed runtime execution. A targeted follow-up, `receipts-2026-10-16T082425.364037_0000.json`, verified that the current grader accepts the valid bundle-backed BUILD and TEST artifacts and their handoffs with no errors. The original standalone record checks still require external stores, which is expected; the grader now supplies them.

Source digests remained unchanged throughout each final run and match across both final runs. `final-assessment.json` binds those digests and receipts. **Zero material defects remain reproduced in the reviewed scope.** Initial failures are retained as failures and are not relabeled.

An additional initial in-memory API containment probe found that a digest-correct inventory could include `../escape.bin`: `validate_bundle` returned PASS and `zip_payload` emitted the unsafe member. The final probe now rejects that member. Current CLI filesystem enumeration did not naturally form this key, so the initial finding was an API validation gap, not a demonstrated CLI escape.

Top-level file symlink probes could not run because Windows denied symlink creation (WinError 1314). The observed directory-junction probe did run. No network, live client, production action or host qualification was involved. Model and host version identifiers remain unresolved.
