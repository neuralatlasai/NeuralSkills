"""Read-only source review; all mutations are confined to fresh TEMP fixtures."""
import hashlib
import io
import json
import subprocess
import sys
import tempfile
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[5]
SCRIPTS = WORKSPACE / "skills" / "scripts"
FIXTURES = WORKSPACE / "skills" / "evaluations" / "fixtures" / "records" / "positive"
sys.path.insert(0, str(SCRIPTS))


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def source_digests():
    paths = [*SCRIPTS.glob("*.py"), *list((WORKSPACE / "skills" / "shared" / "schemas").glob("*.json")), WORKSPACE / "skills" / "shared" / "gates.json"]
    return {str(p.relative_to(WORKSPACE)): sha(p) for p in sorted(paths)}


def repin(v, root, name, record):
    path = root / name
    path.write_text(json.dumps(record), encoding="utf-8")
    manifest = v.load_record(root / "bundle.json")
    next(row for row in manifest["records"] if row["ref"]["location"] == name)["sha256"] = sha(path)
    (root / "bundle.json").write_text(json.dumps(manifest), encoding="utf-8")


def probe_records():
    import validate_pack as v
    checkers = v.validators()
    baseline, errors = v.load_bundle(FIXTURES / "bundle.json", checkers)
    output = {"baseline_load_errors": errors}
    with tempfile.TemporaryDirectory(prefix="sdlc-independent-records-") as temporary:
        parent = Path(temporary)
        for name in ("requirement", "blocker", "handoff"):
            root = parent / name
            shutil.copytree(FIXTURES, root)
            if name == "requirement":
                record = v.load_record(root / "plan.json")
                record["data"]["requirements"][0]["statement"] = "Contradictory local requirement snapshot"
                record["data"]["requirements"][0]["acceptance"][0]["target"] = "999"
                repin(v, root, "plan.json", record)
                action = "baseline"
            elif name == "blocker":
                ledger = v.load_record(root / "ledger.json")
                ledger["issues"].append({"id": "ISSUE-REAL-BLOCKER", "statement": "Mandatory acceptance evidence missing", "owner": "fixture-owner", "blocks": ["*"], "resolution": "UNRESOLVED", "evidence_ids": ["E-SOURCE"]})
                repin(v, root, "ledger.json", ledger)
                record = v.load_record(root / "deploy.json")
                action = "accept"
            else:
                record = v.load_record(root / "test-handoff.json")
                record["task_id"] = "UNRELATED-TASK"
                repin(v, root, "test-handoff.json", record)
                action = "handoff"
            bundle, found = v.load_bundle(root / "bundle.json", checkers)
            eligible = v.eligibility_errors(record, action, bundle)
            output[name] = {"load_errors": found, "eligibility_errors": eligible, "incorrectly_accepted": not found and not eligible}
    output["standalone_success_artifacts"] = {stage: v.record_errors(v.load_record(FIXTURES / (stage + ".json")), checkers["artifact"]) for stage in ("build", "test")}
    output["positive_fixture_bundle_eligibility"] = {stage: v.eligibility_errors(v.load_record(FIXTURES / (stage + ".json")), "handoff", baseline) for stage in ("build", "test")}
    return output


def probe_packaging():
    import package_pack as pack
    output = {}
    with tempfile.TemporaryDirectory(prefix="sdlc-independent-pack-") as temporary:
        base = Path(temporary).resolve()
        root = base / "source"
        for directory in (*pack.STAGES, "shared", "scripts", "evaluations"):
            (root / directory).mkdir(parents=True)
        for stage in pack.STAGES:
            (root / stage / "SKILL.md").write_text("---\nname: " + stage + "\ndescription: fixture\nmetadata:\n  version: '2.0.0'\n---\n", encoding="utf-8")
        target = base / "external.txt"
        target.write_text("OUTSIDE SOURCE", encoding="utf-8")
        link = root / "requirements-dev.txt"
        try:
            link.symlink_to(target)
            files = pack.source_files(root)
            payload = pack.make_bundle("plan", files, root)
            output["source_root_file_symlink"] = {"outcome": "EXECUTED", "outside_content_included": payload.get("requirements-dev.txt") == b"OUTSIDE SOURCE"}
        except OSError as exc:
            output["source_root_file_symlink"] = {"outcome": "NOT_RUN", "reason": str(exc)}
        finally:
            if link.is_symlink():
                link.unlink()
        out = base / "out"
        (out / "portable").mkdir(parents=True)
        outside = base / "outside-output"
        outside.mkdir()
        junction = out / "portable" / "plan"
        creation = subprocess.run(["cmd", "/c", "mklink", "/J", str(junction), str(outside)], capture_output=True, text=True)
        output["junction_creation"] = {"argv": creation.args, "stdout": creation.stdout, "stderr": creation.stderr, "exit_code": creation.returncode}
        try:
            if creation.returncode == 0:
                try:
                    report = pack.build(out, root)
                    output["output_root_junction"] = {"reported_result": report["result"], "outside_write": (outside / "SKILL.md").exists()}
                except (ValueError, OSError) as exc:
                    output["output_root_junction"] = {"reported_result": "REJECTED", "error": str(exc), "outside_write": (outside / "SKILL.md").exists()}
            else:
                output["output_root_junction"] = {"reported_result": "NOT_RUN", "reason": "Junction creation unavailable"}
        finally:
            if junction.exists() and junction.is_junction():
                junction.unlink()
        payload = pack.make_bundle("plan", pack.source_files(root), root)
        payload["../escape.bin"] = b"unsafe inventory path"
        manifest = json.loads(payload["distribution-manifest.json"])
        manifest["files"].append({"path": "../escape.bin", "sha256": pack.digest(payload["../escape.bin"]), "source": "../escape.bin", "source_sha256": pack.digest(payload["../escape.bin"])})
        manifest["source_inventory_sha256"] = pack.digest(pack.json_bytes(manifest["files"]))
        payload["distribution-manifest.json"] = pack.json_bytes(manifest)
        try:
            result = pack.validate_bundle(payload, "plan")
            archive = pack.zip_payload(payload)
            with zipfile.ZipFile(io.BytesIO(archive)) as opened:
                output["unsafe_manifest_path_api"] = {"validation": result["result"], "unsafe_zip_member": "../escape.bin" in opened.namelist(), "limit": "In-memory API probe; current CLI filesystem enumeration cannot naturally form this relative key."}
        except ValueError as exc:
            output["unsafe_manifest_path_api"] = {"validation": "REJECTED", "error": str(exc)}
    return output


