# AI-SDLC skill pack

Version 2.0.0. Six reusable software lifecycle skills with shared authority/evidence contracts, typed records, deterministic validation, self-contained distribution and behavioral evaluation specifications. This is an engineering workflow pack; no local score establishes ISO certification or OpenAI/Anthropic endorsement.

| Source entrypoint | Responsibility | Project record |
|---|---|---|
| [PLAN](plan/SKILL.md) | Supported requirements and measurable criteria | [intent](shared/templates/intent.md) |
| [DESIGN](design/SKILL.md) | Architecture, alternatives and interfaces | [architecture](shared/templates/architecture.md) |
| [BUILD](build/SKILL.md) | Authorized implementation and candidate evidence | [build record](shared/templates/build-record.md) |
| [TEST](test/SKILL.md) | Actual verification/acceptance and agent evaluation | [test report](shared/templates/test-report.md) |
| [DEPLOY](deploy/SKILL.md) | Release preparation, execution and recovery | [release record](shared/templates/release-record.md) |
| [MAINTAIN](maintain/SKILL.md) | Diagnosis, scoped remediation and feedback | [maintenance record](shared/templates/maintenance-record.md) |

## Use and boundaries

Start with the requested outcome and actual task/repository evidence. Load the selected entrypoint, then only its required shared contracts and stage procedure. A compatible small fix can reuse sufficient task/issue/tests/architecture; formal approvals follow actual applicable authority. A stage handoff does not end a broader authorized assignment: continue requested implementation, verification and other authorized stages through their skills.

[Governance](shared/governance.md) owns authority, status, continuation, evidence, recovery and coordination. [Artifact contracts](shared/artifact-contracts.md) own serialization, pinned state stores and validation. Production, protected-criteria, privilege and destructive-operation boundaries retain actual required controls. The pack installs none of these controls and grants no tool/identity permission.

Use [context](shared/project-context.md) to resolve only dependent parameters. Store real project records, source snapshots, approvals and receipts outside reusable skill definitions. Blank templates are starting records, not evidence. [Standards](shared/standards-register.md) distinguish catalogue scope from inspected normative text; ISO clause conformance remains unverified. [Platform adapters](shared/platform-adapters.md) explain actual-host qualification and packaging limits.

## Validate and package

From this skills directory, create an isolated development environment if needed:

    python -m venv ../.dist/validation-env
    ../.dist/validation-env/Scripts/python -B -m pip install -r requirements-dev.txt

This Windows path matches this workspace. On another OS use that environment's Python path and qualify it separately. [Pinned dependencies](requirements-dev.txt) are development/validation dependencies, not tool requirements for every skill task. Do not change global Python packages, user configuration or host permissions.

Run the deterministic release checks with the isolated interpreter:

    ../.dist/validation-env/Scripts/python -B scripts/verify_release.py

The [release verifier](scripts/verify_release.py) writes actual validation receipts to ../docs/ai-sdlc/review/v2.0.0/validation-results.json and distribution to ../.dist/v2.0.0. These checks do not substitute for actual host/model behavioral runs.

Individual commands:

    python -B scripts/validate_pack.py --self-test
    python -B scripts/validate_pack.py --mode structural --instance PATH --schema artifact
    python -B scripts/validate_pack.py --mode eligible --action ACTION --instance PATH --schema artifact --bundle BUNDLE
    python -B scripts/package_pack.py --output ../.dist/v2.0.0

Structural is the default and can accept an honest blocked draft. Eligible requires an explicit stage-supported stable action and pinned bundle; its pass proves selected internal consistency, not authentic authorization or observed success. [gates.json](shared/gates.json) defines canonical IDs and action subsets. See ART-1 for store, approval and journal interfaces.

[Packaging](scripts/package_pack.py) produces portable/<stage>/, six individual ZIPs, source-pack.zip and release-manifest.json. Each individual generated bundle includes its required shared references/schemas/templates/scripts/evaluation resources, with rewritten local links and source digests. Validate extracted bundles independently and compare rebuilt file/archive hashes. An unbundled single source folder is incomplete. Keep the maintained source pack together.

Install only into the explicitly intended workspace/host skill root after checking its effective discovery conventions. This release workflow performs no global installation. Install all stages needed by an authorized mixed-stage task. Record loaded paths/digests and demonstrate actual explicit/implicit routing; documentation alone is not installed-host qualification.

## Acceptance and evidence

[Cases](evaluations/cases.md) and the frozen [assessment policy](evaluations/assessment-policy.json) govern evaluation. Score every stage and SHARED across ten declared dimensions, using the frozen assertions. Required unexecuted/blocked/inconclusive evidence is unpassed. A critical unauthorized action, disclosure, fabricated result/approval, concealed failure or mandatory-boundary bypass prevents acceptance.

For the defined OpenAI/Anthropic target-host comparison, run three fresh with-skill trials and one no-skill baseline for each E01–E30 case on each host. Preserve raw traces/artifacts, candidate/fixture digests, actual versions, independent oracles, graders and every failure. [Scoring](scripts/score_assessment.py) consumes evidence; it must not synthesize missing runs. A deterministic validator pass cannot establish a 9/10 behavioral qualification.

A missing host login, model access or qualified boundary remains NOT_RUN with an exact limitation. Do not replace blocked access with an invented CLI result. Historical v1 runs and failures remain historical; v2 must earn its own results.

## Upgrade, rollback and maintenance

Version 2.0.0 breaks v1 record contracts. Preserve the complete previous pack, records and receipts with their manifests. Never edit old evidence into a new claimed pass.

1. Stage the new source/distribution in a separate authorized workspace directory. Verify release-manifest digests, local links and deterministic checks before selecting it.
2. Copy project records into a new migration location; retain the old immutable bundle. Add v2 state-store refs, indexed bundle identities/digests, canonical gates, handoff IDs/revisions and exact approval/action bindings using real source evidence. Unverifiable authority/results stay unresolved and dependent gates stay blocked.
3. Run structural validation on the new records. Run action eligibility only for a named action with sufficient current pinned evidence. Do not relabel a v1 schema_version alone or require postchecks before pre-execution eligibility.
4. Inspect the migration diff and restore a representative fresh session from the new state stores. Rerun affected cases and actual-host qualification. Promote the pack only to the extent evidence supports; retain remaining NOT_RUN limitations.
5. If regression requires rollback, select the previous complete pack and its compatible record bundle; verify its manifest and rerun relevant checks. Preserve failed new records as history. Pack rollback does not reverse application/database operations; use their separately authorized compatible recovery.

For maintenance, assign an owner per proposed change, preserve old/new versions and the reproduced failure or verified source/host change, update affected contracts/references consistently, run deterministic checks and affected behavioral regressions, rebuild manifests and record requalification. Review external links, adopted editions and target-host behavior when relevant changes occur. Do not invent a universal recertification interval or claim standards conformance from documentation volume.
