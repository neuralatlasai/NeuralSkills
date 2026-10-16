"""Run deterministic release checks and retain exact commands, outputs and digests."""
from __future__ import annotations

import argparse
import datetime
import hashlib
import importlib.metadata
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
STAGES = ("plan", "design", "build", "test", "deploy", "maintain")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=WORKSPACE / "docs/ai-sdlc/review/v2.0.0/validation-results.json")
    parser.add_argument("--package-output", type=Path, default=WORKSPACE / ".dist/v2.0.0")
    parser.add_argument("--creator-validator", type=Path, default=Path.home() / ".codex/skills/.system/skill-creator/scripts/quick_validate.py")
    args = parser.parse_args()
    if args.output.resolve().is_relative_to(ROOT.resolve()) or args.package_output.resolve().is_relative_to(ROOT.resolve()):
        parser.error("Reports and distributions must be outside the source skill pack")
    env = dict(os.environ)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    checks = []

    def run(name, arguments, timeout=180):
        start = datetime.datetime.now(datetime.timezone.utc)
        try:
            result = subprocess.run(arguments, cwd=WORKSPACE, env=env, text=True,
                                    capture_output=True, encoding="utf-8", errors="replace", timeout=timeout)
            check = {"id": name, "command": arguments, "exit_code": result.returncode,
                     "result": "PASS" if result.returncode == 0 else "FAIL",
                     "stdout": result.stdout, "stderr": result.stderr}
        except subprocess.TimeoutExpired as exc:
            check = {"id": name, "command": arguments, "exit_code": None, "result": "FAIL",
                     "stdout": str(exc.stdout or ""), "stderr": str(exc.stderr or ""), "reason": "TIMEOUT"}
        check["observed_at"] = start.isoformat()
        checks.append(check)

    python = sys.executable
    run("unit-regressions", [python, "-B", "-m", "unittest", "discover", "-s", "skills/scripts", "-p", "test_*.py", "-v"])
    run("pack-structure-and-invariants", [python, "-B", "skills/scripts/validate_pack.py", "--self-test"])
    if args.creator_validator.is_file():
        for stage in STAGES:
            run("skill-format-" + stage, [python, "-B", str(args.creator_validator), str(ROOT / stage)])
    else:
        checks.append({"id": "external-skill-format", "result": "NOT_RUN", "reason": "skill-creator validator unavailable"})
    run("package-build", [python, "-B", "skills/scripts/package_pack.py", "--output", str(args.package_output.resolve())])
    if checks[-1]["result"] == "PASS":
        for stage in STAGES:
            path = args.package_output.resolve() / "portable" / stage
            run("bundle-integrity-" + stage, [python, "-B", "skills/scripts/package_pack.py", "--verify", str(path)])
            run("bundle-validator-" + stage, [python, "-B", str(path / "scripts/validate_pack.py"), "--self-test"])
        from package_pack import build
        temporary_parent = WORKSPACE / ".dist"
        temporary_parent.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="reproducibility-", dir=temporary_parent) as temporary:
            temporary_path = Path(temporary).resolve()
            assert temporary_path.is_relative_to(temporary_parent.resolve())
            second = build(temporary_path)
            original = json.loads((args.package_output / "release-manifest.json").read_text(encoding="utf-8"))
            checks.append({"id": "reproducible-distribution", "result": "PASS" if original == second else "FAIL",
                           "archives": second["archives"], "method": "Rebuild into clean temporary output; compare complete release manifests and archive digests"})
    requirements = {}
    for line in (ROOT / "requirements-dev.txt").read_text(encoding="utf-8").splitlines():
        if "==" in line and not line.startswith("#"):
            name, expected = line.split("==", 1)
            actual = importlib.metadata.version(name)
            requirements[name] = {"expected": expected, "actual": actual}
    checks.append({"id": "dependency-pins", "result": "PASS" if all(v["actual"] == v["expected"] for v in requirements.values()) else "FAIL",
                   "dependencies": requirements})
    source_files = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in ROOT.rglob("*") if p.is_file() and "__pycache__" not in p.parts}
    report = {"version": "2.0.0", "observed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "python": sys.version, "python_executable": python, "checks": checks, "source_files": source_files,
              "result": "PASS" if all(c["result"] == "PASS" for c in checks) else "FAIL",
              "limits": "Deterministic checks do not establish agent behavior, approval authenticity or runtime enforcement."}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"result": report["result"], "checks": len(checks), "report": str(args.output)}))
    return 0 if report["result"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
