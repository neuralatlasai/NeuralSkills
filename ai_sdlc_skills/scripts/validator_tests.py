"""Independent positive, contradiction, bundle-boundary and migration regressions.

All fixtures are explicitly synthetic. Tests establish deterministic contract
behavior only; no host, model, tool containment or product correctness claim.
"""
from __future__ import annotations

import copy
import hashlib
import io
import json
import shutil
import subprocess
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

import validate_pack as v
from migrate_records import migrate_file

FIXTURES = v.ROOT / "evaluations/fixtures/records/positive"
NOW = datetime(2026, 10, 16, 8, tzinfo=timezone.utc)


class ValidatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.checkers = v.validators()
        cls.bundle, errors = v.load_bundle(FIXTURES / "bundle.json", cls.checkers, NOW)
        if errors:
            raise AssertionError("Golden bundle invalid: " + "; ".join(errors))

    def record(self, name):
        return v.load_record(FIXTURES / (name + ".json"))

    def errors(self, item, kind="artifact"):
        return v.record_errors(item, self.checkers[kind], self.bundle, NOW)

    def assert_error(self, errors, fragment):
        self.assertTrue(any(fragment in error for error in errors), f"Expected '{fragment}', observed {errors}")

    def test_pack_templates_remain_honest_drafts(self):
        for name in v.TEMPLATES:
            item = v.load_record(v.ROOT / "shared/templates" / (name + ".md"))
            self.assertEqual([], self.errors(item))
            self.assertEqual("DRAFT", item["status"]["artifact"])
            self.assertTrue(all(g["outcome"] == "BLOCKED" for g in item["gates"]))

    def test_execution_success_does_not_imply_test_acceptance(self):
        item = self.record("test")
        item["status"].update(artifact="DRAFT", verification="FAILED", approval="NOT_REQUESTED")
        item["approval"]["status"] = "NOT_REQUESTED"
        item["data"]["results"][0]["result"] = "FAIL"
        item["gates"][2]["outcome"] = "FAIL"
        self.assertEqual([], self.errors(item))
        self.assert_error(v.eligibility_errors(item, "accept", self.bundle, NOW), "TEST-EXIT")

    def test_deployment_execution_success_does_not_imply_health_acceptance(self):
        item = self.record("deploy")
        item["status"].update(artifact="DRAFT", verification="FAILED")
        item["data"]["postchecks"][0]["result"] = "FAIL"
        item["gates"][3]["outcome"] = "FAIL"
        self.assertEqual([], self.errors(item))
        self.assert_error(v.eligibility_errors(item, "accept", self.bundle, NOW), "REL-POST")

    def test_business_details_are_not_reinterpreted_as_control_records(self):
        item = self.record("design")
        item["data"]["interfaces"][0]["details"]["example_payload"] = {"result":"PASS", "execution":"NOT_RUN"}
        self.assertEqual([], self.errors(item))

    def test_context_unrelated_unknown_does_not_block_authorized_action(self):
        bundle = copy.deepcopy(self.bundle)
        bundle["context"]["parameters"]["alert_policy"]["state"] = "UNRESOLVED"
        self.assertEqual([], v.eligibility_errors(self.record("build"), "execute", bundle, NOW))

    def test_resolved_values_preserve_zero_false_and_empty_subcollections(self):
        for value in (0, False, {"permission": False, "count": 0, "exclusions": []}):
            item = self.record("context")
            item["parameters"]["resource_budgets"]["value"] = value
            self.assertEqual([], self.errors(item, "context"))

    def test_unknown_previous_retry_is_honest_but_new_execution_is_blocked(self):
        item = self.record("deploy")
        operation = item["data"]["journal"][0]
        operation.update(execution="UNKNOWN", retries_used=2)
        item["status"].update(artifact="DRAFT", execution="UNKNOWN", verification="INCONCLUSIVE")
        item["gates"][3]["outcome"] = "BLOCKED"
        self.assertEqual([], self.errors(item))
        bundle = copy.deepcopy(self.bundle)
        bundle["actions"] = [a for a in bundle["actions"] if a["stage"] != "DEPLOY"] + [copy.deepcopy(operation)]
        self.assert_error(v.eligibility_errors(item, "execute", bundle, NOW), "reconcile UNKNOWN")
        bundle["actions"][-1]["execution"] = "FAILED"
        item["data"]["journal"][0]["execution"] = "FAILED"
        self.assertEqual([], v.eligibility_errors(item, "execute", bundle, NOW))

    def test_preexecution_release_does_not_require_postchecks_or_journal(self):
        item = self.record("deploy")
        item["status"].update(artifact="DRAFT", execution="NOT_RUN", verification="NOT_RUN")
        item["data"].update(postchecks=[], journal=[])
        item["gates"][3]["outcome"] = "BLOCKED"
        self.assertEqual([], self.errors(item))
        self.assertEqual([], v.eligibility_errors(item, "execute", self.bundle, NOW))

    def test_build_execution_can_be_authorized_before_candidate_exists(self):
        item = self.record("build")
        item["status"].update(artifact="DRAFT", execution="NOT_RUN", verification="NOT_RUN")
        item["data"]["generated_artifacts"] = []
        item["approval"].update(artifact_refs=[item["data"]["base"]], target_refs=[item["data"]["repository"]])
        for gate in item["gates"][1:]: gate["outcome"] = "BLOCKED"
        self.assertEqual([], v.eligibility_errors(item, "execute", self.bundle, NOW))

    def test_handoff_cannot_bypass_invalid_output_artifact(self):
        bundle = copy.deepcopy(self.bundle)
        for kind, item, path in bundle["records"]:
            if kind == "artifact" and item["stage"] == "TEST":
                item["data"]["results"] = []
        self.assert_error(v.eligibility_errors(self.record("test-handoff"), "handoff", bundle, NOW), "completion lacks results")

    def test_handoff_from_other_task_cannot_reuse_current_output(self):
        item = self.record("test-handoff")
        item["task_id"] = "UNRELATED-TASK"
        self.assert_error(v.eligibility_errors(item, "handoff", self.bundle, NOW), "task differs")
        self.assert_error(self.errors(item, "handoff"), "stage/task binding")

    def test_handoff_cannot_embed_unrelated_subject_operation(self):
        item = self.record("test-handoff")
        item["actions"][0]["subject_ref"] = self.record("deploy")["data"]["target"]
        self.assert_error(v.eligibility_errors(item, "handoff", self.bundle, NOW), "subject differs")

    def test_wrong_subject_same_revision_receipt_cannot_justify_test_execution(self):
        item = self.record("test")
        bundle = copy.deepcopy(self.bundle)
        for operation in bundle["actions"]:
            if operation["stage"] == "TEST":
                operation["subject_ref"] = self.record("deploy")["data"]["target"]
        self.assert_error(v.record_errors(item, self.checkers["artifact"], bundle, NOW), "lacks successful action receipt")

    def test_wrong_task_receipt_cannot_justify_build_execution(self):
        item = self.record("build")
        bundle = copy.deepcopy(self.bundle)
        for operation in bundle["actions"]:
            if operation["stage"] == "BUILD": operation["task_id"] = "OTHER-TASK"
        self.assert_error(v.record_errors(item, self.checkers["artifact"], bundle, NOW), "lacks successful action receipt")

    def test_wrong_scope_grant_cannot_justify_build_receipt(self):
        bundle = copy.deepcopy(self.bundle)
        bundle["approvals"]["APPROVAL-BUILD"]["artifact_refs"] = [self.record("deploy")["data"]["target"]]
        self.assert_error(v.eligibility_errors(self.record("build"), "handoff", bundle, NOW), "relied operation")

    def test_required_design_record_cannot_be_empty_placeholder(self):
        item = self.record("design")
        item["data"]["interfaces"][0].update(owner="UNRESOLVED", details={}, evidence_ids=[])
        self.assert_error(v.eligibility_errors(item, "baseline", self.bundle, NOW), "placeholder")

    def test_requirement_acceptance_cannot_keep_unresolved_target(self):
        item = self.record("plan")
        item["data"]["requirements"][0]["acceptance"][0]["target"] = "UNRESOLVED"
        self.assert_error(v.eligibility_errors(item, "baseline", self.bundle, NOW), "acceptance criterion")

    def test_stale_trace_prevents_final_acceptance(self):
        item = self.record("test")
        item["trace"][0]["state"] = "STALE"
        self.assert_error(v.eligibility_errors(item, "accept", self.bundle, NOW), "current trace")

    def test_test_matrix_obligation_cannot_disappear_from_results(self):
        item = self.record("test")
        item["data"]["test_matrix"][0]["requirement_ids"].append("REQ-OTHER")
        self.assert_error(v.eligibility_errors(item, "accept", self.bundle, NOW), "planned obligations")

    def test_requirement_snapshot_cannot_change_acceptance_target(self):
        errors = self.mutate_bundle(lambda root: self.rewrite(root, "plan.json", lambda item: item["data"]["requirements"][0]["acceptance"][0].update(target="999")))
        self.assert_error(errors, "requirements snapshot differs")

    def test_decision_snapshot_cannot_change_selected_alternative(self):
        item = self.record("design")
        item["decisions"][0]["selection"] = "loop increments"
        self.assert_error(v.bundle_record_errors(item, self.bundle), "decisions snapshot differs")

    def test_global_authoritative_issue_blocks_release_even_if_local_snapshot_omits_it(self):
        bundle = copy.deepcopy(self.bundle)
        bundle["issues"]["GLOBAL-GAP"] = {"id":"GLOBAL-GAP", "statement":"Independent fixture blocker", "owner":"fixture-owner", "blocks":["*"], "resolution":"UNRESOLVED", "evidence_ids":[]}
        self.assert_error(v.eligibility_errors(self.record("deploy"), "accept", bundle, NOW), "GLOBAL-GAP")

    def test_unrelated_stage_issue_does_not_block_release_acceptance(self):
        bundle = copy.deepcopy(self.bundle)
        bundle["issues"]["BUILD-GAP"] = {"id":"BUILD-GAP", "statement":"Another scoped fixture issue", "owner":"fixture-owner", "blocks":["BUILD:execute"], "resolution":"UNRESOLVED", "evidence_ids":[]}
        self.assertEqual([], v.eligibility_errors(self.record("deploy"), "accept", bundle, NOW))

    def test_authoritative_global_blocker_is_detected_during_bundle_validation(self):
        issue = {"id":"GLOBAL-GAP", "statement":"Independent fixture blocker", "owner":"fixture-owner", "blocks":["*"], "resolution":"UNRESOLVED", "evidence_ids":[]}
        errors = self.mutate_bundle(lambda root: self.rewrite(root, "ledger.json", lambda item: item["issues"].append(issue)))
        self.assert_error(errors, "GLOBAL-GAP")

    def test_raw_source_bytes_are_digest_pinned_without_json_parsing(self):
        def mutate(root):
            raw = root / "sources/raw.py"
            raw.write_bytes(b"def add(a, b):\n    return a + b\n")
            self.rewrite(root, "bundle.json", lambda item: item["records"].append({"kind":"source", "ref":{"id":"RAW-SOURCE", "revision":"r1", "location":"sources/raw.py"}, "sha256":hashlib.sha256(raw.read_bytes()).hexdigest()}))
        self.assertEqual([], self.mutate_bundle(mutate))

    def test_relevant_missing_context_blocks_action(self):
        bundle = copy.deepcopy(self.bundle)
        bundle["context"]["parameters"]["tool_permissions"]["state"] = "UNRESOLVED"
        self.assert_error(v.eligibility_errors(self.record("build"), "execute", bundle, NOW), "tool_permissions")

    def test_unsupported_stage_action_rejected(self):
        self.assert_error(v.eligibility_errors(self.record("plan"), "execute", self.bundle, NOW), "unsupported")

    def test_drafting_does_not_require_downstream_execution_gates(self):
        item = self.record("deploy")
        for gate in item["gates"]:
            gate["outcome"] = "BLOCKED"
        item["status"].update(artifact="DRAFT", execution="NOT_RUN", verification="NOT_RUN")
        self.assertEqual([], self.errors(item))
        self.assertEqual([], v.eligibility_errors(item, "prepare", self.bundle, NOW))

    def test_duplicate_json_keys_rejected(self):
        with tempfile.TemporaryDirectory(prefix="skill-validator-") as temporary:
            path = Path(temporary) / "duplicate.json"
            path.write_text('{"status":"FAIL","status":"PASS"}')
            with self.assertRaisesRegex(ValueError, "Duplicate JSON key"):
                v.load_record(path)

    def test_markdown_requires_exactly_one_json_record(self):
        with tempfile.TemporaryDirectory(prefix="skill-validator-") as temporary:
            path = Path(temporary) / "two.md"
            path.write_text('```json\n{}\n```\n```json\n{}\n```\n')
            with self.assertRaisesRegex(ValueError, "exactly one"):
                v.load_record(path)

    def mutate_bundle(self, mutate):
        with tempfile.TemporaryDirectory(prefix="skill-validator-bundle-") as temporary:
            root = Path(temporary) / "bundle"
            shutil.copytree(FIXTURES, root)
            mutate(root)
            _, errors = v.load_bundle(root / "bundle.json", self.checkers, NOW)
            return errors

    @staticmethod
    def rewrite(root, name, mutate, repin=True):
        path = root / name
        item = v.load_record(path)
        mutate(item)
        path.write_text(json.dumps(item, indent=2) + "\n", encoding="utf-8")
        if repin and name != "bundle.json":
            manifest_path = root / "bundle.json"
            manifest = v.load_record(manifest_path)
            for entry in manifest["records"]:
                if entry["ref"]["location"] == name:
                    entry["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
            manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    def test_bundle_digest_tamper_rejected(self):
        errors = self.mutate_bundle(lambda root: self.rewrite(root, "sources/policy.json", lambda item: item.update(payload="tampered"), repin=False))
        self.assert_error(errors, "digest mismatch")

    def test_bundle_identity_revision_mismatch_rejected(self):
        errors = self.mutate_bundle(lambda root: self.rewrite(root, "plan.json", lambda item: item.update(revision="r2")))
        self.assert_error(errors, "identity/revision mismatch")

    def test_duplicate_bundle_ids_rejected(self):
        errors = self.mutate_bundle(lambda root: self.rewrite(root, "bundle.json", lambda item: item["records"].append(copy.deepcopy(item["records"][0]))))
        self.assert_error(errors, "duplicate/unresolved")

    def test_state_store_locator_mismatch_rejected(self):
        errors = self.mutate_bundle(lambda root: self.rewrite(root, "context.json", lambda item: item["state_stores"]["ledger"].update(revision="r2")))
        self.assert_error(errors, "state store ledger")

    def test_authoritative_duplicate_requirement_ids_rejected(self):
        errors = self.mutate_bundle(lambda root: self.rewrite(root, "ledger.json", lambda item: item["requirements"].append(copy.deepcopy(item["requirements"][0]))))
        self.assert_error(errors, "Duplicate authoritative requirements")

    def test_duplicate_operation_keys_rejected(self):
        errors = self.mutate_bundle(lambda root: self.rewrite(root, "execution_journal.json", lambda item: item["actions"].append(copy.deepcopy(item["actions"][0]))))
        self.assert_error(errors, "Duplicate authoritative operation")

    def test_actual_symbolic_link_denied(self):
        with tempfile.TemporaryDirectory(prefix="skill-validator-link-") as temporary:
            root = Path(temporary)
            target = root / "target"; target.mkdir()
            (target / "source.json").write_text("{}")
            link = root / "link"
            try:
                link.symlink_to(target, target_is_directory=True)
            except OSError:
                # NTFS junction creation does not require symbolic-link privilege.
                result = subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(target)], capture_output=True, text=True, timeout=10)
                self.assertEqual(0, result.returncode, result.stdout + result.stderr)
            with self.assertRaisesRegex(ValueError, "symlink"):
                v._contained(root, "link/source.json")

    def test_migration_preserves_original_and_marks_draft(self):
        with tempfile.TemporaryDirectory(prefix="skill-validator-migration-") as temporary:
            root = Path(temporary)
            old = self.record("deploy"); old["schema_version"] = "1.0.0"
            old["data"]["journal"][0]["retries_used"] = 2
            source, destination = root / "old.json", root / "new.json"
            source.write_text(json.dumps(old, indent=2), encoding="utf-8")
            raw = source.read_bytes()
            receipt = migrate_file(source, destination, "artifact")
            migrated = v.load_record(destination)
            self.assertEqual(raw, source.read_bytes())
            self.assertEqual(raw, Path(str(destination) + ".original").read_bytes())
            self.assertEqual("STALE", migrated["status"]["verification"])
            self.assertEqual("DRAFT", migrated["status"]["artifact"])
            self.assertEqual("UNKNOWN", migrated["status"]["execution"])
            self.assertEqual(2, migrated["data"]["journal"][0]["retries_used"])
            self.assertEqual([], self.errors(migrated))
            self.assertFalse(receipt["historical_input_modified"])
            with self.assertRaisesRegex(ValueError, "already exists"):
                migrate_file(source, destination, "artifact")

    def test_context_migration_does_not_invent_state_store_authority(self):
        with tempfile.TemporaryDirectory(prefix="skill-validator-migration-") as temporary:
            root = Path(temporary); old = self.record("context"); old["schema_version"] = "1.0.0"
            source, destination = root / "old.json", root / "new.json"
            source.write_text(json.dumps(old), encoding="utf-8")
            migrate_file(source, destination, "context")
            item = v.load_record(destination)
            self.assertEqual([], self.errors(item, "context"))
            self.assertTrue(all(p["state"] == "UNRESOLVED" for p in item["parameters"].values()))
            self.assertTrue(all(r["revision"] == "UNRESOLVED" for r in item["state_stores"].values()))