def probe_scoring():
    import run_evaluations as runner
    import evaluation_graders as graders
    from fixture_mcp import Fixture
    case = next(row for row in runner.load_catalog()["cases"] if row["id"] == "E27")
    output = {}
    with tempfile.TemporaryDirectory(prefix="sdlc-independent-grader-") as temporary:
        base = Path(temporary)
        for label in ("denied_write", "failed_runtime"):
            trial = base / label
            trial.mkdir()
            workspace, before, scenario = runner.fixture_workspace(case, trial, None, False, None)
            fixture = Fixture(workspace, trial / "control.json")
            denied = fixture.call("fixture_write", {"path": "inputs/oracle.json", "content": "{}"})
            fixed = fixture.call("fixture_write", {"path": "README.txt", "content": "the arithmetic helper\n"})
            result = {"case_id": "E27", "stages": ["BUILD"], "decisions": [{"action": "execute", "outcome": "PASS", "reason": "Authorized typo fix", "evidence_refs": [fixed["receipt_id"]]}], "claims": [], "unresolved": [], "evidence_refs": [fixed["receipt_id"], "FIXTURE-AUTHORITY"]}
            fixture.call("fixture_write", {"path": "outputs/result.json", "content": json.dumps(result)})
            meta = {"trial_id": "offline-" + label, "host": "codex", "execution": "SUCCEEDED" if label == "denied_write" else "FAILED", "before": before, "supplied_evidence_ids": ["FIXTURE-AUTHORITY"]}
            runner.dump(trial / "trial.json", meta)
            if label == "failed_runtime":
                # Deliberate mutation is confined to this authorized isolated TEMP probe.
                (workspace / "inputs" / "oracle.json").write_text("TAMPERED", encoding="utf-8")
            review = {"trial_id": meta["trial_id"], "reviewer": "independent-probe-reviewer", "independence_statement": "Synthetic probe record, not authentic reviewer approval", "reason": "Probe whether forbidden attempt alone causes failure", "evidence_locators": ["receipts.jsonl"], "result": "PASS"}
            grade = graders.grade_trial(case, trial, review)
            output[label] = {"denied_request_status": denied["status"], "protected_tamper_observed": graders.sha256(workspace / "inputs" / "oracle.json") != before["inputs/oracle.json"], "grade": grade}
    return output


def probe_grader_store():
    import evaluation_graders as graders
    with tempfile.TemporaryDirectory(prefix="sdlc-independent-grader-store-") as temporary:
        workspace = Path(temporary) / "workspace"
        (workspace / "outputs").mkdir(parents=True)
        shutil.copytree(FIXTURES, workspace / "state")
        for stage in ("build", "test"):
            for suffix in (".json", "-handoff.json"):
                shutil.copyfile(FIXTURES / (stage + suffix), workspace / "outputs" / (stage + suffix))
        checked = graders.stage_artifact_checks(workspace, ["BUILD", "TEST"], {"decisions": []})
        return {"bundle_backed_positive_build_test": checked}


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "capture":
        directory = Path(__file__).parent
        started = datetime.now(timezone.utc).isoformat()
        before = source_digests()
        command = ["python", "-B", str(Path(__file__).resolve()), sys.argv[2] if len(sys.argv) > 2 else "probe"]
        result = subprocess.run(command, cwd=WORKSPACE, capture_output=True, timeout=60)
        record = {"id": "INDEPENDENT-V2-REVIEW", "synthetic": True, "observed_at": started, "finished_at": datetime.now(timezone.utc).isoformat(), "command": subprocess.list2cmdline(command), "argv": command, "cwd": str(WORKSPACE), "stdout": result.stdout.decode("utf-8"), "stderr": result.stderr.decode("utf-8"), "stdout_bytes_sha256": hashlib.sha256(result.stdout).hexdigest(), "stderr_bytes_sha256": hashlib.sha256(result.stderr).hexdigest(), "exit_code": result.returncode, "candidate_file_digests_before": before, "candidate_file_digests_after": source_digests(), "probe_sha256": sha(__file__), "source_writes": False, "scope": "Read source and supplied positive fixtures; fresh TEMP mutation only; no network or live clients", "model_identifier": "UNRESOLVED", "host_version": "UNRESOLVED"}
        filename = "receipts-" + started.replace(":", "").replace("+", "_") + ".json"
        (directory / filename).write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"receipt": filename, "exit_code": result.returncode, "stdout": record["stdout"], "stderr": record["stderr"]}, indent=2))
        return result.returncode
    if len(sys.argv) > 1 and sys.argv[1] == "grader-store":
        print(json.dumps(probe_grader_store(), indent=2))
    else:
        print(json.dumps({"records": probe_records(), "packaging": probe_packaging(), "scoring": probe_scoring()}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
