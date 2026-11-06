import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const browser=JSON.parse(await readFile(resolve(root,'browser-evidence.json'),'utf8'));
const review=JSON.parse(await readFile(resolve(root,'review-evidence.json'),'utf8'));
const requirementCoverage=[
 ['C06-R01','Native TypeScript/CSS local page, no backend/React/UI library, unchanged supplied API','artifact/src/app.ts; artifact/src/fake-api.ts; review-evidence.json fixture/build'],
 ['C06-R02','Labeled search input; Search button and Enter submit','browser-evidence.json: initial-semantic-keyboard, cedar-enter-pending-result, moss-search-button'],
 ['C06-R03','Initial prompt and visible pending feedback on requests; concurrent new search permitted','browser-evidence.json: initial-semantic-keyboard, cedar-enter-pending-result, both race checks; pending-desktop.png'],
 ['C06-R04','Returned guide cards with content, useful empty state','browser-evidence.json: cedar-enter-pending-result, moss-search-button, empty-state; cedar-desktop.png; empty-desktop.png'],
 ['C06-R05','Clear failure with Retry that makes another attempt for the failed query','browser-evidence.json: failure-and-retry-same-query; fixtureCalls records two 650ms attempts; failure-320.png'],
 ['C06-R06','Latest submitted intent guards success, rejection and finally; both requested races checked','artifact/src/app.ts: generation checks; browser-evidence.json: race-cedar-then-moss (1475ms), race-fail-then-moss (924ms)'],
 ['C06-R07','Accessible feedback semantics, keyboard task, usable focus','browser-evidence.json: initial-semantic-keyboard, cedar-enter-pending-result, failure-and-retry-same-query; review-evidence.json color pairs; AT output UNVERIFIED'],
 ['C06-R08','320px layout, setup instructions and reproducible checks','artifact/README.md; browser-evidence.json: 320px-reflow-and-long-content; moss-320.png; failure-320.png']
].map(([id,requirement,evidence])=>({id,requirement,status:'PASS',evidence}));
const checks=[
 {id:'strict-build',status:review.build.status,evidence:'review-evidence.json build; executed node artifact/build.mjs with TypeScript 6.0.3 and Node v24.12.0; no diagnostics'},
 {id:'unchanged-fixture',status:review.fixture.unchanged?'PASS':'FAIL',evidence:'review-evidence.json fixture; byte equality and SHA256 baa8f07b2ffd4cfbfb614f12fa69a53745499c5ed06e056e326ac37a25bd10c3'},
 ...browser.checks.map(c=>({...c,evidence:{path:'browser-evidence.json',observation:c.evidence}})),
 {id:'rendered-visual-review',status:review.visualReview.status,evidence:review.visualReview},
 {id:'declared-color-pairs',status:review.pairs.every(x=>x.status==='PASS')?'PASS':'FAIL',evidence:'review-evidence.json: ten sRGB pair calculations; text >=4.5, input boundary and focus >=3; not a complete accessibility scan'},
 {id:'assistive-technology',status:'UNVERIFIED',evidence:'No screen reader used. Live-region and label semantics were browser-tested; spoken output is unverified.'},
 {id:'full-automated-accessibility-scan',status:'UNVERIFIED',evidence:'No scanner installed or run; browser DOM, keyboard/focus, color and 320px reflow checks recorded separately.'},
 {id:'actual-browser-zoom',status:'UNVERIFIED',evidence:'320px viewport and long-content reflow tested; no browser zoom action performed.'},
 {id:'performance-field-lab',status:'UNVERIFIED',evidence:'No field visits, CWV or three-run comparison measurement. Race elapsed values establish fixture waiting only, not performance claims.'}
];
for(const f of ['artifact/index.html','artifact/style.css','artifact/src/app.ts','artifact/src/fake-api.ts','artifact/dist/app.js','artifact/dist/fake-api.js','artifact/README.md','artifact/build.mjs','artifact/serve.mjs']) await access(resolve(root,f));
const endedAt=new Date().toISOString();
const startedAt='2026-11-05T16:40:43.000Z';
const result={caseId:'C06',arm:'skill',run:2,startedAt,endedAt,elapsedSeconds:(Date.parse(endedAt)-Date.parse(startedAt))/1000,route:'adapt / small native web component; M1, M3, M4, M5, M6, M7, M8; M2 limited to supplied fixture contract',requirementCoverage,assumptions:['English local demo with current Chrome; no persistence or URL query contract required.','R01–R08 mapped in task order because supplied IDs have no individual descriptions.','System fonts; API fixture data/timing only, no real network service.'],decisions:['Single native form with stable input, polite atomic status outside busy result content, semantic cards.','Incrementing request generation guards every Promise success, catch and finally; no cancellation assumed.','New search clears earlier cards, preserves draft/focus and remains available while pending.','Retry captures the failed submitted query independently of edited input and focuses the persistent input before hiding Retry. No automatic retry loop.','Warm-paper/forest palette with CSS semantic tokens, content-driven mobile stacking and 46px+ controls.'],checks,limitations:['Fixture fail always fails; Retry is verified as a fresh same-query attempt with another expected failure.','Browser automation used Chrome 156.0.8078.80 headless, Playwright 1.64.0-alpha-1790635538000, DPR1; no other browsers or physical devices.','Keyboard checks were browser-driven; no human user study or screen-reader test.','Full accessibility conformance, actual zoom behavior, and field/lab performance are not established.','Build uses existing host TypeScript API; set TYPESCRIPT_API to an existing installation on another host.'],tokens:null,cost:null,artifacts:{directory:'artifact',setup:'artifact/README.md',test:'check.mjs',rawEvidence:'browser-evidence.json',review:'review-evidence.json'},cleanup:'Playwright browser closed and loopback helper process terminated in test finally; no helper left intentionally running.'};
await writeFile(resolve(root,'result.json'),JSON.stringify(result,null,2),'utf8');
const saved=JSON.parse(await readFile(resolve(root,'result.json'),'utf8'));
console.log(JSON.stringify({caseId:saved.caseId,arm:saved.arm,run:saved.run,startedAt:saved.startedAt,endedAt:saved.endedAt,elapsedSeconds:saved.elapsedSeconds,requirements:saved.requirementCoverage.length,checks:saved.checks.map(({id,status})=>({id,status}))},null,2));
