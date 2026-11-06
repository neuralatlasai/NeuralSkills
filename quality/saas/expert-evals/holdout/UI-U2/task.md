# UI-U2: repair the trapped settings dialog
The settings editor is inside a transformed clipped dashboard card. Narrow screens cut it off; keyboard users escape into the background, and Escape leaves scrolling locked. Repair this native TypeScript/CSS widget. Edit opens; Save changes #saved and closes; Cancel/Escape discard edits. Preserve IDs and native field labels. Replacing overlay div with native dialog is allowed if justified. No framework/focus library/portal package.

Requirements:
- U2-R1: opening exposes a semantic named modal dialog; focus enters it; Tab/Shift+Tab cannot focus background controls (native browser-chrome focus transitions are allowed); background #outside cannot activate via real pointer/keyboard. Cancel/Save/Escape return focus to opener. Opening again works.
- U2-R2: Save uses entered #displayName once and closes; Cancel/Escape discard edits without changing #saved. Closing cleans modal state and restores page scrolling without stale global trap/listener. Second cycle has one save effect (#saveCount).
- U2-R3: 320x480 dialog fully reachable in viewport; long unbroken text wraps; #save/#cancel reachable through internal vertical scrolling; no document/dialog horizontal overflow. Transformed clipped ancestor cannot clip it. Keep visible keyboard focus.
- U2-R4: choose smallest correct platform mechanism; explain compatibility, scrolling/focus ownership and plausible alternative. Distinguish actual browser/keyboard evidence from unperformed AT checks. No routing/global modal manager/animation library/backend.

Export mount(root) => {dispose()}; IDs #open,#panel,#displayName,#save,#cancel,#saved,#saveCount,#outside stable. #panel may become dialog named from #dialogTitle. Native form may replace JS. Edit app.ts/styles.css/index.html/demo.ts plus focused tests/docs. Deliver implementation + handoff.md under shared contract. Installed browser tools available.

