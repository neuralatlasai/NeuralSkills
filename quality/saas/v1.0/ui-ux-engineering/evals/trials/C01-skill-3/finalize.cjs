const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const browser = JSON.parse(fs.readFileSync(path.join(root, 'evidence/browser.json'), 'utf8'));
function luminance(hex) {
  const rgb = hex.match(/\w\w/g).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722;
}
const pairs = [
  ['button default','#ffffff','#243c52',4.5],
  ['button hover','#ffffff','#182d40',4.5],
  ['body text','#202b38','#f7f8fa',4.5],
  ['muted text','#536171','#f7f8fa',4.5],
  ['error text','#a32525','#f7f8fa',4.5],
  ['success text','#22603d','#f7f8fa',4.5],
  ['focus against adjacent surface','#1763d1','#f7f8fa',3]
].map(([name,foreground,background,threshold]) => {
  const a=luminance(foreground),b=luminance(background);
  const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  return {name,foreground,background,ratio,threshold,status:ratio>=threshold?'PASS':'FAIL'};
});
fs.writeFileSync(path.join(root,'evidence/contrast.json'), JSON.stringify({method:'sRGB relative luminance contrast of authored opaque CSS pairs',pairs},null,2));
const evidence = 'evidence/browser.json';
const checks = [
  {id:'strict-compile',status:'PASS',evidence:'node artifact/build.mjs <supplied TypeScript API>: TypeScript 6.0.3 strict compilation passed, emitted artifact/invitation-copy.js; Node v24.12.0.'},
  ...browser.checks.map(c=>({...c,evidence:{path:evidence,observation:c.evidence}})),
  {id:'contrast',status:pairs.every(p=>p.status==='PASS')?'PASS':'FAIL',evidence:'evidence/contrast.json: all text pairs >=4.5:1 and focus ring against surface >=3:1.'},
  {id:'visual-review',status:'PASS',evidence:'Viewed evidence/desktop.png, focus.png, german-320.png, narrow-error.png: compact single action, restrained slate/neutral palette, clear focus outline, legible wrap, selectable manual URL; no clipping or horizontal overflow.'},
  {id:'screen-reader',status:'UNVERIFIED',evidence:'Live-region DOM semantics checked; no actual screen reader/browser pairing executed.'},
  {id:'automated-a11y-scan',status:'UNVERIFIED',evidence:'No accessibility scanner executed. Targeted DOM/keyboard/contrast checks are recorded separately.'},
  {id:'browser-zoom',status:'UNVERIFIED',evidence:'320px reflow and direct 200% button text enlargement checked; real browser page zoom not executed.'},
  {id:'cross-browser',status:'UNVERIFIED',evidence:'Runtime tested only in installed Chrome 156.0.8078.80 headless on host Windows.'},
  {id:'field-performance',status:'UNVERIFIED',evidence:'No field visits or comparative profiling. 2012ms is a local success-label timer observation, not INP or a field percentile.'},
  {id:'data-request-ordering',status:'NOT_APPLICABLE',evidence:'One local clipboard mutation at a time; no fetching/query race or data refresh.'}
];
const coverage = [
  ['C01-R01','artifact/invitation-copy.ts, styles.css, index.html; strict-compile; no framework/library/icons or marketing page.'],
  ['C01-R02','browser checks initial-name and real-clipboard; exact URL read using actual Chrome Clipboard API.'],
  ['C01-R03','browser check duplicate-pending: Space starts once; Enter and two native clicks while unresolved keep one writer call.'],
  ['C01-R04','browser checks success-retained and success-reset: 2012ms observed versus predefined 1800–2400ms allowance.'],
  ['C01-R05','browser checks rejection-error, retry and unavailable-clipboard; narrow-error screenshot shows recovery and manual URL.'],
  ['C01-R06','browser keyboard-focus, pending-accessibility, live-region, focus-preserved and geometry; focus.png. Screen reader experience remains UNVERIFIED.'],
  ['C01-R07','browser german-narrow-fit-target: 280x71 target at 320px, no text overflow. Desktop/narrow rendered review passed; README documents local no-install startup.']
].map(([id,evidence])=>({id,status:'PASS',evidence}));
const endedAt = new Date().toISOString();
const startedAt = '2026-11-05T16:40:49.000Z';
const result = {
  caseId:'C01',arm:'skill',run:3,startedAt,endedAt,elapsedSeconds:(Date.parse(endedAt)-Date.parse(startedAt))/1000,
  route:{mode:'explore',scope:'small reusable native web component',activeModules:['M1','M3','M4','M5','M6','M8'],conditionalResponsibility:'M7 limited to clipboard duplicate-mutation resilience; no broad workload/performance study'},
  requirementCoverage:coverage,
  assumptions:[
    'Input supplies seven IDs without individually keyed descriptions; brief.md maps them in task order to seven grouped acceptance criteria.',
    'Standalone local example can ship checked-in emitted JavaScript and a Node 24 no-dependency loopback server.',
    'English feedback is default. Supplied German label is a text-expansion fixture; complete application localization was not requested.'
  ],
  decisions:[
    'Use exported typed mountInvitationCopy(host, options), native button and per-instance state with destroy lifecycle.',
    'Keep focus using aria-disabled plus immediate pending guard; status is a separate polite atomic live region.',
    'Clear prior success timer on new attempt, show success for 2000ms, preserve error until deliberate retry and reveal selectable URL.',
    'Use system fonts, CSS semantic color tokens, 48px minimum target height, natural translated-label wrapping, and 3px focus outline.'
  ],
  checks,
  limitations:[
    'Actual browser clipboard success verified with browser permissions granted; denial/unavailability were deterministic test injections, not operating-system permission-dialog testing.',
    'Screen-reader announcement experience, automated accessibility scan, actual browser zoom, cross-browser behavior, and field performance remain UNVERIFIED.',
    'No external design reference, network dependency, user study or claim of complete WCAG conformance.'
  ],
  artifacts:['artifact/index.html','artifact/invitation-copy.ts','artifact/invitation-copy.js','artifact/styles.css','artifact/serve.mjs','artifact/build.mjs','artifact/README.md','brief.md','evidence/browser.json','evidence/contrast.json'],
  failures:browser.errors,
  tokens:null,cost:null
};
fs.writeFileSync(path.join(root,'result.json'), JSON.stringify(result,null,2));
console.log(JSON.stringify({endedAt,elapsedSeconds:result.elapsedSeconds,contrast:pairs.map(p=>({name:p.name,ratio:p.ratio,status:p.status})),checks:checks.length,failures:result.failures},null,2));
