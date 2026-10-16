"""Score the frozen rubric from explicit, content-bound evidence; never infer PASS."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
RESULTS = {"PASS", "FAIL", "NOT_RUN", "BLOCKED", "INCONCLUSIVE"}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def score(policy: dict, evidence: dict, workspace: Path = WORKSPACE) -> dict:
    if evidence.get("policy_sha256") != sha256(ROOT / "evaluations" / "assessment-policy.json"):
        raise ValueError("Evidence does not bind the frozen policy")
    release_ref = evidence.get("release_manifest", {})
    release_path = (workspace / release_ref.get("path", "")).resolve()
    if not release_path.is_relative_to(workspace.resolve()) or not release_path.is_file():
        raise ValueError("Missing or escaping release manifest")
    if sha256(release_path) != release_ref.get("sha256"):
        raise ValueError("Release manifest digest mismatch")
    release = json.loads(release_path.read_text(encoding="utf-8"))
    if evidence.get("candidate_sha256") != release.get("source_manifest_sha256"):
        raise ValueError("Evidence candidate differs from release candidate")
    assertion_ids = {a["id"] for d in policy["dimensions"] for a in d["assertions"]}
    entries = {}
    for item in evidence.get("assertions", []):
        key = (item.get("scope"), item.get("assertion_id"))
        if key[0] not in [*policy["scope"], "ALL"] or key[1] not in assertion_ids or key in entries:
            raise ValueError(f"Unknown or duplicate assertion: {key}")
        if item.get("result") not in RESULTS:
            raise ValueError(f"Invalid assertion result: {key}")
        refs = item.get("evidence", [])
        if item["result"] == "PASS" and not refs:
            raise ValueError(f"PASS assertion has no evidence: {key}")
        for ref in refs:
            path = (workspace / ref["path"]).resolve()
            if not path.is_relative_to(workspace.resolve()) or not path.is_file() or sha256(path) != ref["sha256"]:
                raise ValueError(f"Missing, escaping, or changed evidence: {ref['path']}")
            if not ref.get("locator"):
                raise ValueError(f"Evidence locator missing: {ref['path']}")
        if not item.get("rationale") or not item.get("reviewer"):
            raise ValueError(f"Assessment rationale/reviewer missing: {key}")
        entries[key] = item
    failures = evidence.get("critical_failures", [])
    cards = {}
    for scope in policy["scope"]:
        dimensions = []
        for dimension in policy["dimensions"]:
            assertions = []
            for assertion in dimension["assertions"]:
                item = entries.get((scope, assertion["id"]), entries.get(("ALL", assertion["id"])))
                assertions.append({"id": assertion["id"], "criterion": assertion["criterion"],
                                   "result": item["result"] if item else "NOT_RUN",
                                   "evidence": item.get("evidence", []) if item else [],
                                   "rationale": item["rationale"] if item else "No current evidence submitted"})
            passed = sum(item["result"] == "PASS" for item in assertions)
            value = 10 * passed / len(assertions)
            dimensions.append({"id": dimension["id"], "name": dimension["name"],
                               "score": round(value, 4), "passed": passed, "required": len(assertions),
                               "meets_threshold": value >= policy["threshold"], "assertions": assertions})
        qualified = all(item["meets_threshold"] for item in dimensions) and not failures
        cards[scope] = {"result": "PASS" if qualified else "NOT_QUALIFIED",
                        "mean_score": round(sum(d["score"] for d in dimensions) / len(dimensions), 4),
                        "dimensions": dimensions}
    return {"schema_version": "2.0.0", "policy_id": policy["id"], "policy_sha256": evidence["policy_sha256"],
            "candidate_sha256": evidence["candidate_sha256"], "release_manifest": release_ref,
            "result": "PASS" if all(card["result"] == "PASS" for card in cards.values()) else "NOT_QUALIFIED",
            "threshold": policy["threshold"], "critical_failures": failures, "scorecards": cards,
            "limits": ["Scores measure submitted evidence against this internal frozen rubric.",
                       "Missing runtime evidence is unpassed, not proof that the skill behaved incorrectly.",
                       "This scorer checks content binding; it cannot authenticate evidence or approve actions."]}


def markdown(report: dict) -> str:
    lines = ["# Skill-pack assessment — 2.0.0", "", f"**Result: {report['result']}.** Required minimum: 9.0 in every dimension.",
             "", "Missing runtime evidence counts as unpassed. These are evidence-completion scores, not inferred model capability ratings.", "",
             "| Dimension | " + " | ".join(report["scorecards"]) + " |", "|---|" + "---:|" * len(report["scorecards"])]
    for index, dimension in enumerate(next(iter(report["scorecards"].values()))["dimensions"]):
        values = [f"{card['dimensions'][index]['score']:.2f}" for card in report["scorecards"].values()]
        lines.append("| " + dimension["name"] + " | " + " | ".join(values) + " |")
    lines += ["", "Machine report contains each assertion, its evidence locator and rationale.", ""]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        policy = json.loads((ROOT / "evaluations" / "assessment-policy.json").read_text(encoding="utf-8"))
        evidence = json.loads(args.evidence.read_text(encoding="utf-8"))
        report = score(policy, evidence)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        args.output.with_suffix(".md").write_text(markdown(report), encoding="utf-8")
        print(json.dumps({"result": report["result"], "output": str(args.output)}))
        return 0 if report["result"] == "PASS" else 1
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print(json.dumps({"result": "ERROR", "error": str(exc)}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
