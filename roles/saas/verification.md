# Verify the affected change

Freeze acceptance before results. Record requirement ID, status, actual command/observation, conditions and evidence. Use PASS, FAIL, UNVERIFIED or NOT_APPLICABLE with rationale; preserve initial failures and rerun affected checks after repair.

For a requested report, apply the [verification record format](documentation.md#5-report-verification-and-traceability); distinguish actual review/approval status from execution results and link the tested baseline.

| Changed concern | Meaningful evidence |
| --- | --- |
| Component/page | Actual action/states, names, keyboard/focus, rendered long content; declared reference conditions and narrow/intermediate/desktop layouts |
| Flow/data UI | Complete journey and recovery; Back/reload; latest-intent and authority invalidation; permitted focus/selection/draft preservation |
| Accessibility | Applicable WCAG A/AA; separate scanner, keyboard/focus, zoom/reflow, contrast and AT/browser coverage |
| API/domain/data | Actual request/operation and real selected database; trusted tenant/object/field denial, atomic concurrency, replay/lost acknowledgement, rollback |
| Async/operations | Effect/ack/owner boundaries, crash/restart, stale ownership, bounded overload, rotation, migration/shutdown and isolated restore where affected |
| Performance | Bottleneck hypothesis, comparable build/workload, correctness and at least three important runs with median/range; retain rejected demand and failures |

Use existing compiler/build/lint/tests and inspect scripts/dependencies before running. Types do not validate network values. Mocks, source review, screenshots, browser automation and AT are different evidence. A timer, animation callback, render count or Lighthouse score cannot stand in for a different metric or full conformance.

Record tool/browser/runtime, device, network/CPU, viewport, dataset/skew, cache, workload and sample count for measurements. Separate immediate feedback, operation completion and field percentiles. Report actual available resource counts; unavailable model identity/tokens/cost remain unavailable.

Review rendered hierarchy, typography, spacing, density, consistency and interaction clarity against the brief. Independent reviews should hide preferred outcomes where possible and disclose broken blinding. A favorable visual assessment cannot erase functional/accessibility failure; expert review is not a user study.

Backend scope uses [backend-coverage.json](backend-coverage.json): classify each area as implemented/changed, inherited and verified, outside scope with reason, or relevant/unverified. Group identical dispositions when concise. Guidance is not an executable adapter guarantee.

This package contains instructions, not bundled application dependencies. Discover actual filesystem, browser, Figma, profiler and service capabilities. Missing tools limit their dependent claims; metadata grants no access. Test the user's project, rather than rerunning this skill's authoring suite for routine work.
