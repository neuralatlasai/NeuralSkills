# DESIGN artifact template

Proposed filename: `architecture.md`. Schema: [artifact](../schemas/artifact.schema.json). Shared authority: [GOV-1](../governance.md) and [ART-1](../artifact-contracts.md).

This is a reusable blank record marked **synthetic**. Copy it into the authorized project artifact location; assign stable IDs/revisions, remove synthetic status only for real project records, and retain NOT_RUN/BLOCKED until actual evidence supports a transition. Required owner: design reviewer. Next consumer: BUILD and TEST.

Describe system/trust boundaries, stakeholder concerns, components and protocol/data contracts including validation, authorization, versioning, errors/timeouts and compatibility. Compare feasible alternatives using approved objectives. Include quality scenarios, dependency/topology/operations decisions and conditional threat/accessibility/safety analysis. Each details map must contain the semantic fields specified in ART-1.

```json
{
  "schema_version": "2.0.0",
  "id": "UNRESOLVED",
  "revision": "UNRESOLVED",
  "task_id": "UNRESOLVED",
  "stage": "DESIGN",
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
      "id": "DESIGN-DRAFT",
      "action": "draft",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented DESIGN-DRAFT criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "DESIGN-TO-BUILD",
      "action": "baseline",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented DESIGN-TO-BUILD criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "DESIGN-CONDITIONAL",
      "action": "baseline",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented DESIGN-CONDITIONAL criterion to the active task"
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
    "system_boundary": "UNRESOLVED",
    "stakeholder_concerns": [],
    "components": [],
    "interfaces": [],
    "data_contracts": [],
    "trust_boundaries": [],
    "failure_behavior": [],
    "dependencies": [],
    "deployment_topology": [],
    "operations": [],
    "quality_scenarios": [],
    "threat_assessment": [],
    "accessibility_assessment": [],
    "safety_assessment": [],
    "decision_refs": []
  }
}
```

Before handoff, resolve references, validate against the schema, apply the stage-specific gates and create a revision-bound [handoff](handoff.json). Schema validity alone does not satisfy acceptance or authorize execution.
