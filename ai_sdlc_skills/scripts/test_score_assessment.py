"""Scoring regressions: absent/changed evidence cannot turn into a passing score."""
import copy
import json
import tempfile
import unittest
from pathlib import Path

import score_assessment as scorer


class AssessmentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="sdlc-score-test-")
        self.workspace = Path(self.temp.name)
        self.policy = json.loads((scorer.ROOT / "evaluations" / "assessment-policy.json").read_text(encoding="utf-8"))
        self.release = self.workspace / "release.json"
        self.release.write_text(json.dumps({"source_manifest_sha256": "a" * 64}), encoding="utf-8")
        self.receipt = self.workspace / "receipt.txt"
        self.receipt.write_text("Synthetic evidence for algorithm testing only", encoding="utf-8")
        self.evidence = {
            "policy_sha256": scorer.sha256(scorer.ROOT / "evaluations" / "assessment-policy.json"),
            "candidate_sha256": "a" * 64,
            "release_manifest": {"path": "release.json", "sha256": scorer.sha256(self.release)},
            "assertions": [], "critical_failures": []}

    def tearDown(self):
        self.temp.cleanup()

    def all_pass(self):
        result = copy.deepcopy(self.evidence)
        for dimension in self.policy["dimensions"]:
            for assertion in dimension["assertions"]:
                result["assertions"].append({"scope": "ALL", "assertion_id": assertion["id"], "result": "PASS",
                    "evidence": [{"path": "receipt.txt", "sha256": scorer.sha256(self.receipt), "locator": "synthetic"}],
                    "reviewer": "synthetic algorithm test", "rationale": "Synthetic PASS; not real assessment evidence"})
        return result

    def test_absence_is_not_run_and_zero(self):
        result = scorer.score(self.policy, self.evidence, self.workspace)
        self.assertEqual(result["result"], "NOT_QUALIFIED")
        self.assertEqual(result["scorecards"]["PLAN"]["mean_score"], 0)

    def test_complete_synthetic_evidence_scores_ten(self):
        result = scorer.score(self.policy, self.all_pass(), self.workspace)
        self.assertEqual(result["result"], "PASS")
        self.assertEqual(result["scorecards"]["SHARED"]["mean_score"], 10)

    def test_missing_evidence_rejects_pass(self):
        data = self.all_pass()
        data["assertions"][0]["evidence"] = []
        with self.assertRaisesRegex(ValueError, "no evidence"):
            scorer.score(self.policy, data, self.workspace)

    def test_changed_receipt_is_rejected(self):
        data = self.all_pass()
        self.receipt.write_text("changed", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "changed evidence"):
            scorer.score(self.policy, data, self.workspace)

    def test_different_candidate_is_rejected(self):
        data = self.all_pass()
        data["candidate_sha256"] = "b" * 64
        with self.assertRaisesRegex(ValueError, "candidate differs"):
            scorer.score(self.policy, data, self.workspace)

    def test_critical_failure_blocks_full_score(self):
        data = self.all_pass()
        data["critical_failures"] = [{"case": "SYNTHETIC", "reason": "synthetic unauthorized write"}]
        result = scorer.score(self.policy, data, self.workspace)
        self.assertEqual(result["result"], "NOT_QUALIFIED")
        self.assertEqual(result["scorecards"]["BUILD"]["mean_score"], 10)

    def test_single_weak_dimension_cannot_hide_in_mean(self):
        data = self.all_pass()
        data["assertions"][0]["result"] = "NOT_RUN"
        result = scorer.score(self.policy, data, self.workspace)
        self.assertGreater(result["scorecards"]["PLAN"]["mean_score"], 9)
        self.assertEqual(result["scorecards"]["PLAN"]["result"], "NOT_QUALIFIED")


if __name__ == "__main__":
    unittest.main()
