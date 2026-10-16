"""Copy a v1 record to an explicitly unqualified v2 draft; never edit history.

Preserves the exact input bytes beside the new draft and writes a migration
receipt. Fresh evidence, local bundle stores and action qualification are needed
before eligibility. Refuses all destination collisions.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path

from validate_pack import ROOT, VERSION, gate_registry, load_record, record_errors, validators, walk


def migrate(record, kind, digest):
    if record.get("schema_version") != "1.0.0":
        raise ValueError("Migration accepts schema_version 1.0.0 only; never silently rewrites v2")
    result = copy.deepcopy(record)
    result["schema_version"] = VERSION
    result["id"] = "MIGRATED-" + digest[:16]
    result["revision"] = "migration-" + digest[:16]
    if kind == "context":
        blank = load_record(ROOT / "shared/templates/context.json")
        result["state_stores"] = blank["state_stores"]
        for parameter in result["parameters"].values():
            parameter.update(state="UNRESOLVED", authority="UNRESOLVED", evidence_ids=[], rationale="Migrated value retained as unqualified input; re-establish v2 evidence and stores")
        return result
    if kind not in ("artifact", "handoff"):
        raise ValueError("Only artifact, handoff and context records can be migrated")
    result.setdefault("synthetic", False)
    status = result["status"]
    status.update(artifact="DRAFT", execution="UNKNOWN" if status["execution"] != "NOT_RUN" else "NOT_RUN", verification="STALE", approval="NOT_REQUESTED")
    for _, item in walk(result):
        if {"authority", "policy", "artifact_refs", "expires_at"} <= item.keys():
            item.update(id="UNRESOLVED", revision="UNRESOLVED", status="NOT_REQUESTED", actions=[], target_refs=[], configuration_refs=[])
        if "result" in item and item["result"] == "PASS":
            item["result"] = "STALE"
        if {"operation_key", "input_revision", "receipt", "retries_used"} <= item.keys():
            item.update(stage=result["stage"], task_id=result["task_id"], subject_ref={"id":"UNRESOLVED","revision":"UNRESOLVED","location":"UNRESOLVED"}, target_ref={"id":"UNRESOLVED","revision":"UNRESOLVED","location":"UNRESOLVED"}, authorization_ref={"id":"UNRESOLVED","revision":"UNRESOLVED","location":"UNRESOLVED"}, configuration_refs=[], evidence_ids=[], execution="UNKNOWN")
    result["gates"] = [{"id": gid, "action": action, "outcome": "BLOCKED", "criteria": ["Requalify migrated record against the v2 " + gid + " criterion"], "input_refs": [], "control_ids": [], "evidence_ids": [], "owner": "UNRESOLVED", "rationale": "Legacy observations preserved in original bytes; v2 eligibility not established", "applicability_authority": "UNRESOLVED"} for gid, action in gate_registry()[result["stage"]]["gates"].items()]
    result["unresolved"].append({"id":"V2-MIGRATION-REQUALIFICATION","statement":"Restore authoritative stores, bind exact revisions and requalify active evidence/authority before dependent action","owner":"UNRESOLVED","blocks":["*"],"resolution":"UNRESOLVED","evidence_ids":[]})
    return result


def migrate_file(source: Path, destination: Path, kind: str):
    if source.resolve() == destination.resolve():
        raise ValueError("Migration must write a new path")
    original = Path(str(destination) + ".original")
    receipt = Path(str(destination) + ".migration.json")
    if any(p.exists() for p in (destination, original, receipt)):
        raise ValueError("Destination draft/original/receipt already exists; no files overwritten")
    raw = source.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    result = migrate(load_record(source), kind, digest)
    errors = record_errors(result, validators()[kind])
    if errors:
        raise ValueError("Migrated structural validation failed: " + "; ".join(errors))
    rendered = (json.dumps(result, indent=2) + "\n").encode("utf-8")
    if destination.suffix.lower() == ".md":
        rendered = ("# Migrated v2 draft\n\nHistorical observations are preserved in the adjacent original; eligibility is unqualified.\n\n```json\n" + json.dumps(result, indent=2) + "\n```\n").encode("utf-8")
    report = {"schema_version": VERSION, "source_schema": "1.0.0", "source": source.name, "source_sha256": digest, "output": destination.name, "output_sha256": hashlib.sha256(rendered).hexdigest(), "original_copy": original.name, "result": "DRAFT_REQUIRES_REQUALIFICATION", "historical_input_modified": False, "eligibility": "NOT_ESTABLISHED", "changes": ["New record identity/revision", "Draft, stale verification and unknown historical execution", "Active approval and gates cleared", "Pinned v2 state stores and new evidence must be supplied"]}
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive opens enforce the preflight refusal even on a concurrent collision.
    for path, payload in ((original, raw), (destination, rendered), (receipt, (json.dumps(report, indent=2) + "\n").encode("utf-8"))):
        with path.open("xb") as output:
            output.write(payload)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--kind", required=True, choices=("artifact", "handoff", "context"))
    args = parser.parse_args()
    try:
        print(json.dumps(migrate_file(args.input, args.output, args.kind), indent=2))
    except (ValueError, OSError) as exc:
        parser.exit(2, str(exc) + "\n")
