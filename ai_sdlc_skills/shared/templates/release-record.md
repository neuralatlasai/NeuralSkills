# DEPLOY artifact template

Proposed filename: `release-record.md`. Schema: [artifact](../schemas/artifact.schema.json). Shared authority: [GOV-1](../governance.md) and [ART-1](../artifact-contracts.md).

This is a reusable blank record marked **synthetic**. Copy it into the authorized project artifact location; assign stable IDs/revisions, remove synthetic status only for real project records, and retain NOT_RUN/BLOCKED until actual evidence supports a transition. Required owner: release authority. Next consumer: MAINTAIN.

Bind authority and checks to the candidate digest, exact target and configuration. Store secret references only. Describe infrastructure/migration compatibility, staged rollout windows, health thresholds, stop/recovery triggers, migration-safe rollback or forward recovery, receipts and operating owner. Prepared plans stay NOT_RUN; only actual observations establish a deployed result.

```json
{
  "schema_version": "2.0.0",
  "id": "UNRESOLVED",
  "revision": "UNRESOLVED",
  "task_id": "UNRESOLVED",
  "stage": "DEPLOY",
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
      "id": "REL-INPUT",
      "action": "prepare",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented REL-INPUT criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "REL-READY",
      "action": "prepare",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented REL-READY criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "REL-EXEC",
      "action": "execute",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented REL-EXEC criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "REL-POST",
      "action": "accept",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented REL-POST criterion to the active task"
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
    "candidate": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    },
    "provenance": [],
    "target": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    },
    "configuration_refs": [],
    "secret_refs": [],
    "infrastructure_changes": [],
    "migrations": [],
    "authorization": {
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
    "rollout": [],
    "health_criteria": [],
    "recovery": [],
    "prechecks": [],
    "postchecks": [],
    "journal": [],
    "operating_owner": "UNRESOLVED"
  }
}
```

Before handoff, resolve references, validate against the schema, apply the stage-specific gates and create a revision-bound [handoff](handoff.json). Schema validity alone does not satisfy acceptance or authorize execution.
