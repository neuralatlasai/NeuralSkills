# BUILD artifact template

Proposed filename: `build-record.md`. Schema: [artifact](../schemas/artifact.schema.json). Shared authority: [GOV-1](../governance.md) and [ART-1](../artifact-contracts.md).

This is a reusable blank record marked **synthetic**. Copy it into the authorized project artifact location; assign stable IDs/revisions, remove synthetic status only for real project records, and retain NOT_RUN/BLOCKED until actual evidence supports a transition. Required owner: change owner and verification owner. Next consumer: TEST.

Pin repository/base/head revisions and owned change scope. Link each change to requirement/design revisions. Record dependency/license checks, toolchain/model/skill versions, generated digests/provenance, actual check commands/results, independent acceptance oracles, docs and outstanding defects. Do not revise protected criteria to make code pass.

```json
{
  "schema_version": "2.0.0",
  "id": "UNRESOLVED",
  "revision": "UNRESOLVED",
  "task_id": "UNRESOLVED",
  "stage": "BUILD",
  "synthetic": true,
  "status": {
    "artifact": "DRAFT",
    "execution": "NOT_RUN",
    "verification": "NOT_RUN",
    "approval": "NOT_REQUESTED"
  },
  "input_refs": [],
  "approval": {
    "status": "NOT_REQUESTED",
    "authority": "UNRESOLVED",
    "policy": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    },
    "scope": [],
    "artifact_refs": [],
    "expires_at": "UNRESOLVED",
    "evidence_ids": [],
    "id": "UNRESOLVED",
    "revision": "UNRESOLVED",
    "actions": [],
    "target_refs": [],
    "configuration_refs": []
  },
  "evidence": [],
  "controls": [],
  "decisions": [],
  "unresolved": [],
  "gates": [
    {
      "id": "BUILD-ENTRY",
      "action": "execute",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented BUILD-ENTRY criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "BUILD-CANDIDATE",
      "action": "handoff",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented BUILD-CANDIDATE criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "BUILD-HANDOFF",
      "action": "handoff",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented BUILD-HANDOFF criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    }
  ],
  "trace": [],
  "history": [],
  "data": {
    "repository": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    },
    "base": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    },
    "head": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    },
    "change_scope": [],
    "implementation_links": [],
    "dependency_license_review": [],
    "versions": [],
    "checks": [],
    "generated_artifacts": [],
    "provenance": [],
    "documentation": [],
    "defects": []
  }
}
```

Before handoff, resolve references, validate against the schema, apply the stage-specific gates and create a revision-bound [handoff](handoff.json). Schema validity alone does not satisfy acceptance or authorize execution.
