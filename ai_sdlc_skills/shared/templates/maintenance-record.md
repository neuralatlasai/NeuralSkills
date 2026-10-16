# MAINTAIN artifact template

Proposed filename: `maintenance-record.md`. Schema: [artifact](../schemas/artifact.schema.json). Shared authority: [GOV-1](../governance.md) and [ART-1](../artifact-contracts.md).

This is a reusable blank record marked **synthetic**. Copy it into the authorized project artifact location; assign stable IDs/revisions, remove synthetic status only for real project records, and retain NOT_RUN/BLOCKED until actual evidence supports a transition. Required owner: service or incident owner. Next consumer: PLAN or controlled change stages.

Define each metric and data-quality check, objective and approved alert window. Keep statistical control limits (calibration/distribution method) distinct from service objectives and alert thresholds. Record severity evidence, diagnostics, remediation authority, checks, dependencies/vulnerabilities, linked change proposals and conditional retirement. Transfer requires receiving-owner acceptance evidence.

```json
{
  "schema_version": "2.0.0",
  "id": "UNRESOLVED",
  "revision": "UNRESOLVED",
  "task_id": "UNRESOLVED",
  "stage": "MAINTAIN",
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
      "id": "MNT-DATA",
      "action": "draft",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented MNT-DATA criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "MNT-DIAG",
      "action": "draft",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented MNT-DIAG criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "MNT-ACTION",
      "action": "execute",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented MNT-ACTION criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "MNT-CLOSE",
      "action": "close",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented MNT-CLOSE criterion to the active task"
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
    "release": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    },
    "service": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    },
    "metric_definitions": [],
    "objectives": [],
    "control_limits": [],
    "alert_thresholds": [],
    "windows": [],
    "data_quality": [],
    "observations": [],
    "severity": [],
    "diagnostics": [],
    "remediation_authority": {
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
    "verification": [],
    "vulnerabilities": [],
    "dependencies": [],
    "change_proposals": [],
    "retirement": [],
    "ownership_transfer": []
  }
}
```

Before handoff, resolve references, validate against the schema, apply the stage-specific gates and create a revision-bound [handoff](handoff.json). Schema validity alone does not satisfy acceptance or authorize execution.
