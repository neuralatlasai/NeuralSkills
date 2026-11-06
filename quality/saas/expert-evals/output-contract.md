Write `handoff.md` in the artifact. Keep it proportionate; prose or a compact table is fine.

1. Name the reproduced symptom, its causal path, and evidence that distinguishes it from a plausible alternative cause.
2. For each supplied requirement ID: requirement meaning → mechanism/file → operating limit → failure mode → actual test command/result. Link retained raw evidence when available. A proposed test is not an executed test.
3. Name one plausible alternative, why your chosen mechanism fits this fixture better, and a condition under which the alternative would become appropriate. Reject at least one unnecessary architectural addition with a specific reason.
4. Report what changed, compatibility and remaining limits. Distinguish implemented, specified, inherited, simulated and unperformed behavior.

Check statuses (identical both versions): PASS = executed evidence satisfies the stated check; FAIL = executed evidence contradicts it; UNVERIFIED = applicable but not executed or not observable; NOT_APPLICABLE = the check does not apply, with reason. Required FAIL or UNVERIFIED prevents an unqualified completion claim.

Optional existing backend coverage dispositions (identical both versions): IMPLEMENTED_OR_CHANGED = artifact changed this area; INHERITED_VERIFIED = unchanged and directly inspected/tested; OUT_OF_SCOPE = not needed here, reason supplied; RELEVANT_UNVERIFIED = relevant but lacks evidence. These are coverage labels, never test statuses. Do not fill all 24 areas for this bounded task unless doing so helps; there is no rubric point for inventory length.

No preferred API names beyond the fixture contract, required prose length, required mechanism, or numerical aesthetic rating. Honest limitations do not erase a failed requirement but are evidence of sound judgment.