def positive(stage, handoff=False):
    def test(self):
        item = self.record(stage + ("-handoff" if handoff else ""))
        self.assertEqual([], self.errors(item, "handoff" if handoff else "artifact"))
        action = "handoff" if handoff else v.gate_registry()[stage.upper()]["final_action"]
        self.assertEqual([], v.eligibility_errors(item, action, self.bundle, NOW))
    return test


for _stage in v.STAGES:
    setattr(ValidatorTests, "test_positive_" + _stage, positive(_stage))
    setattr(ValidatorTests, "test_positive_" + _stage + "_handoff", positive(_stage, True))


MUTATIONS = [
    ("missing_gates", "test", lambda r: r.update(gates=[]), "required gate inventory", "structural"),
    ("duplicate_gates", "test", lambda r: r["gates"].append(copy.deepcopy(r["gates"][0])), "duplicate IDs", "structural"),
    ("noncanonical_gate_action", "test", lambda r: r["gates"][0].update(action="handoff"), "canonical registry", "structural"),
    ("empty_gate_evidence", "test", lambda r: r["gates"][0].update(evidence_ids=[]), "non-empty", "shape"),
    ("stale_evidence", "test", lambda r: r["evidence"][0].update(result="STALE"), "stale", "structural"),
    ("proposed_evidence", "test", lambda r: r["evidence"][0].update(claim_class="DESIGN_PROPOSAL"), "unsupported", "structural"),
    ("unresolved_evidence_source", "test", lambda r: r["evidence"][0]["source"].update(revision="UNRESOLVED"), "unsupported", "structural"),
    ("unresolved_gate_owner", "test", lambda r: r["gates"][0].update(owner="UNRESOLVED"), "owner unresolved", "structural"),
    ("absent_control", "test", lambda r: r["gates"][0].update(control_ids=["ABSENT"]), "control ABSENT absent", "structural"),
    ("proposed_control", "test", lambda r: r["controls"][0].update(authority_type="PROPOSED"), "not adopted", "structural"),
    ("control_proof_missing", "test", lambda r: r["controls"][0].update(proof_ids=[]), "required evidence absent", "structural"),
    ("hidden_blocker", "test", lambda r: r["unresolved"].append({"id":"GAP","statement":"fixture blocker","owner":"fixture-owner","blocks":["execute"],"resolution":"UNRESOLVED","evidence_ids":[]}), "unresolved blocking issue", "structural"),
    ("approval_axes_disagree", "test", lambda r: r["status"].update(approval="NOT_REQUESTED"), "Approval status differs", "structural"),
    ("pass_without_execution", "test", lambda r: r["data"]["results"][0].update(execution="NOT_RUN"), "PASS requires", "structural"),
    ("pass_without_evidence", "test", lambda r: r["data"]["results"][0].update(evidence_ids=[]), "required evidence absent", "structural"),
    ("pass_without_oracle", "test", lambda r: r["data"]["results"][0]["oracle"].update(revision="UNRESOLVED"), "environment/oracle", "structural"),
    ("dangling_requirement", "test", lambda r: r["data"]["results"][0].update(requirement_ids=["MISSING"]), "dangling requirement_ids", "bundle"),
    ("dangling_evidence", "test", lambda r: r["data"]["results"][0].update(evidence_ids=["MISSING"]), "dangling evidence_ids", "bundle"),
    ("stale_candidate_revision", "test", lambda r: r["data"]["candidate"].update(revision="r2"), "mismatched manifest reference", "bundle"),
    ("approval_snapshot_changed", "deploy", lambda r: r["data"]["authorization"].update(authority="other-owner"), "approval snapshot differs", "bundle"),
    ("approval_expired", "deploy", lambda r: r["data"]["authorization"].update(expires_at="2026-10-15T00:00:00Z"), "expired", "structural"),
    ("approval_expiry_unknown", "deploy", lambda r: r["data"]["authorization"].update(expires_at="UNRESOLVED"), "expiry policy unresolved", "structural"),
    ("approval_subject_mismatch", "deploy", lambda r: r["data"]["authorization"].update(artifact_refs=[r["data"]["target"]]), "exact subject", "eligible"),
    ("approval_target_mismatch", "deploy", lambda r: r["data"]["authorization"].update(target_refs=[r["data"]["candidate"]]), "target/configuration", "eligible"),
    ("approval_configuration_mismatch", "deploy", lambda r: r["data"]["authorization"].update(configuration_refs=[]), "target/configuration", "eligible"),
    ("approval_action_mismatch", "deploy", lambda r: r["data"]["authorization"].update(actions=["prepare"]), "action-bound", "eligible"),
    ("release_blocked_gate", "deploy", lambda r: r["gates"][2].update(outcome="BLOCKED"), "REL-EXEC", "eligible"),
    ("release_empty_journal", "deploy", lambda r: r["data"].update(journal=[]), "lacks successful journal", "eligible"),
    ("release_placeholder_recovery", "deploy", lambda r: r["data"]["recovery"][0].update(owner="UNRESOLVED", evidence_ids=[]), "recovery readiness", "eligible"),
    ("release_unknown_owner", "deploy", lambda r: r["data"].update(operating_owner="UNRESOLVED"), "operating owner", "eligible"),
    ("operation_unknown_receipt", "deploy", lambda r: r["data"]["journal"][0].update(receipt="UNRESOLVED"), "input/receipt", "structural"),
    ("operation_wrong_receipt", "deploy", lambda r: r["data"]["journal"][0].update(receipt="other.json"), "receipt not bound", "structural"),
    ("operation_wrong_target", "deploy", lambda r: r["data"]["journal"][0].update(target_ref=r["data"]["candidate"]), "binding mismatch", "eligible"),
    ("operation_wrong_subject", "deploy", lambda r: r["data"]["journal"][0].update(subject_ref=r["data"]["target"]), "binding mismatch", "eligible"),
    ("operation_wrong_config", "deploy", lambda r: r["data"]["journal"][0].update(configuration_refs=[]), "binding mismatch", "eligible"),
    ("operation_wrong_authority", "deploy", lambda r: r["data"]["journal"][0]["authorization_ref"].update(id="APPROVAL-PLAN"), "binding mismatch", "eligible"),
    ("resolved_null_context", "context", lambda r: r["parameters"]["risk_policy"].update(value=None), "concrete value", "structural"),
    ("resolved_empty_context", "context", lambda r: r["parameters"]["risk_policy"].update(value={}), "concrete value", "structural"),
    ("resolved_nested_unknown_context", "context", lambda r: r["parameters"]["risk_policy"].update(value={"permission":"UNRESOLVED"}), "concrete value", "structural"),
    ("resolved_dangling_evidence", "context", lambda r: r["parameters"]["risk_policy"].update(evidence_ids=["MISSING"]), "dangling evidence_ids", "bundle"),
]


