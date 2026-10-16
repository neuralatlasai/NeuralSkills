"""Offline v2 structural and action-eligibility checks; never release authority.

No network retrieval or live tool execution. Eligibility establishes consistency
of supplied records, not authentic identity, truthful observations or enforcement.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

try:
    import yaml
    from jsonschema import Draft202012Validator, FormatChecker
    from referencing import Registry, Resource
except ImportError as exc:
    raise SystemExit(f"Missing dependency {exc.name}; install requirements-dev.txt")

ROOT = Path(__file__).resolve().parents[1]
VERSION = "2.0.0"
STAGES = ("plan", "design", "build", "test", "deploy", "maintain")
TEMPLATES = ("intent", "architecture", "build-record", "test-report", "release-record", "maintenance-record")
KINDS = ("artifact", "handoff", "context", "ledger", "approval_registry", "trace_graph", "execution_journal", "bundle")
ACTIONS = ("draft", "baseline", "prepare", "execute", "accept", "close", "handoff")
UNKNOWN = (None, "", "UNRESOLVED", "UNKNOWN", "latest")


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def load_record(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".md":
        blocks = re.findall(r"^```json[^\S\n]*\n(.*?)^```[^\S\n]*$", text, re.M | re.S)
        if len(blocks) != 1:
            raise ValueError(f"{path.name}: expected exactly one fenced JSON artifact")
        text = blocks[0]
    value = json.loads(text, object_pairs_hook=_unique_object)
    if not isinstance(value, dict):
        raise ValueError(f"{path.name}: record must be an object")
    return value


def gate_registry() -> dict:
    return load_record(ROOT / "shared" / "gates.json")["stages"]


def validators() -> dict:
    registry = Registry()  # Unknown schema URIs cannot retrieve network or files.
    for path in sorted((ROOT / "shared" / "schemas").glob("*.schema.json")):
        schema = load_record(path)
        Draft202012Validator.check_schema(schema)
        registry = registry.with_resource(path.as_uri(), Resource.from_contents(schema))
    return {
        name: Draft202012Validator(
            {"$ref": (ROOT / "shared" / "schemas" / f"{name}.schema.json").as_uri()},
            registry=registry, format_checker=FormatChecker(),
        ) for name in KINDS
    }


def walk(value, path=()):
    """Inspect contract fields, never reinterpret domain-specific details as controls."""
    if isinstance(value, dict):
        yield path, value
        for key, item in value.items():
            if key not in ("details", "value"):
                yield from walk(item, path + (key,))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from walk(item, path + (index,))


def concrete(value) -> bool:
    if isinstance(value, str):
        return value.strip() not in UNKNOWN
    return value is not None and value not in ({}, [])


def resolved_value(value, top=True) -> bool:
    """Keep false/zero/empty subcollections; reject unresolved nested sentinels."""
    if isinstance(value, dict):
        return (bool(value) or not top) and all(resolved_value(v, False) for v in value.values())
    if isinstance(value, list):
        return (bool(value) or not top) and all(resolved_value(v, False) for v in value)
    return concrete(value)


def concrete_ref(value) -> bool:
    return isinstance(value, dict) and set(value) == {"id", "revision", "location"} and all(concrete(v) for v in value.values())


def good_evidence(item) -> bool:
    return bool(item and item.get("result") == "PASS" and item.get("execution") == "SUCCEEDED"
                and item.get("claim_class") in ("VERIFIED_FACT", "PROVIDED_CONSTRAINT")
                and concrete_ref(item.get("source")) and concrete(item.get("observed_at"))
                and concrete(item.get("observer")) and concrete(item.get("method")))


def ref_key(ref):
    return ref["id"], ref["revision"]


def _require_evidence(ids, evidence, label, errors, kinds=None):
    if not ids:
        errors.append(f"{label}: required evidence absent")
    for evidence_id in ids:
        item = evidence.get(evidence_id)
        if not good_evidence(item) or (kinds and item["kind"] not in kinds):
            errors.append(f"{label}: absent, stale, unsupported or unsuitable evidence {evidence_id}")


def semantic_errors(record: dict, external=None, now=None) -> list[str]:
    """Deterministic contradictions, not authenticity or application correctness."""
    errors = []
    external = external or {}
    evidence = dict(external.get("evidence", {}))
    evidence.update({x["id"]: x for x in record.get("evidence", [])})
    controls = dict(external.get("controls", {}))
    controls.update({x["id"]: x for x in record.get("controls", [])})
    now = now or datetime.now(timezone.utc)
    for path, item in walk(record):
        label = item.get("id", ".".join(map(str, path)) or "record")
        for key, values in item.items():
            if isinstance(values, list) and values and all(isinstance(v, dict) and "id" in v for v in values):
                ids = [v["id"] for v in values]
                if len(ids) != len(set(ids)):
                    errors.append(f"{label}.{key}: duplicate IDs")
            if key in ("evidence_ids", "proof_ids", "control_ids", "requirement_ids") and isinstance(values, list) and len(values) != len(set(values)):
                errors.append(f"{label}.{key}: duplicate references")
        if "result" in item and "execution" in item and item["result"] == "PASS":
            if item["execution"] != "SUCCEEDED":
                errors.append(f"{label}: PASS requires SUCCEEDED execution")
        if "state" in item and "value" in item and item["state"] == "RESOLVED":
            if not resolved_value(item["value"]) or not concrete(item.get("owner")):
                errors.append(f"{label}: RESOLVED parameter lacks concrete value/owner")
        if {"requirement_ids", "oracle", "execution", "result", "evidence_ids"} <= item.keys() and item["result"] == "PASS":
            _require_evidence(item["evidence_ids"], evidence, label, errors)
            if not concrete_ref(item["environment"]) or not concrete_ref(item["oracle"]):
                errors.append(f"{label}: successful check lacks resolved environment/oracle")
            if not item["requirement_ids"]:
                errors.append(f"{label}: successful check lacks requirement/obligation IDs")
        if {"authority", "policy", "artifact_refs", "expires_at"} <= item.keys() and item.get("status") in ("APPROVED", "NOT_REQUIRED"):
            for key in ("id", "revision", "authority"):
                if not concrete(item[key]):
                    errors.append(f"{label}: active approval {key} unresolved")
            for key in ("artifact_refs", "target_refs"):
                if not item[key] or not all(concrete_ref(v) for v in item[key]):
                    errors.append(f"{label}: active approval lacks resolved {key}")
            if not concrete_ref(item["policy"]) or not item["actions"] or any(a not in ACTIONS for a in item["actions"]):
                errors.append(f"{label}: active approval policy/actions unresolved")
            if not all(concrete_ref(v) for v in item["configuration_refs"]):
                errors.append(f"{label}: active approval configuration unresolved")
            _require_evidence(item["evidence_ids"], evidence, label, errors, {"APPROVAL", "CONFIGURATION", "SOURCE"})
            if item["expires_at"] == "UNRESOLVED":
                errors.append(f"{label}: active approval expiry policy unresolved")
            elif item["expires_at"] != "NONE":
                expiry = datetime.fromisoformat(item["expires_at"].replace("Z", "+00:00"))
                if expiry <= now:
                    errors.append(f"{label}: approval expired at validation time")
        if {"operation_key", "input_revision", "receipt", "retries_used"} <= item.keys():
            if item["execution"] == "SUCCEEDED":
                if not all(concrete(item[k]) for k in ("operation_key", "target", "input_revision", "receipt")):
                    errors.append(f"{label}: successful action lacks operation/target/input/receipt")
                if not concrete_ref(item["target_ref"]) or not concrete_ref(item["authorization_ref"]):
                    errors.append(f"{label}: successful action lacks target/authorization refs")
                if item["target"] != item["target_ref"]["id"]:
                    errors.append(f"{label}: action target disagrees with target_ref")
                if not concrete_ref(item["subject_ref"]) or item["subject_ref"]["revision"] != item["input_revision"] or not concrete(item["task_id"]):
                    errors.append(f"{label}: action subject/input/task binding mismatch")
                _require_evidence(item["evidence_ids"], evidence, label, errors, {"COMMAND", "TEST", "TELEMETRY"})
                if not any(evidence.get(e, {}).get("source", {}).get("location") == item["receipt"] for e in item["evidence_ids"]):
                    errors.append(f"{label}: receipt not bound to execution evidence")

    if "approval" in record and record.get("status", {}).get("approval") != record["approval"]["status"]:
        errors.append("Approval status differs between envelope and approval record")
    if "stage" not in record:
        return errors
    spec = gate_registry()[record["stage"]]
    gates = {g["id"]: g for g in record.get("gates", [])}
    if set(gates) != set(spec["gates"]):
        errors.append(f"{record['stage']}: required gate inventory differs; expected {list(spec['gates'])}")
    for gate in record.get("gates", []):
        if gate["id"] in spec["gates"] and gate["action"] != spec["gates"][gate["id"]]:
            errors.append(f"{gate['id']}: action differs from canonical registry")
        if gate["outcome"] not in ("PASS", "NOT_APPLICABLE"):
            continue
        if not concrete(gate["owner"]):
            errors.append(f"{gate['id']}: deciding owner unresolved")
        _require_evidence(gate["evidence_ids"], evidence, gate["id"], errors)
        if gate["outcome"] == "NOT_APPLICABLE":
            if not concrete(gate["applicability_authority"]):
                errors.append(f"{gate['id']}: applicability authority unresolved")
            continue
        if not gate["input_refs"] or not all(concrete_ref(r) for r in gate["input_refs"]):
            errors.append(f"{gate['id']}: passed gate lacks concrete inputs")
        for issue in record.get("unresolved", []) + list(external.get("issues", {}).values()):
            if issue["resolution"] == "UNRESOLVED" and set(issue["blocks"]) & {gate["action"], gate["id"], record["stage"] + ":" + gate["action"], "*"}:
                errors.append(f"{gate['id']}: unresolved blocking issue {issue['id']}")
        for control_id in gate["control_ids"]:
            control = controls.get(control_id)
            if not control:
                errors.append(f"{gate['id']}: control {control_id} absent")
                continue
            if control["applicability"] != "APPLICABLE" or not concrete(control["enforcement"]) or control["authority_type"] in ("PROPOSED", "INFORMATIVE"):
                errors.append(f"{gate['id']}: control {control_id} is not adopted/effective for this action")
            _require_evidence(control["proof_ids"], evidence, control_id, errors)
    status = record["status"]
    for operation in record.get("actions", []):
        if operation["stage"] != record["stage"] or operation["task_id"] != record["task_id"]:
            errors.append("Handoff action stage/task binding differs from envelope")
    if status["artifact"] == "BASELINED":
        if status["approval"] not in ("APPROVED", "NOT_REQUIRED"):
            errors.append("BASELINED artifact lacks active approval/policy decision")
        errors.extend(_gate_errors(record, spec["final_action"]))
    if status["verification"] == "VERIFIED":
        errors.extend(_gate_errors(record, spec["final_action"]))
        if "data" in record:
            errors.extend(_completion_errors(record, accepted=True))
            checks = record["data"].get("checks", []) + record["data"].get("results", []) + record["data"].get("postchecks", []) + record["data"].get("verification", [])
            if any(c["result"] != "PASS" for c in checks):
                errors.append("VERIFIED cannot conceal unsuccessful checks behind ownership transfer")
    # Execution is distinct from acceptance: failed/inconclusive postchecks remain honest.
    if status["execution"] == "SUCCEEDED" and "data" in record and record["stage"] in ("BUILD", "TEST", "DEPLOY", "MAINTAIN"):
        data = record["data"]
        subjects = [data["candidate"]] if "candidate" in data else data.get("generated_artifacts", []) if record["stage"] == "BUILD" else None
        actions = [a for a in (data.get("journal", []) or external.get("actions", [])) if a["stage"] == record["stage"] and a["task_id"] == record["task_id"] and (a["subject_ref"] in subjects if subjects is not None else ref_key(a["subject_ref"]) == (record["id"], record["revision"]))]
        if not any(a["execution"] == "SUCCEEDED" for a in actions):
            errors.append("SUCCEEDED stage lacks successful action receipt in its journal/state store")
        errors.extend(_gate_errors(record, "execute"))
    return errors


def _gate_errors(record, action):
    spec = gate_registry()[record["stage"]]
    if action not in spec["actions"]:
        return [f"{record['stage']}: action {action} unsupported"]
    gates = {g["id"]: g for g in record.get("gates", [])}
    errors = []
    for gid in spec["actions"][action]:
        outcome = gates.get(gid, {}).get("outcome")
        if outcome != "PASS" and not (outcome == "NOT_APPLICABLE" and gid in spec["conditional"]):
            errors.append(f"{gid}: {action} requires PASS (observed {outcome})")
    return errors


def _completion_errors(record, accepted=False):
    stage, data = record["stage"], record["data"]
    fields = {
        "PLAN": ("source_refs", "scope", "stakeholders", "requirements"),
        "DESIGN": ("components", "interfaces", "quality_scenarios", "decision_refs"),
        "BUILD": ("change_scope", "implementation_links", "versions", "checks", "generated_artifacts", "provenance"),
        "TEST": ("test_matrix", "oracles", "measurement_policy", "results", "requirement_coverage"),
        "DEPLOY": ("configuration_refs", "provenance", "rollout", "health_criteria", "recovery", "prechecks", "postchecks", "journal"),
        "MAINTAIN": ("objectives", "windows", "observations"),
    }[stage]
    errors = [f"{stage}: completion lacks {key}" for key in fields if not data[key]]
    for key in fields:
        if not isinstance(data[key], list):
            continue
        for item in data[key]:
            if isinstance(item, dict) and "details" in item:
                if not all(concrete(item[k]) for k in ("id", "revision", "summary", "owner")) or not item["evidence_ids"] or not item["details"]:
                    errors.append(f"{stage}.{key}: required record is an unresolved/evidence-free placeholder")
    checks = data.get("checks", []) + data.get("results", []) + data.get("postchecks", []) + data.get("verification", [])
    transfer = stage == "MAINTAIN" and bool(data["ownership_transfer"]) and all(r["details"].get("accepted") is True and concrete(r["details"].get("receiver")) and r["evidence_ids"] for r in data["ownership_transfer"])
    if accepted and not transfer and any(c["result"] != "PASS" for c in checks):
        errors.append(f"{stage}: accepted result contains unsuccessful/stale checks")
    if stage == "DEPLOY" and not concrete(data["operating_owner"]):
        errors.append("DEPLOY: operating owner unresolved")
    if stage == "MAINTAIN" and accepted and not data["verification"] and not data["ownership_transfer"]:
        errors.append("MAINTAIN: closure lacks verified resolution or accepted ownership transfer")
    if stage == "MAINTAIN" and data["ownership_transfer"] and not transfer:
        errors.append("MAINTAIN: ownership transfer lacks explicit receiver acceptance/evidence")
    if stage == "PLAN":
        for req in data["requirements"]:
            if req["status"] != "APPROVED" or not req["acceptance"] or not req["source_refs"]:
                errors.append(f"{req['id']}: baseline lacks approved measurable source-bound requirement")
            for criterion in req["acceptance"]:
                if any(not concrete(criterion[k]) for k in ("measure", "operator", "target", "test_method", "authority")) or not criterion["evidence_ids"]:
                    errors.append(f"{req['id']}: acceptance criterion is unresolved/evidence-free")
    return errors


def record_errors(record: dict, validator, external=None, now=None) -> list[str]:
    shape = sorted(validator.iter_errors(record), key=lambda e: str(list(e.path)))
    if shape:
        return [f"{list(e.path)}: {e.message}" for e in shape]
    return semantic_errors(record, external, now)


def _contained(root: Path, location: str) -> Path:
    if urlsplit(location).scheme or "\\" in location or "#" in location or "?" in location:
        raise ValueError(f"Bundle locator must be an unescaped relative local path: {location}")
    if unquote(location) != location:
        raise ValueError(f"Encoded bundle locator prohibited: {location}")
    relative = Path(location)
    if relative.is_absolute() or any(p in ("..", "") for p in relative.parts):
        raise ValueError(f"Bundle locator escapes root: {location}")
    path = root / relative
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink() or (hasattr(current, "is_junction") and current.is_junction()):
            raise ValueError(f"Bundle symlink/junction prohibited: {location}")
    if not path.resolve().is_relative_to(root.resolve()) or not path.is_file():
        raise ValueError(f"Bundle locator absent/outside root: {location}")
    return path


def load_bundle(path: Path, checkers, now=None) -> tuple[dict, list[str]]:
    """Resolve only explicitly manifest-listed, contained and digest-pinned files."""
    manifest = load_record(path)
    errors = record_errors(manifest, checkers["bundle"], now=now)
    result = {"manifest": manifest, "path": path.resolve(), "records": [], "refs": {}, "evidence": {}, "controls": {}, "requirements": {}, "decisions": {}, "issues": {}, "approvals": {}, "actions": [], "trace": []}
    if errors:
        return result, errors
    seen_ids, seen_paths = set(), set()
    for entry in manifest["records"]:
        ref = entry["ref"]
        if not concrete_ref(ref) or ref["id"] in seen_ids or ref["location"] in seen_paths:
            errors.append(f"Bundle duplicate/unresolved record ID or location: {ref}")
            continue
        seen_ids.add(ref["id"]); seen_paths.add(ref["location"])
        try:
            file = _contained(path.parent.resolve(), ref["location"])
            if hashlib.sha256(file.read_bytes()).hexdigest() != entry["sha256"]:
                errors.append(f"Bundle digest mismatch: {ref['location']}")
                continue
            kind = entry["kind"]
            item = {"id": ref["id"], "revision": ref["revision"]} if kind == "source" else load_record(file)
            if item.get("id") != ref["id"] or item.get("revision") != ref["revision"]:
                errors.append(f"Bundle record identity/revision mismatch: {ref['location']}")
                continue
            if kind != "source":
                shape = list(checkers[kind].iter_errors(item))
                if shape:
                    errors.extend(f"{ref['location']}: {e.message}" for e in shape)
                    continue
            result["refs"][ref_key(ref)] = ref
            result["records"].append((kind, item, file))
        except (ValueError, OSError) as exc:
            errors.append(str(exc))
    # Populate authoritative stores before checking embedded snapshots.
    authoritative_ids = set(seen_ids)
    for kind in ("context", "ledger", "approval_registry", "trace_graph", "execution_journal"):
        matches = [(item, file) for k, item, file in result["records"] if k == kind]
        if len(matches) != 1:
            errors.append(f"Bundle requires exactly one {kind}; found {len(matches)}")
            continue
        item, file = matches[0]; result[kind] = item
        for field in ("evidence", "controls", "requirements", "decisions", "issues", "approvals"):
            if field in item:
                for child in item[field]:
                    if child["id"] in result[field]:
                        errors.append(f"Duplicate authoritative {field} ID {child['id']}")
                    if child["id"] in authoritative_ids:
                        errors.append(f"Duplicate authoritative namespace ID {child['id']}")
                    authoritative_ids.add(child["id"])
                    result[field][child["id"]] = child
                    if "revision" in child:
                        result["refs"][(child["id"], child["revision"])] = {"id": child["id"], "revision": child["revision"], "location": file.relative_to(path.parent.resolve()).as_posix()}
        if kind == "execution_journal":
            result["actions"] = item["actions"]
            keys = [a["operation_key"] for a in item["actions"]]
            if len(keys) != len(set(keys)):
                errors.append("Duplicate authoritative operation keys")
        if kind == "trace_graph":
            result["trace"] = item["trace"]
    context = result.get("context")
    if context:
        result["refs"][(manifest["id"], manifest["revision"])] = {"id": manifest["id"], "revision": manifest["revision"], "location": path.name}
        for store, ref in context["state_stores"].items():
            expected = manifest if store == "manifest" else result.get(store, {})
            if ref_key(ref) != (expected.get("id"), expected.get("revision")):
                errors.append(f"Context state store {store} identity/revision does not match authoritative bundle")
    for kind, item, file in result["records"]:
        if kind != "source":
            errors.extend(f"{file.name}: {e}" for e in semantic_errors(item, result, now))
            errors.extend(f"{file.name}: {e}" for e in bundle_record_errors(item, result))
    return result, errors


def bundle_record_errors(record, bundle):
    errors = []
    for path, item in walk(record):
        label = item.get("id", ".".join(map(str, path)) or "record")
        if set(item) == {"id", "revision", "location"} and concrete_ref(item):
            expected = bundle["refs"].get(ref_key(item))
            if expected != item:
                errors.append(f"{label}: unresolved/mismatched manifest reference {item}")
        for field, index in (("evidence_ids", "evidence"), ("proof_ids", "evidence"), ("control_ids", "controls"), ("requirement_ids", "requirements")):
            for identifier in item.get(field, []):
                if identifier not in bundle[index]:
                    errors.append(f"{label}: dangling {field} {identifier}")
        if {"authority", "artifact_refs", "expires_at"} <= item.keys() and item.get("status") in ("APPROVED", "NOT_REQUIRED"):
            if bundle["approvals"].get(item["id"]) != item:
                errors.append(f"{label}: approval snapshot differs from authoritative registry")
        for field in ("evidence", "controls", "requirements", "decisions"):
            for child in item.get(field, []):
                if bundle[field].get(child["id"]) != child:
                    errors.append(f"{label}: {field} snapshot differs from ledger: {child['id']}")
        for child in item.get("unresolved", []):
            if bundle["issues"].get(child["id"]) != child:
                errors.append(f"{label}: issue snapshot differs from authoritative ledger: {child['id']}")
        for edge in item.get("trace", []):
            if edge not in bundle["trace"]:
                errors.append(f"{label}: trace snapshot absent from authoritative graph")
        for action in item.get("actions", []) + item.get("journal", []):
            if isinstance(action, dict) and action not in bundle["actions"]:
                errors.append(f"{label}: action snapshot differs from authoritative journal")
    return errors


def eligibility_errors(record, action, bundle, now=None):
    errors = []
    if "stage" not in record:
        return ["Eligibility requires a stage artifact or handoff"]
    spec = gate_registry()[record["stage"]]
    errors.extend(_gate_errors(record, action))
    if action not in spec["actions"]:
        return errors
    if not concrete(record.get("id")) or not concrete(record.get("revision")):
        errors.append("Eligibility requires identified revision-bound instance")
    if action in ("draft", "prepare"):
        return errors
    context = bundle.get("context", {})
    evidence = bundle["evidence"]
    for key in spec["context"]:
        parameter = context.get("parameters", {}).get(key, {})
        if parameter.get("state") not in ("RESOLVED", "NOT_APPLICABLE"):
            errors.append(f"{action}: required context {key} unresolved")
        else:
            _require_evidence(parameter.get("evidence_ids", []), evidence, key, errors)
    required_gates = set(spec["actions"][action])
    for issue in record.get("unresolved", []) + list(bundle.get("issues", {}).values()):
        if issue["resolution"] == "UNRESOLVED" and set(issue["blocks"]) & ({action, record["stage"] + ":" + action, "*"} | required_gates):
            errors.append(f"{action}: unresolved blocking issue {issue['id']}")
    data = record.get("data", {})
    if action in ("baseline", "accept", "close", "handoff") and data:
        errors.extend(_completion_errors(record, accepted=True))
        if not record["trace"] or any(edge["state"] != "CURRENT" for edge in record["trace"]):
            errors.append(f"{action}: final artifact lacks current trace evidence")
        for _, item in walk(data):
            if "evidence_ids" in item and item.get("claim_class") in ("VERIFIED_FACT", "PROVIDED_CONSTRAINT"):
                _require_evidence(item["evidence_ids"], evidence, item.get("id", action), errors)
        if record["stage"] == "TEST":
            planned = {rid for item in data["test_matrix"] for rid in item["requirement_ids"]}
            observed = {rid for item in data["results"] for rid in item["requirement_ids"]}
            excluded = {rid for item in data["exclusions"] for rid in item["requirement_ids"] if item["evidence_ids"] and item["details"].get("authorized") is True}
            if not planned or planned - observed - excluded:
                errors.append("TEST: planned obligations lack observed results or authorized exclusion")
    if not data:
        if not record.get("output_refs") or not concrete(record.get("next_authority")):
            errors.append("Eligible handoff lacks pinned outputs/next authority")
        outputs = [r for kind, r, path in bundle["records"] if kind == "artifact" and r.get("stage") == record["stage"] and (r["id"], r["revision"]) in [ref_key(ref) for ref in record.get("output_refs", [])]]
        if not outputs:
            errors.append("Eligible handoff lacks current same-stage artifact")
        for output in outputs:
            if output["task_id"] != record["task_id"]:
                errors.append("Handoff task differs from output artifact task")
            errors.extend("Handoff output: " + e for e in eligibility_errors(output, "handoff", bundle, now))
            if record["status"] != output["status"]:
                errors.append("Handoff status snapshot differs from output artifact")
            data_output = output["data"]
            output_subjects = [data_output["candidate"]] if "candidate" in data_output else data_output.get("generated_artifacts", []) if output["stage"] == "BUILD" else [bundle["refs"][(output["id"], output["revision"])]]
            for operation in record["actions"]:
                if operation["subject_ref"] not in output_subjects:
                    errors.append("Handoff action subject differs from output artifact")
        return errors
    approval = data.get("authorization") if record["stage"] == "DEPLOY" else data.get("remediation_authority") if record["stage"] == "MAINTAIN" and action == "execute" else record["approval"]
    if approval.get("status") not in ("APPROVED", "NOT_REQUIRED") or action not in approval.get("actions", []):
        errors.append(f"{action}: no active action-bound approval/policy record")
    subjects = [data["candidate"]] if "candidate" in data else data.get("generated_artifacts", []) if record["stage"] == "BUILD" else [{"id": record["id"], "revision": record["revision"], "location": bundle["refs"].get((record["id"], record["revision"]), {}).get("location", "UNRESOLVED")}]
    targets = [data["target"]] if "target" in data else [data["service"]] if "service" in data else subjects
    if record["stage"] == "BUILD" and action == "execute" and not subjects:
        subjects, targets = [data["base"]], [data["repository"]]
    configs = data.get("configuration_refs", [])
    if not subjects or any(r not in approval.get("artifact_refs", []) for r in subjects):
        errors.append(f"{action}: approval not bound to exact subject revision")
    if any(r not in approval.get("target_refs", []) for r in targets) or approval.get("configuration_refs") != configs:
        errors.append(f"{action}: approval target/configuration binding mismatch")
    relevant = [a for a in bundle["actions"] if a["stage"] == record["stage"] and a["task_id"] == record["task_id"] and a["subject_ref"] in subjects and a["target_ref"] in targets]
    if action == "execute" and any(a["execution"] == "UNKNOWN" for a in relevant):
        errors.append("execute: reconcile UNKNOWN prior operation before another action/retry; past retry counts remain consumed")
    relied = data.get("journal", []) if record["stage"] == "DEPLOY" else relevant
    if record["status"]["execution"] == "SUCCEEDED" and record["stage"] in ("BUILD", "TEST", "DEPLOY", "MAINTAIN") and not any(a["execution"] == "SUCCEEDED" for a in relied):
        errors.append(f"{record['stage']}: no exact subject/target/stage/task execution receipt")
    for operation in relied:
        if operation["execution"] != "SUCCEEDED":
            continue
        grant = bundle["approvals"].get(operation["authorization_ref"]["id"], {})
        if operation["stage"] != record["stage"] or operation["task_id"] != record["task_id"] or operation["subject_ref"] not in subjects or operation["target_ref"] not in targets or operation["configuration_refs"] != configs or grant.get("status") not in ("APPROVED", "NOT_REQUIRED") or grant.get("revision") != operation["authorization_ref"]["revision"] or operation["action"] not in grant.get("actions", []) or operation["subject_ref"] not in grant.get("artifact_refs", []) or operation["target_ref"] not in grant.get("target_refs", []) or operation["configuration_refs"] != grant.get("configuration_refs"):
            errors.append(f"{record['stage']}: relied operation subject/target/configuration/action/authority/task/stage binding mismatch")
    if record["stage"] == "DEPLOY" and action in ("execute", "accept", "handoff"):
        if any(not data[key] for key in ("configuration_refs", "provenance", "rollout", "health_criteria", "prechecks")) or any(c["result"] != "PASS" for c in data["prechecks"]):
            errors.append("DEPLOY: execution readiness lacks configuration/provenance/rollout/health/precheck evidence")
        if not data["recovery"] or any(not good_evidence(evidence.get(e)) for r in data["recovery"] for e in r["evidence_ids"]) or any(not r["evidence_ids"] or not concrete(r["owner"]) or not concrete(r["revision"]) for r in data["recovery"]):
            errors.append("DEPLOY: recovery readiness lacks current evidence/owner/revision")
        if action in ("accept", "handoff"):
            if record["status"]["execution"] != "SUCCEEDED":
                errors.append("DEPLOY: acceptance requires observed successful execution")
            successful = [a for a in data["journal"] if a["execution"] == "SUCCEEDED"]
            if not successful:
                errors.append("DEPLOY: acceptance lacks successful journal operation")
        for operation in data["journal"]:
            if operation["execution"] == "SUCCEEDED" and (operation["target_ref"] != data["target"] or operation["subject_ref"] != data["candidate"] or operation["input_revision"] != data["candidate"]["revision"] or operation["configuration_refs"] != configs or ref_key(operation["authorization_ref"]) != (approval["id"], approval["revision"]) or operation["action"] not in approval["actions"]):
                errors.append("DEPLOY: operation candidate/target/configuration/action/authority binding mismatch")
    return errors


def pack_errors(checkers) -> tuple[list[str], dict]:
    errors = []
    standalone = ROOT / "SKILL.md"
    if standalone.exists():
        paths = [standalone]
    else:
        paths = sorted(ROOT.glob("*/SKILL.md"))
        if sorted(p.parent.name for p in paths) != sorted(STAGES):
            errors.append("Source pack must have exactly six stage entrypoints")
    stats = {"skills": 0, "schemas": len(list((ROOT / "shared/schemas").glob("*.schema.json"))), "templates": 0, "local_links": 0, "distribution": "standalone" if standalone.exists() else "source"}
    for path in paths:
        text = path.read_text(encoding="utf-8")
        match = re.match(r"\A---\n(.*?)\n---(?:\n|$)", text, re.S)
        if not match:
            errors.append(f"{path}: invalid frontmatter"); continue
        front = yaml.safe_load(match[1])
        if not isinstance(front, dict):
            errors.append(f"{path}: frontmatter must be mapping"); continue
        name = front.get("name")
        if name not in STAGES or (path != standalone and name != path.parent.name):
            errors.append(f"{path}: name must identify intended stage")
        if not isinstance(front.get("description"), str) or not 1 <= len(front["description"]) <= 1024:
            errors.append(f"{path}: invalid description")
        if set(front) - {"name", "description", "metadata", "license", "compatibility", "allowed-tools"}:
            errors.append(f"{path}: nonportable frontmatter")
        metadata = front.get("metadata", {})
        if not isinstance(metadata, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in metadata.items()):
            errors.append(f"{path}: metadata must be string-to-string")
        stats["skills"] += 1
    for path in ROOT.rglob("*.md"):
        if path == ROOT / "plan.md":
            continue
        for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", path.read_text(encoding="utf-8")):
            target = target.strip("<>")
            if urlsplit(target).scheme or target.startswith("#"):
                continue
            relative = unquote(target.split("#", 1)[0])
            resolved = (path.parent / relative).resolve()
            if not resolved.is_relative_to(ROOT.resolve()) or not resolved.exists():
                errors.append(f"{path.relative_to(ROOT)}: missing/outside-pack link {target}")
            stats["local_links"] += 1
    for name in TEMPLATES:
        path = ROOT / "shared/templates" / f"{name}.md"
        errors.extend(f"{path.name}: {e}" for e in record_errors(load_record(path), checkers["artifact"]))
        stats["templates"] += 1
    for name in ("context", "handoff"):
        path = ROOT / "shared/templates" / f"{name}.json"
        errors.extend(f"{path.name}: {e}" for e in record_errors(load_record(path), checkers[name]))
        stats["templates"] += 1
    return errors, stats


def self_tests(checkers) -> int:
    from validator_tests import run_tests
    return run_tests(checkers)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--instance", type=Path)
    parser.add_argument("--schema", choices=KINDS)
    parser.add_argument("--mode", choices=("structural", "eligible"), default="structural")
    parser.add_argument("--action", choices=ACTIONS)
    parser.add_argument("--bundle", type=Path)
    parser.add_argument("--at", help="Offset ISO datetime for expiry checks; default current UTC")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if bool(args.instance) != bool(args.schema):
        parser.error("--instance and --schema must be supplied together")
    if args.mode == "eligible" and not (args.instance and args.bundle and args.action):
        parser.error("eligible mode requires --instance, --schema, --bundle and --action")
    if args.action and args.mode != "eligible":
        parser.error("--action requires --mode eligible")
    now = datetime.fromisoformat(args.at.replace("Z", "+00:00")) if args.at else datetime.now(timezone.utc)
    if now.tzinfo is None:
        parser.error("--at requires an explicit UTC offset")
    checkers = validators()
    bundle, bundle_errors = load_bundle(args.bundle.resolve(), checkers, now) if args.bundle else ({}, [])
    if args.instance:
        record = load_record(args.instance)
        errors = record_errors(record, checkers[args.schema], bundle, now)
        if args.bundle:
            errors.extend(bundle_record_errors(record, bundle))
            listed = next((p for k, r, p in bundle["records"] if k == args.schema and r == record), None)
            if listed is None or listed.resolve() != args.instance.resolve():
                errors.append("Instance is not the exact pinned bundle record")
        stats = {"instance": str(args.instance), "schema": args.schema}
    else:
        errors, stats = pack_errors(checkers)
    errors.extend(bundle_errors)
    structural = "FAIL" if errors else "PASS"
    eligibility = "NOT_EVALUATED"
    if args.mode == "eligible":
        eligible_errors = eligibility_errors(record, args.action, bundle, now) if not errors else []
        errors.extend(eligible_errors)
        eligibility = "FAIL" if errors else "PASS"
    if args.self_test:
        stats["deterministic_cases"] = self_tests(checkers)
    print(json.dumps({"validator_version": VERSION, "result": "FAIL" if errors else "PASS", "mode": args.mode, "action": args.action, "structural_result": structural, "eligibility_result": eligibility, "authority_authenticated": False, "checks": stats, "errors": errors}, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(json.dumps({"validator_version": VERSION, "result": "ERROR", "error": str(exc), "type": type(exc).__name__}))
        sys.exit(2)
