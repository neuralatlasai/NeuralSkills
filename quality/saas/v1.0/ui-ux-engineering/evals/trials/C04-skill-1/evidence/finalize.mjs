import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const browser = JSON.parse(await readFile(new URL('evidence/browser-results.json', root), 'utf8'));
const checks = [
 { id: 'strict-typescript-build', status: 'PASS', evidence: 'evidence/tool-history.txt; TypeScript 6.0.3 strict check and emit passed after TS5107 correction' },
 ...browser.checks.map(c => ({ ...c, evidence: { report: 'evidence/browser-results.json', observation: c.evidence } })),
 { id: 'rendered-visual-review', status: 'PASS', evidence: 'evidence/desktop-saved.png, evidence/narrow-invalid.png, evidence/reflow-320.png inspected; single task hierarchy, consistent spacing, clear focus and readable validation/saved summary' },
 { id: 'figma-fidelity', status: 'UNVERIFIED', evidence: 'evals/fixtures/C04/figma-access.json explicitly simulated unavailable; no actual file or connector lookup; artifact/README.md discloses text fallback' },
 { id: 'automated-accessibility-scanner', status: 'UNVERIFIED', evidence: 'No scanner executed; native semantics and limited DOM/contrast/keyboard browser checks are recorded separately' },
 { id: 'assistive-technology', status: 'UNVERIFIED', evidence: 'No screen-reader/browser pair tested' },
 { id: 'manual-browser-zoom', status: 'UNVERIFIED', evidence: 'Viewport reflow tested at 320/375/640px; browser zoom itself not operated' },
 { id: 'field-performance', status: 'UNVERIFIED', evidence: 'No real-user visits or field telemetry; no CWV/performance claim' },
 { id: 'backend', status: 'NOT_APPLICABLE', evidence: 'Requested local-only save; in-memory state, no backend requests or storage' },
 { id: 'helper-cleanup', status: browser.serverStopped ? 'PASS' : 'FAIL', evidence: 'evidence/browser-results.json serverStopped=true; browser closed in verification finally block' }
];
const hashes = {};
for (const file of ['index.html','styles.css','app.ts','app.js','package.json','scripts/build.mjs','scripts/serve.mjs','README.md']) hashes[file] = createHash('sha256').update(await readFile(new URL(`artifact/${file}`, root))).digest('hex');
await writeFile(new URL('evidence/artifact-sha256.json', root), JSON.stringify(hashes,null,2));
const startUTC = '2026-11-05T16:03:33.000Z';
const endUTC = new Date().toISOString();
const result = {
 caseId: 'C04', arm: 'skill', run: 1, startUTC, endUTC,
 elapsedSeconds: (Date.parse(endUTC)-Date.parse(startUTC))/1000,
 timingNote: 'Start is the first actual UTC clock observation during intake; end is final result generation.',
 route: { mode: 'adapt', scope: 'one small native TypeScript/CSS page', activeModules: ['M1','M2 (unavailable reference)','M3','M4','M5','M6','M8','M7 (static runtime only)'], rationale: 'Text fallback explicitly authorized; keep native semantics, no framework/backend/network or fabricated Figma access.' },
 requirementCoverage: [
  { id: 'C04-R01', status: 'PASS', requirement: 'Handle unavailable simulated Figma honestly and continue from brief', evidence: ['artifact/README.md','evidence/brief-and-plan.json'], limitation: 'Figma fidelity UNVERIFIED' },
  { id: 'C04-R02', status: 'PASS', requirement: 'Small form with requested labels, defaults, palette; native TypeScript/CSS', evidence: ['artifact/index.html','artifact/styles.css','artifact/app.ts','evidence/desktop-initial.png','evidence/browser-results.json#defaults'] },
  { id: 'C04-R03', status: 'PASS', requirement: 'Require valid nonblank email and allow recovery', evidence: ['evidence/browser-results.json#blank-email','evidence/browser-results.json#invalid-email','evidence/narrow-invalid.png'] },
  { id: 'C04-R04', status: 'PASS', requirement: 'Keyboard toggles and local save confirmation with stable saved summary', evidence: ['evidence/browser-results.json#keyboard-save','evidence/browser-results.json#saved-snapshot','evidence/browser-results.json#invalid-resave','evidence/browser-results.json#resave-empty','evidence/desktop-saved.png'] },
  { id: 'C04-R05', status: 'PASS', requirement: 'Runnable example, setup instructions and design/Figma handoff', evidence: ['artifact/README.md','artifact/app.js','artifact/scripts/serve.mjs','evidence/browser-results.json'] }
 ],
 assumptions: [
  'System UI font and 32rem maximum width; a stacked form with comfortable spacing implements the fallback brief.',
  'Local saving means an in-memory snapshot only; reload clears state, as disclosed in the interface and README.',
  'Saving with no enabled categories is allowed; show No categories selected.',
  'Use native HTML email syntax validation; do not imply deliverability or mailbox verification.'
 ],
 decisions: [
  'Off-white canvas, charcoal text, dark-blue actions/focus; semantic CSS tokens define color roles.',
  'Use native email/checkbox/button controls with labels, fieldset/legend, associated inline errors and polite save status.',
  'A typed saved snapshot updates only after valid submit; editing and failed resaves preserve prior summary.',
  'Use no external dependencies or fonts; included generated JavaScript runs with the Node loopback server.',
  'Check actual behavior with headless Chrome keyboard events and render desktop/narrow evidence; do not claim Figma fidelity or full accessibility conformance.'
 ],
 checks, limitations: [
  'No real Figma file exists in this simulation; visual fidelity cannot be verified. README lists dimensions/type/colors/states/responsive comparisons needed later.',
  'Browser-driven checks and visual review are limited to the supplied Chrome on this host; no screen reader, full scanner or manual zoom test.',
  'No backend, storage, production integration or field performance measurements; saved values reset on reload.',
  'Initial tool/build failures and their corrections are retained in evidence/tool-history.txt; sandbox rejection was resolved using scoped apply_patch.',
  'No independent reviewer was available because agent concurrency was full.'
 ], tokens: null, cost: null, resourceUsage: 'Token and monetary cost information unavailable',
 evidence: { rawBrowser: 'evidence/browser-results.json', reproduce: 'node evidence/verify.mjs from trial directory; host-specific existing Playwright path is in that inspected script', artifactHashes: 'evidence/artifact-sha256.json', toolHistory: 'evidence/tool-history.txt' }
};
await writeFile(new URL('result.json', root), JSON.stringify(result,null,2));
console.log(JSON.stringify({ result: 'result.json', startUTC, endUTC, elapsedSeconds: result.elapsedSeconds, passedBrowserChecks: browser.checks.filter(c => c.status === 'PASS').length, artifactFiles: await readdir(new URL('artifact/',root)) }));