def mutation(name, fixture, change, expected, layer):
    def test(self):
        item = self.record(fixture); change(item)
        if layer == "bundle":
            errors = v.bundle_record_errors(item, self.bundle)
        elif layer == "eligible":
            errors = v.eligibility_errors(item, "accept", self.bundle, NOW)
        else:
            errors = self.errors(item, "context" if fixture == "context" else "artifact")
        self.assert_error(errors, expected)
    return test


for _name, _fixture, _change, _expected, _layer in MUTATIONS:
    setattr(ValidatorTests, "test_reject_" + _name, mutation(_name, _fixture, _change, _expected, _layer))


def contained_case(location):
    def test(self):
        with tempfile.TemporaryDirectory(prefix="skill-validator-path-") as temporary:
            with self.assertRaises(ValueError):
                v._contained(Path(temporary), location)
    return test


for _index, _locator in enumerate(("../escape.json", "https://example.invalid/source", "file:///tmp/source", "%2e%2e/escape", "C:/outside.json", "source.json#x", "nested\\source.json")):
    setattr(ValidatorTests, f"test_reject_local_locator_{_index}", contained_case(_locator))


def run_tests(checkers=None):
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ValidatorTests)
    capture = io.StringIO()
    result = unittest.TextTestRunner(stream=capture, verbosity=1).run(suite)
    if not result.wasSuccessful():
        raise ValueError("Deterministic regression failed:\n" + capture.getvalue())
    if result.skipped:
        raise ValueError("Required deterministic regression skipped:\n" + capture.getvalue())
    return result.testsRun


if __name__ == "__main__":
    unittest.main()
