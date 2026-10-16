# PLAN artifact template

Proposed filename: `intent.md`. Schema: [artifact](../schemas/artifact.schema.json). Shared authority: [GOV-1](../governance.md) and [ART-1](../artifact-contracts.md).

This is a reusable blank record marked **synthetic**. Copy it into the authorized project artifact location; assign stable IDs/revisions, remove synthetic status only for real project records, and retain NOT_RUN/BLOCKED until actual evidence supports a transition. Required owner: requirements owner. Next consumer: DESIGN.

Define observed pains, inferred needs and solutions separately. Add attributed sources and stable requirement revisions. Each acceptance item needs measure, operator, authorized target and test method. Record scope/non-goals, priority authority, risks and conflicting requirements. The authorized owner resolves conflicts; never infer consensus.

```json
{
  "schema_version": "2.0.0",
  "id": "UNRESOLVED",
  "revision": "UNRESOLVED",
  "task_id": "UNRESOLVED",
  "stage": "PLAN",
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
      "id": "PLAN-DRAFT",
      "action": "draft",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented PLAN-DRAFT criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "PLAN-TO-DESIGN",
      "action": "baseline",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented PLAN-TO-DESIGN criterion to the active task"
      ],
      "input_refs": [],
      "control_ids": [],
      "evidence_ids": [],
      "owner": "UNRESOLVED",
      "rationale": "Unassessed template; resolve only for the requested action",
      "applicability_authority": "UNRESOLVED"
    },
    {
      "id": "PLAN-APPLICABILITY",
      "action": "baseline",
      "outcome": "BLOCKED",
      "criteria": [
        "Apply the documented PLAN-APPLICABILITY criterion to the active task"
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
    "source_refs": [],
    "observed_pain_points": [],
    "inferred_needs": [],
    "proposed_solutions": [],
    "scope": [],
    "non_goals": [],
    "stakeholders": [],
    "approval_owner": "UNRESOLVED",
    "requirements": [],
    "constraints": [],
    "risks": [],
    "conflicts": [],
    "prioritization_policy": {
      "id": "UNRESOLVED",
      "revision": "UNRESOLVED",
      "location": "UNRESOLVED"
    }
  }
}
```

Before handoff, resolve references, validate against the schema, apply the stage-specific gates and create a revision-bound [handoff](handoff.json). Schema validity alone does not satisfy acceptance or authorize execution.
