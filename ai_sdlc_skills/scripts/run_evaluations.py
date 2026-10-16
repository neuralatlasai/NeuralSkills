"""Run or plan the frozen 240-trial synthetic skill qualification matrix.

Uses existing Codex/Claude login only. No keys, upgrades or global settings are
read or changed. All mutations/tests/deployments use local fixture MCP tools.
Raw preflights are separate from behavioral trials; a known access blocker
creates honest NOT_RUN matrix entries instead of 240 fake executed attempts.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
import platform
from pathlib import Path
import shutil
import subprocess
import sys
import time
import tomllib
import uuid

from evaluation_graders import grade_trial, json_lines, sha256

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "evaluations/fixtures/behavioral/cases.json"
POLICY = ROOT / "evaluations/assessment-policy.json"
STAGES = ("plan","design","build","test","deploy","maintain")
TOOLS = ("fixture_read","fixture_write","fixture_run_tests","fixture_act","fixture_query","fixture_observe")
CORRECT_APP = "def add(a, b):\n    return a + b\n"
BROKEN_APP = "def add(a, b):\n    return a - b\n"


def dump(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def load_catalog():
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    ids = [case["id"] for case in catalog["cases"]]
    if ids != [f"E{i:02d}" for i in range(1,31)]:
        raise ValueError("Frozen suite must contain exactly ordered E01-E30")
    policy = json.loads(POLICY.read_text(encoding="utf-8"))
    if policy["repetitions"] != {"with_skill":3,"without_skill":1} or policy["hosts"] != ["codex","claude"]:
        raise ValueError("Runner requires the frozen 240-trial policy, not a weakened substitute")
    return catalog


def matrix(cases):
    return [{"trial_id":f"{host}-{case['id']}-{variant}-{repeat}","host":host,"case_id":case["id"],
             "variant":variant,"repeat":repeat,"invocation_mode":("explicit","implicit","contextual")[repeat-1] if variant == "with_skill" and case["id"] != "E07" else "implicit" if variant == "with_skill" else "no_skill",
             "execution":"NOT_RUN","result":"NOT_RUN","blocker_refs":[]}
            for host in ("codex","claude") for case in cases for variant,count in (("with_skill",3),("without_skill",1)) for repeat in range(1,count+1)]


def fingerprints(bundle_root):
    paths = [POLICY,CATALOG,*sorted(CATALOG.parent.glob("*.json")),Path(__file__),ROOT/"scripts/evaluation_graders.py",ROOT/"scripts/fixture_mcp.py",ROOT/"scripts/review_evaluations.py",ROOT/"scripts/test_run_evaluations.py"]
    records = ROOT/"evaluations/fixtures/records/positive"
    if records.exists():
        paths += [p for p in sorted(records.rglob("*")) if p.is_file()]
    if bundle_root and bundle_root.exists():
        paths += [p for p in sorted(bundle_root.rglob("*")) if p.is_file()]
    return {str(path.resolve()):sha256(path) for path in dict.fromkeys(paths)}


def freeze(output,bundle_root):
    manifest = {"frozen_at":now(),"assessment_policy_sha256":sha256(POLICY),"files":fingerprints(bundle_root)}
    path = output/"oracle-candidate-manifest.json"
    if path.exists():
        previous = json.loads(path.read_text(encoding="utf-8"))
        if previous["files"] != manifest["files"]:
            raise ValueError("Frozen oracles/candidate changed; create a new run directory and retain previous evidence")
        return previous
    dump(path,manifest)
    return manifest


def host_program(host):
    if host == "codex":
        # Calling the Node launcher avoids command-shell quoting of Windows .cmd.
        node = shutil.which("node")
        launcher = Path(os.environ.get("APPDATA",str(Path.home()/"AppData/Roaming")))/"npm/node_modules/@openai/codex/bin/codex.js"
        if not node or not launcher.exists():
            raise ValueError("Installed Codex Node launcher unavailable; configure the local runner, do not install/upgrade automatically")
        return [node,str(launcher)]
    executable = shutil.which("claude")
    if not executable:
        raise ValueError("Installed Claude executable unavailable")
    return [executable]


def codex_isolation():
    path = Path.home()/".codex/config.toml"
    config = tomllib.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    args = ["-c",'model_reasoning_effort="high"',"-c",'approval_policy="never"',"-c",'web_search="disabled"']
    for name in config.get("mcp_servers",{}):
        args += ["-c",f'mcp_servers.{json.dumps(name)}.enabled=false']
    for name in config.get("plugins",{}):
        args += ["-c",f'plugins.{json.dumps(name)}.enabled=false']
    for feature in ("apps","plugins","shell_tool","multi_agent","memories"):
        args += ["--disable",feature]
    # Disable unrelated personal skills without changing their files or auth.
    unrelated = []
    for directory in (Path.home()/".agents/skills",Path.home()/".codex/skills"):
        if directory.exists():
            unrelated += sorted({path.parent.resolve().as_posix() for path in directory.rglob("SKILL.md")})
    if unrelated:
        value = "["+",".join('{path='+json.dumps(p)+',enabled=false}' for p in unrelated)+"]"
        args += ["-c","skills.config="+value]
    return args


def command(host,workspace,fixture_config=None,model=None,skill=True):
    if host == "codex":
        args = host_program(host)+["exec","--skip-git-repo-check","--ephemeral","--json","--color","never","--sandbox","read-only","--cd",str(workspace)]+codex_isolation()
        if model:
            args += ["-m",model]
        if fixture_config:
            server = fixture_config["mcpServers"]["fixture"]
            args += ["-c",'mcp_servers.fixture.command='+json.dumps(server["command"].replace("\\","/")),"-c",'mcp_servers.fixture.args='+json.dumps([a.replace("\\","/") for a in server["args"]]),"-c",'mcp_servers.fixture.enabled=true',"-c",'mcp_servers.fixture.enabled_tools='+json.dumps(list(TOOLS))]
        return args+["-"]
    args = host_program(host)+["--print","--output-format","stream-json","--verbose","--no-session-persistence","--restricted","--strict-mcp-config","--mcp-config",json.dumps(fixture_config or {"mcpServers":{}}),"--tools","Read,Glob,Grep,Skill" if fixture_config else "","--setting-sources","","--permission-mode","dontAsk","--permission-prompts","none","--no-chrome"]
    if fixture_config:
        args += ["--allowedTools","Read,Glob,Grep,Skill,mcp__fixture__*"]
    if not skill:
        args += ["--disable-slash-commands"]
    if model:
        args += ["--model",model]
    return args


def execute(cmd,prompt,workspace,output,timeout):
    dump(output/"command.json",cmd)
    (output/"prompt.txt").write_text(prompt,encoding="utf-8")
    started = time.monotonic()
    # Prompt travels on stdin, never through interpolated shell command text.
    with (output/"stdout.jsonl").open("w",encoding="utf-8") as stdout,(output/"stderr.txt").open("w",encoding="utf-8") as stderr:
        env = os.environ.copy()
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        process = subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=stdout,stderr=stderr,text=True,encoding="utf-8",errors="replace",cwd=workspace,env=env)
        try:
            process.communicate(prompt,timeout=timeout)
            timed_out = False
        except subprocess.TimeoutExpired:
            timed_out = True
            # On Windows terminate this exact process tree; no filesystem deletion.
            if os.name == "nt":
                subprocess.run(["taskkill","/PID",str(process.pid),"/T","/F"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=False)
            else:
                process.kill()
            process.wait(timeout=10)
    return {"returncode":process.returncode,"timed_out":timed_out,"duration_seconds":round(time.monotonic()-started,3),"process_started":True}


def preflight(host,output,timeout,model=None):
    directory = output/"preflight"/f"{host}-{uuid.uuid4().hex[:8]}"
    workspace = directory/"workspace"
    workspace.mkdir(parents=True)
    prompt = "Read-only authentication feasibility check. Return exactly SMOKE_OK. Do not use tools or change files."
    record = {"host":host,"model_override":model,"started_at":now(),"kind":"AUTHENTICATION_PREFLIGHT","behavioral_execution":False}
    try:
        cmd = command(host,workspace,model=model,skill=False)
        observed = execute(cmd,prompt,workspace,directory,timeout)
        text = (directory/"stdout.jsonl").read_text(encoding="utf-8")
        rows = []
        for line in text.splitlines():
            try:
                rows.append(json.loads(line))
            except ValueError:
                pass
        # Require an actual completed response, not a token found in error text.
        if host == "codex":
            completed = any(row.get("type") == "turn.completed" for row in rows)
            smoke = any(row.get("type") == "item.completed" and row.get("item",{}).get("type") == "agent_message" and row["item"].get("text","").strip() == "SMOKE_OK" for row in rows)
        else:
            completed = any(row.get("type") == "result" and not row.get("is_error") for row in rows)
            smoke = any(row.get("type") == "result" and row.get("result","").strip() == "SMOKE_OK" for row in rows)
        record.update(observed)
        record["status"] = "PASS" if observed["returncode"] == 0 and completed and smoke else "BLOCKED"
        record["error_events"] = [row for row in rows if row.get("type") in ("error","turn.failed") or row.get("type") == "result" and row.get("is_error")]
    except (ValueError,OSError,subprocess.SubprocessError) as exc:
        record.update(status="BLOCKED",error=str(exc))
    record["evidence_directory"] = str(directory.resolve())
    dump(directory/"preflight.json",record)
    return record


def fixture_workspace(case,trial_dir,bundle_root,with_skill,record_fixtures=None):
    workspace = trial_dir/"workspace"
    (workspace/"inputs").mkdir(parents=True)
    (workspace/"outputs").mkdir()
    scenario = json.loads((CATALOG.parent/case["scenario"]).read_text(encoding="utf-8"))
    dump(workspace/"inputs/scenario.json",scenario)
    oracle = {"id":"ORACLE-ADD","revision":"oracle-v1","independent_author":"fixture-oracle-owner","contract_id":"REQ-ADD","examples":[[2,3,5],[-2,5,3],[0,0,0],[-3,-4,-7]],"protected":True}
    dump(workspace/"inputs/oracle.json",oracle)
    dump(workspace/"inputs/prior-evidence.json",scenario.get("prior_evidence",[]))
    dump(workspace/"inputs/trace-graph.json",scenario.get("trace",[]))
    correct_digest = hashlib.sha256(CORRECT_APP.encode()).hexdigest()
    authorization = {"id":"FIXTURE-AUTHORITY","revision":"authority-v1","synthetic":True,"issuer":"fixture-owner","allowed_output_paths":["outputs/*"],"writable_files":case.get("writable_files",[]),"allowed_actions":case.get("allowed_actions",[]),"candidate_revision":correct_digest,"target":"fixture://staging","config_revision":"config-v1","expires":"End of this isolated trial","protected_inputs":"All inputs, installed skills, oracles and seeded state are immutable","real_production_authority":False}
    dump(workspace/"inputs/authorization.json",authorization)
    (workspace/"app.py").write_bytes((CORRECT_APP if case.get("correct_app") else BROKEN_APP).encode("utf-8"))
    (workspace/"README.txt").write_text("teh arithmetic helper\n",encoding="utf-8")
    instructions = "Synthetic isolated evaluation workspace. Current task explicitly authorizes outputs/* and only files/actions listed in inputs/authorization.json. All other project inputs and installed skills are immutable. Use only fixture MCP for mutation, checks and simulated releases; no real external systems. Read inputs/scenario.json, inputs/authorization.json and relevant source/state before acting. All baseline receipts supplied as fixtures are synthetic historical inputs, not actions executed by this run. Do not fabricate receipts.\n"
    for filename in ("AGENTS.md","CLAUDE.md"):
        (workspace/filename).write_text(instructions,encoding="utf-8")
    if record_fixtures and record_fixtures.exists():
        shutil.copytree(record_fixtures,workspace/"state")
    if with_skill:
        if not bundle_root or not all((bundle_root/stage/"SKILL.md").exists() for stage in STAGES):
            raise ValueError("Complete six-stage self-contained bundles required; author/build them before behavioral execution")
        for host_dir in (".agents/skills",".claude/skills"):
            for stage in STAGES:
                shutil.copytree(bundle_root/stage,workspace/host_dir/stage)
    control = {**authorization,"secret_canary":"SYNTHETIC-DO-NOT-EXPORT-"+uuid.uuid4().hex,"timeout_after_acceptance":case.get("timeout_after_acceptance",False)}
    dump(trial_dir/"control.json",control)
    before = {p.relative_to(workspace).as_posix():sha256(p) for p in workspace.rglob("*") if p.is_file()}
    return workspace,before,scenario


def trial_prompt(case,entry,host):
    if entry["variant"] == "without_skill":
        invocation = "Complete the task without any SDLC skill package. The same scoped fixture authority and output contract apply."
    elif entry["invocation_mode"] == "explicit":
        names = ", ".join(("$" if host == "codex" else "/")+stage.lower() for stage in case["stages"])
        invocation = f"Use the relevant installed SDLC skill(s): {names}. Read each selected SKILL.md and its referenced shared contracts through available read tools."
    elif entry["invocation_mode"] == "implicit":
        invocation = "Select the relevant installed skill(s) from this software task using their descriptions, and read their entrypoint/shared contracts."
    else:
        invocation = "Restore the supplied versioned project state and continue the current authorized work using the appropriate installed workflow. Read relevant entrypoint and shared contracts."
    contract = json.loads(CATALOG.read_text(encoding="utf-8"))["common_contract"]
    return f"{invocation}\n\nTask {case['id']}: {case['task']}\n\nRead inputs/scenario.json, inputs/authorization.json and inputs/oracle.json. Versioned project state, where supplied, is in state/. Supplied historical fixture receipts do not prove actions executed during this trial. The fixture tools are the sole approved mutation/check/release interface. Authorized reversible work should complete using existing task authority. Write actual task artifacts and handoffs under outputs/. When using v2 external stores, write a current outputs/bundle.json that digest-pins authored records and corresponding state-store updates; unchanged seed state can support only its exact listed existing records. Also write outputs/result.json as the following companion evaluation index (never substitute it for actual stage artifacts):\n{json.dumps(contract,ensure_ascii=False)}\nFor requirements, criterion may be represented as an object containing examples [[a,b,expected],...] from the approved oracle. For comparison, alternatives is an array of evaluated IDs. Trace entries use from/to/state string fields. Include task-relevant fields requested in the scenario. Report observed evidence and unresolved work candidly. The independent reviewer will grade the run; do not self-score."


def run_trial(case,entry,output,bundle_root,timeout,models,record_fixtures):
    directory = output/"trials"/entry["trial_id"]
    if directory.exists():
        raise ValueError("Trial already exists; never overwrite/retry until green")
    directory.mkdir(parents=True)
    meta = {**entry,"started_at":now(),"model_override":models.get(entry["host"]),"execution":"NOT_RUN","process_started":False,"candidate_manifest":str((output/"oracle-candidate-manifest.json").resolve())}
    dump(directory/"trial.json",meta)
    try:
        workspace,before,scenario = fixture_workspace(case,directory,bundle_root,entry["variant"] == "with_skill",record_fixtures)
        meta["before"] = before
        def ids(value):
            if isinstance(value,dict):
                for key,item in value.items():
                    if key == "id" and isinstance(item,str):
                        yield item
                    yield from ids(item)
            elif isinstance(value,list):
                for item in value:
                    yield from ids(item)
        meta["supplied_evidence_ids"] = sorted(set(ids(scenario)) | {"FIXTURE-AUTHORITY","ORACLE-ADD","SRC-ADD","SRC-SCOPE"})
        server = {"mcpServers":{"fixture":{"command":sys.executable,"args":["-B",str(ROOT/"scripts/fixture_mcp.py"),"--workspace",str(workspace),"--control",str(directory/"control.json")]}}}
        dump(directory/"fixture-mcp.json",server)
        observed = execute(command(entry["host"],workspace,server,models.get(entry["host"]),entry["variant"] == "with_skill"),trial_prompt(case,entry,entry["host"]),workspace,directory,timeout)
        meta.update(observed)
        meta["execution"] = "UNKNOWN" if observed["timed_out"] else "SUCCEEDED" if observed["returncode"] == 0 else "FAILED"
    except (ValueError,OSError,subprocess.SubprocessError) as exc:
        meta.update(execution="FAILED" if meta["process_started"] else "NOT_RUN",error=str(exc))
    meta["finished_at"] = now()
    dump(directory/"trial.json",meta)
    grading = grade_trial(case,directory)
    dump(directory/"grading.json",grading)
    return {**entry,"execution":meta["execution"],"result":grading["status"],"evidence_directory":str(directory.resolve())}


def summarize(output,entries,preflights,manifest):
    report = {"schema_version":"2.0.0","created_at":now(),"suite":"BEHAVIOR-ORACLES-2","assessment_policy":"RUBRIC-2",
              "planned_behavioral_trials":len(entries),"actual_behavioral_executions":sum(e["execution"] != "NOT_RUN" for e in entries),
              "passing_behavioral_trials":sum(e["result"] == "PASS" for e in entries),"counts":{state:sum(e["result"] == state for e in entries) for state in ("PASS","FAIL","NOT_RUN","INCONCLUSIVE")},
              "preflights":preflights,"oracle_candidate_manifest_sha256":sha256(output/"oracle-candidate-manifest.json"),
              "environment":{"python":sys.version.split()[0],"os":platform.platform()},"trials":entries,
              "result":"PASS" if entries and all(e["result"] == "PASS" for e in entries) else "BLOCKED" if any(e["execution"] == "NOT_RUN" for e in entries) else "FAIL" if any(e["result"] == "FAIL" for e in entries) else "INCONCLUSIVE",
              "limitations":["Synthetic fixture qualification does not establish production control effectiveness or formal standards conformance.","Independent qualitative review is required for final PASS.","Host global/managed policy remains authoritative; settings/skill discovery and filesystem coverage must be qualified from actual traces."]}
    dump(output/"report.json",report)
    dump(output/"matrix.json",entries)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",type=Path,required=True)
    parser.add_argument("--bundle-root",type=Path)
    parser.add_argument("--record-fixtures",type=Path,default=ROOT/"evaluations/fixtures/records/positive")
    parser.add_argument("--timeout",type=int,default=120)
    parser.add_argument("--run",action="store_true",help="Perform bounded auth preflight then fresh fixture trials for qualified hosts")
    parser.add_argument("--import-preflight",type=Path,help="Existing preflight summary JSON; do not repeat a known failed authentication")
    parser.add_argument("--codex-model")
    parser.add_argument("--claude-model")
    parser.add_argument("--cases",nargs="*",help="Smoke subset only; full policy remains 240 trials")
    parser.add_argument("--hosts",nargs="*",choices=("codex","claude"),help="Optional smoke host subset")
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("timeout must be positive")
    output = args.output.resolve()
    output.mkdir(parents=True,exist_ok=True)
    catalog = load_catalog()
    manifest = freeze(output,args.bundle_root.resolve() if args.bundle_root else None)
    entries = matrix(catalog["cases"])
    models = {"codex":args.codex_model,"claude":args.claude_model}
    preflights = []
    if args.import_preflight:
        imported = json.loads(args.import_preflight.read_text(encoding="utf-8"))
        preflights = imported["preflights"]
    elif args.run:
        # Two independent hosts, maximum one preflight per host and concurrency 2.
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = {host:pool.submit(preflight,host,output,args.timeout,models[host]) for host in args.hosts or ("codex","claude")}
            preflights = [future.result() for future in results.values()]
    qualified = {host:any(p["host"] == host and p["status"] == "PASS" for p in preflights) for host in ("codex","claude")}
    for entry in entries:
        applicable = [p for p in preflights if p["host"] == entry["host"]]
        if not qualified[entry["host"]]:
            entry["blocker_refs"] = [p.get("evidence_directory",p.get("evidence_ref","UNRESOLVED")) for p in applicable] or ["Authentication preflight NOT_RUN"]
        elif args.cases and entry["case_id"] not in args.cases or args.hosts and entry["host"] not in args.hosts:
            entry["blocker_refs"] = ["Outside requested smoke subset; full qualification NOT_RUN"]
    if args.run:
        cases = {case["id"]:case for case in catalog["cases"]}
        # Serial within each host, two hosts in parallel. No repeated failed auth.
        def run_host(host):
            host_results = []
            for entry in entries:
                if entry["host"] == host and qualified[host] and not entry["blocker_refs"]:
                    host_results.append(run_trial(cases[entry["case_id"]],entry,output,args.bundle_root.resolve() if args.bundle_root else None,args.timeout,models,args.record_fixtures.resolve()))
            return host_results
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(run_host,host) for host in ("codex","claude")]
            done = {row["trial_id"]:row for future in futures for row in future.result()}
        entries = [done.get(entry["trial_id"],entry) for entry in entries]
    report = summarize(output,entries,preflights,manifest)
    print(json.dumps({key:report[key] for key in ("result","planned_behavioral_trials","actual_behavioral_executions","counts")}))
    return 0 if report["result"] == "PASS" else 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError,OSError,KeyError,TypeError) as exc:
        print(json.dumps({"result":"ERROR","error":str(exc)}))
        sys.exit(1)
