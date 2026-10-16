"""Deterministic synthetic record fixtures, never behavioral execution evidence."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path

from validate_pack import ROOT, STAGES, TEMPLATES, VERSION, gate_registry, load_record


def write_fixtures(destination: Path):
    destination.mkdir(parents=True, exist_ok=False)
    documents = {}

    def ref(identifier, location, revision="r1"):
        return {"id": identifier, "revision": revision, "location": location}

    def source(name, payload):
        identifier = "SOURCE-" + name.upper()
        location = "sources/" + name + ".json"
        documents[location] = ("source", {"id": identifier, "revision": "r1", "synthetic": True, "payload": payload})
        return ref(identifier, location)

    policy = source("policy", {"scope": "isolated arithmetic fixture", "expiry_policy": "no expiry for immutable synthetic fixture", "authority": "fixture-owner", "acceptance": "add(2,3)=5; no production access", "bounds": "one operation, no retry", "risk": "local synthetic example only"})
    candidate = source("candidate", {"function": "def add(a, b): return a + b", "immutable": True})
    environment = source("environment", {"id": "fixture-only", "isolated": True, "production": False})
    configuration = source("configuration", {"mode": "fixture", "network": False})
    oracle = source("oracle", {"independent_example": {"input": [2, 3], "expected": 5}, "authority": "fixture-owner"})
    repository = source("repository", {"base": "r1", "owned_files": ["app.py"], "contract": "add numbers"})
    receipt = source("receipt", {"synthetic_observation": "fixture receipt; no real test or deployment was performed", "result": "PASS", "actual_product_execution": False})
    decision_ref = ref("ADR-1", "ledger.json")
    requirement_ref = ref("REQ-1", "ledger.json")
    evidence = []
    for identifier, kind, source_ref in (("E-SOURCE", "SOURCE", policy), ("E-APPROVAL", "APPROVAL", policy), ("E-EXECUTION", "COMMAND", receipt), ("E-TEST", "TEST", receipt)):
        evidence.append({"id": identifier, "claim_class": "VERIFIED_FACT", "kind": kind, "source": source_ref, "observed_at": "2026-10-16T07:00:00+00:00", "observer": "synthetic-fixture-author", "method": "deterministic synthetic record construction", "execution": "SUCCEEDED", "result": "PASS", "limitations": ["Synthetic data, not observed behavioral or product evidence"], "classification": "public synthetic", "retention_policy": "retain fixture version"})
    control = {"id": "CTRL-1", "authority_type": "ORGANIZATIONAL", "authority": policy, "applicability": "APPLICABLE", "owner": "fixture-owner", "enforcement": "synthetic fixture boundary; not installed host enforcement", "coverage": ["fixture operations"], "bypass_paths": ["No real external enforcement claimed"], "timeout": "one fixture step", "error_policy": "block", "proof_ids": ["E-SOURCE"]}
    requirement = {"id": "REQ-1", "revision": "r1", "kind": "FUNCTIONAL", "statement": "The fixture adds two numbers", "claim_class": "PROVIDED_CONSTRAINT", "source_refs": [policy], "evidence_ids": ["E-SOURCE"], "rationale": "Independent arithmetic example", "priority": "fixture-only", "priority_authority": "fixture-owner", "acceptance": [{"id": "AC-1", "measure": "result of add(2,3)", "operator": "equals", "target": "5", "test_method": "independent arithmetic assertion", "authority": "fixture-owner", "evidence_ids": ["E-SOURCE"]}], "owner": "fixture-owner", "status": "APPROVED"}
    decision = {"id": "ADR-1", "revision": "r1", "question": "How to implement fixture addition?", "alternatives": ["direct addition", "loop increments"], "selection": "direct addition", "rationale": "Exact operation; no loop cost or behavior ambiguity", "authority": "fixture-owner", "evidence_ids": ["E-SOURCE"]}
    documents["ledger.json"] = ("ledger", {"schema_version": VERSION, "id": "LEDGER-1", "revision": "r1", "evidence": evidence, "controls": [control], "requirements": [requirement], "decisions": [decision], "issues": []})
    approvals, actions, edges = [], [], []

    def detail(stage, field, index=1):
        return {"id": f"{stage}-{field.upper()}-{index}", "revision": "r1", "claim_class": "VERIFIED_FACT", "summary": f"Synthetic {field.replace('_', ' ')} for arithmetic fixture", "owner": "fixture-owner", "evidence_ids": ["E-SOURCE"], "requirement_ids": ["REQ-1"], "details": {"synthetic": True, "scope": "isolated arithmetic only", "criterion": "add(2,3)=5", "alternatives": ["direct addition", "loop increments"], "failure_behavior": "raise for unsupported operands", "window": "one deterministic observation", "independence": "owner supplied arithmetic example", "compatibility": "no persistent schema", "recovery": "restore pinned fixture snapshot", "receiver": "fixture-owner", "accepted": True}}

    def check(stage, field):
        return {"id": f"{stage}-{field.upper()}-CHECK", "requirement_ids": ["REQ-1"], "method": "synthetic arithmetic assertion", "environment": environment, "oracle": oracle, "execution": "SUCCEEDED", "result": "PASS", "evidence_ids": ["E-TEST"], "limitations": ["Fixture consistency only; no real test was run"]}

    registry = gate_registry()
    for stage_lower, template in zip(STAGES, TEMPLATES):
        stage = stage_lower.upper()
        record = load_record(ROOT / "shared/templates" / (template + ".md"))
        record.update(id=stage + "-1", revision="r1", task_id="TASK-FIXTURE", synthetic=True)
        own = ref(record["id"], stage_lower + ".json")
        record["status"] = {"artifact": "BASELINED", "execution": "SUCCEEDED", "verification": "VERIFIED", "approval": "APPROVED"}
        record["input_refs"] = [policy, requirement_ref]
        record["evidence"] = copy.deepcopy(evidence)
        record["controls"] = [copy.deepcopy(control)]
        record["decisions"] = [copy.deepcopy(decision)]
        record["trace"] = [{"from": requirement_ref, "to": own, "relation": "SATISFIES", "evidence_ids": ["E-SOURCE"], "state": "CURRENT", "reason": "Synthetic arithmetic fixture mapping"}]
        edges.extend(copy.deepcopy(record["trace"]))
        for gate in record["gates"]:
            gate.update(outcome="PASS", input_refs=[policy], control_ids=["CTRL-1"], evidence_ids=["E-SOURCE"], owner="fixture-owner", rationale="Supported synthetic consistency fixture", applicability_authority="fixture-owner")
        data = record["data"]
        for key, value in list(data.items()):
            if isinstance(value, list):
                if key in ("non_goals", "scope", "change_scope"):
                    data[key] = ["isolated arithmetic fixture only"]
                elif key in ("constraints", "risks", "conflicts", "exclusions", "defects", "secret_refs", "infrastructure_changes", "migrations", "vulnerabilities", "dependencies", "change_proposals", "retirement", "ownership_transfer", "agent_evaluation"):
                    data[key] = []
                elif key == "requirements":
                    data[key] = [copy.deepcopy(requirement)]
                elif key in ("checks", "results", "prechecks", "postchecks", "data_quality", "verification"):
                    data[key] = [check(stage, key)]
                elif key in ("source_refs",):
                    data[key] = [policy]
                elif key in ("generated_artifacts",):
                    data[key] = [candidate]
                elif key in ("documentation",):
                    data[key] = [policy]
                elif key == "decision_refs":
                    data[key] = [decision_ref]
                elif key == "configuration_refs":
                    data[key] = [configuration]
                elif key == "journal":
                    data[key] = []
                else:
                    data[key] = [detail(stage, key)]
            elif isinstance(value, dict) and set(value) == {"id", "revision", "location"}:
                data[key] = repository if key in ("repository", "base") else candidate if key in ("head", "candidate", "release") else environment if key in ("environment", "target", "service") else policy
            elif isinstance(value, str):
                data[key] = "fixture-owner" if "owner" in key else "isolated arithmetic fixture"
        subjects = [candidate] if stage in ("BUILD", "TEST", "DEPLOY") else [own]
        targets = [environment] if stage in ("DEPLOY", "MAINTAIN") else subjects
        approval = {"id": "APPROVAL-" + stage, "revision": "r1", "status": "APPROVED", "authority": "fixture-owner", "policy": policy, "scope": ["isolated arithmetic fixture"], "artifact_refs": subjects, "expires_at": "NONE", "evidence_ids": ["E-APPROVAL"], "actions": list(registry[stage]["actions"]), "target_refs": targets, "configuration_refs": [configuration] if stage == "DEPLOY" else []}
        approvals.append(copy.deepcopy(approval)); record["approval"] = copy.deepcopy(approval)
        if stage == "DEPLOY": data["authorization"] = copy.deepcopy(approval)
        if stage == "MAINTAIN": data["remediation_authority"] = copy.deepcopy(approval)
        action = {"operation_key": "OP-" + stage, "action": "execute" if "execute" in registry[stage]["actions"] else "baseline", "target": targets[0]["id"], "input_revision": subjects[0]["revision"], "execution": "SUCCEEDED", "receipt": receipt["location"], "retries_used": 0, "target_ref": targets[0], "configuration_refs": [configuration] if stage == "DEPLOY" else [], "authorization_ref": ref(approval["id"], "approval_registry.json"), "evidence_ids": ["E-EXECUTION"]}
        action.update(stage=stage, task_id="TASK-FIXTURE", subject_ref=subjects[0])
        actions.append(copy.deepcopy(action))
        if stage == "DEPLOY": data["journal"] = [copy.deepcopy(action)]
        documents[stage_lower + ".json"] = ("artifact", record)
        handoff = load_record(ROOT / "shared/templates/handoff.json")
        handoff.update(id="HANDOFF-" + stage, revision="r1", task_id="TASK-FIXTURE", stage=stage, synthetic=True, input_refs=copy.deepcopy(record["input_refs"]), output_refs=[own], evidence=copy.deepcopy(evidence), controls=[copy.deepcopy(control)], decisions=[copy.deepcopy(decision)], unresolved=[], gates=copy.deepcopy(record["gates"]), trace=copy.deepcopy(record["trace"]), actions=[copy.deepcopy(action)], next_consumer="fixture-reviewer", next_authority="fixture-owner", requested_action="handoff", status=copy.deepcopy(record["status"]))
        documents[stage_lower + "-handoff.json"] = ("handoff", handoff)
    documents["approval_registry.json"] = ("approval_registry", {"schema_version": VERSION, "id": "APPROVAL-REGISTRY-1", "revision": "r1", "approvals": approvals})
    documents["execution_journal.json"] = ("execution_journal", {"schema_version": VERSION, "id": "JOURNAL-1", "revision": "r1", "actions": actions})
    documents["trace_graph.json"] = ("trace_graph", {"schema_version": VERSION, "id": "GRAPH-1", "revision": "r1", "trace": edges})
    context = load_record(ROOT / "shared/templates/context.json")
    context.update(id="CONTEXT-1", project_id="PROJECT-SYNTHETIC-ARITHMETIC", revision="r1")
    for name, parameter in context["parameters"].items():
        parameter.update(state="RESOLVED", value={"synthetic": True, "source": policy, "bounded_value": name + " for isolated fixture only"}, authority="fixture-owner", evidence_ids=["E-SOURCE"], owner="fixture-owner", blocks=[], rationale="Explicit synthetic fixture policy; not a real project default")
    context["state_stores"] = {"manifest": ref("BUNDLE-1", "bundle.json"), "ledger": ref("LEDGER-1", "ledger.json"), "trace_graph": ref("GRAPH-1", "trace_graph.json"), "approval_registry": ref("APPROVAL-REGISTRY-1", "approval_registry.json"), "execution_journal": ref("JOURNAL-1", "execution_journal.json")}
    documents["context.json"] = ("context", context)
    manifest = {"schema_version": VERSION, "id": "BUNDLE-1", "revision": "r1", "records": []}
    for location, (kind, item) in sorted(documents.items()):
        path = destination / location
        path.parent.mkdir(parents=True, exist_ok=True)
        data = (json.dumps(item, indent=2) + "\n").encode("utf-8")
        path.write_bytes(data)
        manifest["records"].append({"kind": kind, "ref": ref(item["id"], location), "sha256": hashlib.sha256(data).hexdigest()})
    (destination / "bundle.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="New directory; refuses overwrites")
    args = parser.parse_args()
    write_fixtures(args.output)
