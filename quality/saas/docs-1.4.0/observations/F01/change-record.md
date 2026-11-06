# CR-F01 — Save duplicate suppression

Revision 1 · 2026-11-06 · Draft proposal; unapproved.
Owner: UNASSIGNED. Reviewer: UNASSIGNED.
Audience: implementer/reviewer and Save-button users.
Scope: one Save-button correction. Baseline: supplied scenario; no implementation/build supplied. Browser/device coverage and API contract unavailable.

## Sources and requirements

Source: [F01 fixture](../../cases.json). Supplied facts are not independently observed behavior.

OBS-F01-01: rapid activation reportedly submits twice; reproduction is UNVERIFIED. User research/measurements: unavailable.

| Requirement | Source/type | Condition and acceptance | Verification |
| --- | --- | --- | --- |
| REQ-F01-01 | Supplied requirement | While saving is pending, further activation initiates no additional mutation. | TEST-F01-01 |
| REQ-F01-02 | Supplied constraint | Preserve native button/form semantics and existing brand across pending, success and failure states. | TEST-F01-02 |
| REQ-F01-03 | Proposed acceptance from supplied decision | Pending and terminal feedback expose meaningful status accessibly; keyboard operation and focus remain usable. | TEST-F01-02 |

## DEC-F01-01 — proposed correction

Use one operation owner at the mutation entry boundary, shared by button activation and form submission. Claim pending ownership synchronously before invoking the mutation; suppress subsequent attempts while owned. Release ownership only for that operation's eligible completion; an obsolete callback must not unlock another operation.

Reuse the native control, existing visual tokens and feedback pattern. Expose pending state and accessible status without replacing native semantics. Preserve drafts on failure and allow another deliberate save after a confirmed terminal outcome.

A visual-only busy state cannot guarantee duplicate suppression. Separate click/submit flags risk divergent ownership. The shared guard addresses both paths with minimal scope.

Limit: local suppression does not establish server idempotency across tabs, reloads or retries. Timeout/lost-response reconciliation depends on the unavailable API contract. No automatic mutation retry is proposed. Confirm existing semantics/feedback conventions during implementation; revisit this decision if multiple mutation entry points exist.

## Planned acceptance evidence

Artifact/build/environment/data: unavailable; no implementation supplied, no tests ran.

| Test / trace | Planned method and expected result | Actual / status |
| --- | --- | --- |
| TEST-F01-01 → REQ-F01-01 | Hold save pending; rapidly click, activate by keyboard and submit the form; observe one mutation initiation until completion. | Not run / UNVERIFIED |
| TEST-F01-02 → REQ-F01-02,03 | Exercise pending, success and failure; inspect native semantics, brand, keyboard/focus and status with supported browser/assistive technology. | Not run / UNVERIFIED |

Acceptance remains UNVERIFIED; this record grants no approval.
