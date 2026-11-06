# Frontend design: composition and interaction

## Make the choice consequential

Name the decision the user must make, required information and cost of error. Identify the dominant conflict: comparison/narrative, density/targets, fidelity/accessibility, or immediate action/accidental commitment.

Explore two or three structural, compositional or interaction alternatives; accent changes alone are insufficient. Reject binding-constraint failures, then compare task fit, scan path, maintenance and cost. Reproduction preserves identity; compare only consequential unresolved implementation choices.

Illustrative invoice brief: operators compare overdue records; established brand tokens apply; no user study exists.

| Direction | Concrete fit/cost | Selection condition |
| --- | --- | --- |
| Aligned rows with summary and action column | Supports cross-record comparison; requires narrow-screen treatment | Choose when comparison dominates; reject if the actual task needs long individual explanations |
| Guided narrative sections | Gives exception explanations room; increases comparison/navigation work | Choose for guided resolution, not routine cross-record scanning |
| Independent cards | Handles heterogeneous objects; repeats controls and loses alignment | Choose only when object independence matters; reject equal-height clipping of required fields |

For the first direction, “professional” becomes: amounts/dates remain associated, overdue has text as well as color, one action has priority, long names/errors wrap, narrow transformation preserves the required comparison, and keyboard recovery works. These are hypotheses, not research findings. Translate “modern,” “stylish,” “dense” or “fast” into similarly observable criteria.

## Compose with actual content

Inventory short/long titles, large numbers, missing values, errors and localized labels before choosing tracks or block sizes.

| Decision | Mechanism and limit | Failure/probe |
| --- | --- | --- |
| Hierarchy | Rank information by the next decision; assign consistent type/spacing roles | Equal emphasis obscures priority. Inspect the rendered task/action/supporting evidence; report ambiguity without claiming measured usability |
| Typography | Define body/label/heading/data roles, font availability, scale/weight/line height and readable measure | Font fallback changes wrapping. Compare fallback/loaded states with longest content and declared widths |
| Alignment | Establish common edges, track relationships and baseline rhythm | Repeated nudges hide inconsistent boxes. Compare computed geometry and optical alignment; correct the shared rule first |
| Density | Remove redundant grouping/padding before reducing text/targets | Extra rows become harder to operate. Check required fields, target spacing, focus paths and expanded errors |
| Color | Bind surfaces/text/action/feedback/focus to semantic roles | Selected resembles error or color carries meaning alone. Inspect actual state pairs and computed contrast |
| Assets/motion | Identify information, recognition or continuity served; reserve asset geometry and reduced-motion behavior | Decoration delays/displaces the task. Compare its stated contribution; preserve required reference identity |

For an icon/letterform whose box aligns but appears displaced, test an optical correction across adjacent sizes/fonts/states. Do not promote a local negative offset into a global token without evidence. Avoid fixed heights around variable content and blanket transition rules.

## Keep tokens and consumers coherent

Use the project's ownership chain: primitive values -> semantic roles -> component bindings -> explicit context overrides. Separate theme mappings from component state. Add a token for a meaningful reusable distinction, not every local layout adjustment; merge only if roles cannot legitimately diverge.

Check token/API consumers using the [component contract procedure](frontend-implementation.md#evolve-component-contracts). Render representative density, error, pending/disabled and applicable theme consumers; matching token names or a successful demo do not prove compatible computed results.

## Transform the relationships, not the viewport label

Choose breakpoints where actual content fails and name what must survive: association, comparison, action order or narrative order.

| Transformation | Appropriate need | Limit and probe |
| --- | --- | --- |
| Stack/wrap | Vertical order retains task meaning | Check DOM reading/focus order, long labels and action proximity; visual reordering must not confuse keyboard order |
| Scrollable table region | Comparison needs columns and the applicable reflow exception is established | Retain header/context and keyboard/touch access; distinguish table scrolling from page overflow |
| Prioritized columns plus details | Some fields are secondary to the task | Provide defined access to omitted details and test the task needing them; do not silently lose fields |
| Region-dependent component layout | Component appears in differently sized regions | Verify actual browser/tooling support and sizing relationships; retain a usable fallback |

Use logical properties where meaning follows writing direction; audit physical shorthands, mixed-direction identifiers and icons separately. Test long headings, unbroken identifiers, labels/errors and realistic volume at narrow, intermediate, desktop and native zoom conditions. Do not infer hidden responsive rules from one screenshot.

## Own the interaction cost

| Candidate | Select when | Additional obligation/rejection condition |
| --- | --- | --- |
| Native table with links/buttons | Read/compare records with independent actions | Retain header relationships and meaningful tab order; many controls can create a long tab sequence |
| Interactive grid | Cell navigation/editing is actually required | Own focus/navigation/edit modes and selection; role=grid alone implements none of them |
| Native select/explicit choices | Bounded choice fits native interaction/content | Test long choices and labels; appearance alone does not justify replacement |
| Custom combobox/listbox | Search/async behavior needs more than the native control | Define input versus selected value, active option, keyboard/focus, loading/no-results and invalidation; inspect a compatible primitive's real API |

Specify consequential controls' semantics, inputs/events, transitions, keyboard/focus, validation and recovery. Loading needs named feedback and a duplicate-action policy; disabled reasons cannot depend solely on hover. An overlay must handle a deleted invoker, disappearing resource or revoked authority with meaningful surviving focus.

## Review a correction, not a preference

Finding: observed state -> user consequence -> mechanism -> smallest correction -> probe. Example: a fixed block size clips the German action's consequence at the recorded width; allow content-driven height and inspect the same error plus adjacent states. Keep the original failure and before/after evidence.

For reproduction record crop, viewport/device scale, font/renderer/state and tolerances before comparison; pixel differences are sensitive to rendering and do not settle hierarchy. Disclose necessary accessibility/implementation deviations. Resolve multi-reference roles explicitly rather than averaging incompatible identities.

Use the [standards record](standards.md) for accessibility scope. Primary checks dated 2026-11-06: [APG table](https://www.w3.org/WAI/ARIA/apg/patterns/table/) distinguishes static structure with independent controls; [APG grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) describes composite focus ownership. Both are live informative guidance, not pinned browser/AT guarantees.
