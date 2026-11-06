import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const result = read('result.json');
const normalize = items => items.flatMap(item => Array.isArray(item?.value) ? normalize(item.value) : Array.isArray(item) ? normalize(item) : [item]);
result.checks = normalize(result.checks);
for (const check of result.checks) if (check.id === 'live-feedback') check.evidence = 'Persistent role=status and aria-live=polite verified in Chrome. Actual screen reader announcement audio UNVERIFIED.';
const browserChecks = result.checks.slice(0,15);
writeFileSync('evidence/browser-checks.json',JSON.stringify(browserChecks,null,2)+'\n');
appendFileSync('evidence-command-errors.txt','\nMetadata finalization initially encountered PowerShell property-assignment error because ConvertFrom-Json wrapped an array as {value,Count}. Flattened JSON using Node; result checks now validated as individual objects.\n');
result.endedAt = new Date().toISOString();
result.elapsedSeconds = (Date.parse(result.endedAt)-Date.parse(result.startedAt))/1000;
for (const check of result.checks) { if (!check.id || !['PASS','FAIL','UNVERIFIED','NOT_APPLICABLE'].includes(check.status) || typeof check.evidence !== 'string') throw new Error('Malformed check '+JSON.stringify(check)); }
for (const path of ['artifact/index.html','artifact/src/app.ts','artifact/src/fake-api.ts','artifact/styles.css','artifact/README.md','artifact/dist/app.js','evidence/moss-320.png']) if (!existsSync(path)) throw new Error('Missing '+path);
if (read('evidence/browser-errors.json').length) throw new Error('Final browser errors remain');
writeFileSync('result.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({caseId:result.caseId,arm:result.arm,run:result.run,checks:result.checks.length,startedAt:result.startedAt,endedAt:result.endedAt,elapsedSeconds:result.elapsedSeconds,finalBrowserErrors:0}));
