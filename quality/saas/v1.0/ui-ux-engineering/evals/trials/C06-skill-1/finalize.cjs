const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const browser = JSON.parse(fs.readFileSync(path.join(root,'evidence/browser.json'),'utf8'));
const start = new Date('2026-11-05T15:49:18Z');
const end = new Date();
const coverage = [
 ['C06-R01','Native TypeScript/CSS page, labeled form, Enter and Search submission',['initial-form','cedar-pending-success-enter','moss-search-button']],
 ['C06-R02','Initial prompt and visible pending state for each current request',['initial-form','cedar-pending-success-enter','failure-retry-same-query']],
 ['C06-R03','Guide cards and useful empty outcome',['moss-search-button','empty']],
 ['C06-R04','Clear failure and Retry of the same failed query',['failure-retry-same-query']],
 ['C06-R05','Latest submitted query wins over stale successes and failures',['race-stale-success','race-stale-failure']],
 ['C06-R06','Live feedback semantics and usable keyboard focus',['initial-form','cedar-pending-success-enter','failure-retry-same-query','narrow-320-and-focus']],
 ['C06-R07','Responsive page fits 320px with long moss content',['narrow-320-and-focus']],
 ['C06-R08','Unchanged fixture, setup instructions, deterministic scenario checks',['fixture-unchanged','runtime-errors']]
].map(([id,requirement,checkIds])=>({id,requirement,status:checkIds.every(id=>browser.checks.find(c=>c.id===id)?.status==='PASS')?'PASS':'FAIL',evidence:checkIds.map(id=>'evidence/browser.json#'+id)}));
const result = {
 caseId:'C06',arm:'skill',run:1,
 route:'ui-ux-engineering; small local native component; explore; M1,M3,M4,M5,M6,M7,M8',
 requirementCoverage:coverage,
 assumptions:[
 'The task supplies eight requirement IDs without individual descriptions; descriptions in this result map the supplied task text to those IDs.',
 'No brand or reference layout was supplied; a compact field-library visual direction is an implementation decision.',
 'Known local typed fixture payloads are trusted; no real backend or network is used.'
 ],
 decisions:[
 'Original API copied byte-for-byte. TypeScript compiler API performs strict checking and creates a tiny CommonJS browser bundle; no package install or runtime UI library.',
 'A monotonically increasing request ID guards every success, rejection and finally update. Searches remain enabled while requests run; old cards clear on submission.',
 'Retry owns the last submitted query independently of editable input. Retrying moves focus from the disappearing Retry button to the persistent input.',
 'Stable polite live status lies outside the aria-busy results list. Native form, label and buttons provide semantics and keyboard behavior.',
 'System fonts, semantic CSS variables, stacked narrow form, wrapping cards and at least 46px form controls keep this small page usable.',
 'No automatic retries or timeouts are introduced into the deterministic fixture. Results are informational cards.'
 ],
 checks:[
 {id:'build',status:'PASS',evidence:'evidence/build-final.stdout.txt: strict TypeScript 6.0.3 check and bundle completed.'},
 ...browser.checks.map(c=>({id:c.id,status:c.status,evidence:'evidence/browser.json: '+JSON.stringify(c.observation||c.error)})),
 {id:'render-review',status:'PASS',evidence:'Inspected evidence/desktop-results.png (960x850) and evidence/mobile-results-focus.png (320x760): readable hierarchy, aligned form, wrapped long guide title, no clipped cards, visible keyboard focus ring.'},
 {id:'initial-fixture-check-path',status:'FAIL',evidence:'evidence/browser-initial.json and browser-initial.stdout.txt preserve ENOENT from helper path. Corrected helper path; final fixture-unchanged check PASS. This was a test helper defect.'},
 {id:'assistive-technology',status:'UNVERIFIED',evidence:'No screen reader run. DOM live-region and keyboard checks do not establish announcements in AT.'},
 {id:'automated-a11y-and-contrast',status:'UNVERIFIED',evidence:'No accessibility scanner or numerical contrast evaluation executed.'},
 {id:'field-performance',status:'NOT_APPLICABLE',evidence:'Local fixture task; no field data or performance claim. No CWV or INP measurement executed.'}
 ],
 limitations:[
 'Headless Chrome 156 only; no other browser or assistive technology tested. This is not a WCAG conformance assessment.',
 '200% text resizing was checked at 640px; actual browser zoom was not exercised.',
 'Original failed verification output is retained; later browser run passes all 10 checks.',
 'Host tool paths in build and verification scripts are explicit; TYPESCRIPT_PATH supports another compiler location. Playwright/Chrome paths match the supplied environment.',
 'PowerShell environment inspection used unsupported Get-Date -AsUTC once; error preserved in evidence/environment-inspection-error.txt. UTC timing comes from clock tool for start and Node Date for end.',
 'Tokens and cost are not exposed; actualTokens and cost are null.'
 ],
 startUtc:start.toISOString(),endUtc:end.toISOString(),elapsedSeconds:(end-start)/1000,actualTokens:null,cost:null
};
fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(root,'evidence/environment-inspection-error.txt'),'Observed during environment inspection: Get-Date : A parameter cannot be found that matches parameter name AsUTC. PowerShell exited 1 for that inspection command. Other environment probes succeeded. UTC clock tool was used instead.\n');
console.log(JSON.stringify({result:'result.json',elapsedSeconds:result.elapsedSeconds,finalBrowserChecks:browser.checks.length,pass:browser.checks.filter(c=>c.status==='PASS').length,fail:browser.checks.filter(c=>c.status==='FAIL').length}));
