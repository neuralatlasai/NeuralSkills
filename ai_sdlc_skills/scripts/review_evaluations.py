"""Apply independently authored reviews without overwriting original evidence.

Review input: {run_manifest_sha256, reviews:[{trial_id, reviewer,
independence_statement, result, reason, evidence_locators}]}. This records a
reviewer's assertion; it does not authenticate their organizational identity.
"""
from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
import sys

from evaluation_graders import grade_trial, sha256
from run_evaluations import dump, load_catalog, now


def apply_reviews(run_directory, reviews_path, output):
    run_directory, reviews_path, output = map(Path,(run_directory,reviews_path,output))
    if output.exists():
        raise ValueError("Review output must be a new directory; preserve original assessments")
    report = json.loads((run_directory/"report.json").read_text(encoding="utf-8"))
    reviews = json.loads(reviews_path.read_text(encoding="utf-8"))
    if reviews["run_manifest_sha256"] != sha256(run_directory/"oracle-candidate-manifest.json"):
        raise ValueError("Review belongs to another frozen candidate/oracle manifest")
    rows = reviews["reviews"]
    ids = [row["trial_id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate trial review IDs")
    trials = {row["trial_id"]:row for row in report["trials"]}
    if set(ids)-set(trials):
        raise ValueError("Review references unknown trial")
    output.mkdir(parents=True)
    updated = copy.deepcopy(report)
    cases = {case["id"]:case for case in load_catalog()["cases"]}
    index = {row["trial_id"]:row for row in updated["trials"]}
    for review in rows:
        row = index[review["trial_id"]]
        if row["execution"] == "NOT_RUN":
            # A reviewer cannot turn an unexecuted model trial into a pass.
            grade = {"trial_id":row["trial_id"],"status":"NOT_RUN","review":"NOT_RUN","reason":"Behavioral execution absent; review cannot supply it"}
        else:
            directory = Path(row["evidence_directory"])
            grade = grade_trial(cases[row["case_id"]],directory,review)
        row["result"] = grade["status"]
        row["review_evidence"] = str((output/(row["trial_id"]+".json")).resolve())
        dump(output/(row["trial_id"]+".json"),grade)
    updated["created_at"] = now()
    updated["supersedes_report"] = {"path":str((run_directory/"report.json").resolve()),"sha256":sha256(run_directory/"report.json")}
    updated["review_input_sha256"] = sha256(reviews_path)
    updated["passing_behavioral_trials"] = sum(row["result"] == "PASS" for row in updated["trials"])
    updated["counts"] = {state:sum(row["result"] == state for row in updated["trials"]) for state in ("PASS","FAIL","NOT_RUN","INCONCLUSIVE")}
    updated["result"] = "PASS" if all(row["result"] == "PASS" for row in updated["trials"]) else "BLOCKED" if any(row["execution"] == "NOT_RUN" for row in updated["trials"]) else "FAIL" if any(row["result"] == "FAIL" for row in updated["trials"]) else "INCONCLUSIVE"
    dump(output/"report.json",updated)
    return updated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-directory",type=Path,required=True)
    parser.add_argument("--reviews",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args = parser.parse_args()
    result = apply_reviews(args.run_directory,args.reviews,args.output)
    print(json.dumps({"result":result["result"],"counts":result["counts"]}))
    return 0 if result["result"] == "PASS" else 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError,ValueError,KeyError,TypeError) as exc:
        print(json.dumps({"result":"ERROR","error":str(exc)}))
        sys.exit(1)
