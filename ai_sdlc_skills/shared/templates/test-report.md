# TEST artifact template

Proposed filename: `test-report.md`. Schema: [artifact](../schemas/artifact.schema.json). Shared authority: [GOV-1](../governance.md) and [ART-1](../artifact-contracts.md).

This is a reusable blank record marked **synthetic**. Copy it into the authorized project artifact location; assign stable IDs/revisions, remove synthetic status only for real project records, and retain NOT_RUN/BLOCKED until actual evidence supports a transition. Required owner: verification owner. Next consumer: DEPLOY.

For every applicable test category record risk basis, oracle, environment/data revisions, sampling/repetitions/windows, measured outcomes and requirement coverage. Record justified exclusions separately with authority. Agent evaluation includes task/tool/argument/permission/unsupported-claim/recovery dimensions. Keep every failing, flaky and NOT_RUN result visible.

```json
{
  "schema_version": "2.0.0",
  "id": "UNRESOLVED",
  "revision": "UNRESOLVED",
  "task_id": "UNRESOLVED",
  "stage": "TEST",
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
      "id": "TEST-ENTRY",
      "action": "execute",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented TEST-ENTRY criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "TEST-ORACLE",
      "action": "accept",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented TEST-ORACLE criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "TEST-EXIT",
      "action": "accept",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented TEST-EXIT criterion to the active task"
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
    "environment": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    },
    "acceptance_policy": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    },
    "test_matrix": [],
    "exclusions": [],
    "oracles": [],
    "test_data": [],
    "measurement_policy": [],
    "results": [],
    "agent_evaluation": [],
    "defects": [],
    "requirement_coverage": []
  }
}
```

Before handoff, resolve references, validate against the schema, apply the stage-specific gates and create a revision-bound [handoff](handoff.json). Schema validity alone does not satisfy acceptance or authorize execution.
