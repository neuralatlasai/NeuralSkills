import fs from 'node:fs/promises';
const start = '2026-11-05T16:21:35Z';
const end = new Date().toISOString();
const browser = JSON.parse(await fs.readFile('browser-evidence.json', 'utf8'));
const result = {
  caseId: 'C01', arm: 'skill', run: 2,
  route: 'small-component / adapt / M1,M3,M4,M5,M6,M8',
  startedAt: start, endedAt: end, elapsedSeconds: (Date.parse(end) - Date.parse(start)) / 1000,
  tokens: null, cost: null,
  requirementCoverage: [
    { id: 'C01-R01', status: 'PASS', evidence: 'artifact/invitation-copy.ts exports reusable createInvitationCopy; plain artifact/styles.css; no runtime dependencies, icons, React or UI library' },
    { id: 'C01-R02', status: 'PASS', evidence: 'browser-evidence.json actual-clipboard-keyboard: exact default label; real Chrome clipboard readback equals https://example.test/invite/team-river' },
    { id: 'C01-R03', status: 'PASS', evidence: 'browser-evidence.json pending-duplicate-space-and-recovery: Enter, Space and repeated clicks cause exactly one pending write; focus preserved' },
    { id: 'C01-R04', status: 'PASS', evidence: 'browser-evidence.json actual-clipboard-keyboard: Link copied announced and resets; observed elapsed including test polling 2472ms; implementation timer 2000ms' },
    { id: 'C01-R05', status: 'PASS', evidence: 'browser-evidence.json missing-clipboard and pending-duplicate-space-and-recovery; useful inline error, selectable fallback, retry succeeds after rejection; error.png' },
    { id: 'C01-R06', status: 'PASS', evidence: 'Tab/Enter/Space browser checks; persistent role=status aria-live=polite; 3px outline; narrow button 280x69.5 CSS px. Screen-reader speech remains UNVERIFIED.' },
    { id: 'C01-R07', status: 'PASS', evidence: 'narrow-translated.png: supplied German label wraps without clipping at 320px; 160px reflow test; desktop-focus.png; artifact/README.md and runnable generated JS' }
  ],
  assumptions: [
    'Input provides seven IDs without individual descriptions; assigned to task requirements in order as documented in brief.json.',
    'Light theme and system fonts satisfy the brief; localhost or HTTPS supplies the clipboard secure context.',
    'Successful status remains retryable; only pending submissions are blocked.'
  ],
  decisions: [
    'Use a native button and synchronous pending guard with aria-disabled to retain focus while preventing duplicate writes.',
    'Persistent polite live region announces progress/success/error; errors reveal a selectable URL and actionable retry message.',
    'Use wrapping text, logical properties and a 48px minimum height; restrained green action, clear blue focus outline, no motion.',
    'No package installs or network requests; use existing Node, TypeScript API and Chrome/Playwright.'
  ],
  checks: [
    { id: 'typescript-build', status: 'PASS', evidence: 'node build.mjs exited 0; TypeScript 6.0.3 strict compilation, Node v24.12.0; generated main.js and invitation-copy.js retained' },
    ...browser.checks.map(c => ({ id: c.id, status: c.status, evidence: { path: 'browser-evidence.json', observation: c.evidence } })),
    { id: 'visual-review', status: 'PASS', evidence: 'Inspected desktop-focus.png, error.png, narrow-translated.png. Primary action legible, restrained spacing/color, visible focus, German label fully visible on two lines, useful error and fallback.' },
    { id: 'screen-reader', status: 'UNVERIFIED', evidence: 'No screen reader exercised. DOM live-region semantics and native accessible name checked in browser.' },
    { id: 'automated-accessibility-scanner', status: 'UNVERIFIED', evidence: 'No accessibility scanner run; focused DOM, keyboard, focus, layout and contrast checks executed.' },
    { id: 'browser-zoom', status: 'UNVERIFIED', evidence: '160 CSS px viewport reflow tested as a stress proxy; browser zoom control was not exercised.' },
    { id: 'field-performance', status: 'UNVERIFIED', evidence: 'No real-user data or performance percentile measurement. No field performance claim.' }
  ],
  limitations: [
    'Chrome headless only, system font; no cross-browser or screen-reader validation.',
    'Clipboard success verified with actual granted browser clipboard; unavailable/rejection paths use deterministic browser simulation and injectable writeText adapter.',
    'No scanner, real browser zoom UI, user study or field performance measurements.',
    'Local server was stopped after verification; run node server.mjs from artifact to restart.'
  ],
  initialFailures: [],
  errors: browser.errors,
  evidence: ['brief.json', 'browser-evidence.json', 'verify.mjs', 'desktop-focus.png', 'success.png', 'error.png', 'narrow-translated.png', 'reflow-160.png']
};
await fs.writeFile('result.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ caseId: result.caseId, endedAt: end, elapsedSeconds: result.elapsedSeconds, failedChecks: result.checks.filter(c => c.status === 'FAIL').length }));
