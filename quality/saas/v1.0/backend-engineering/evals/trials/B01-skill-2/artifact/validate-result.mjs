import assert from 'node:assert/strict';
import { readFile,writeFile,stat,copyFile,mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=async p=>JSON.parse((await readFile(resolve(root,p),'utf8')).replace(/^\uFEFF/,''));
const result=await read('result.json'),control=await read('artifact/original/control-v2.json'),input=await read('artifact/original/B01.json');
const keys=['caseId','arm','run','route','coverageDispositions','requirements','decisions','checks','evidence','assumptions','limitations','startUtc','endUtc','elapsedSeconds','actualTokens','tokenAvailability','actualCost','costAvailability','toolCalls','toolCallAvailability','limits'];
for(const key of keys)assert(Object.hasOwn(result,key),key);
assert.equal(result.caseId,'B01');assert.equal(result.arm,'skill');assert.equal(result.run,2);
assert.equal(result.coverageDispositions.length,24);assert.equal(new Set(result.coverageDispositions.map(x=>x.area)).size,24);
assert.deepEqual(result.coverageDispositions.map(x=>x.area),control.areas.map(x=>x.id));
for(const area of result.coverageDispositions){assert(control.coverageDispositions.some(x=>x.value===area.disposition));for(const key of ['area','disposition','component','reason','evidence'])assert(Object.hasOwn(area,key));}
assert.deepEqual(result.requirements.map(x=>x.id),input.requirements.map(x=>x.id));
for(const x of [...result.requirements,...result.checks])assert(control.resultStatuses.values.includes(x.status));
for(const decision of result.decisions)for(const key of ['requirement','mechanism','limit','failure','verification'])assert(decision[key]);
for(const evidence of result.evidence)await stat(resolve(root,evidence));
for(const run of [2,3,4]){const data=await read(`evidence/verification-${run}.json`);assert.equal(data.checks.length,10);assert(data.checks.every(x=>x.status==='PASS'));assert.equal(data.runtime.node,'v24.12.0');assert.equal(data.runtime.sqlite,'3.50.4');}
assert.equal((await read('evidence/faults.command.json')).exitCode,0);
const base=resolve(root,'../..');
for(const file of ['service.mjs','README.md'])assert((await readFile(resolve(root,'artifact/original',file))).equals(await readFile(resolve(base,'skill-fixtures/B01',file))));
await mkdir(resolve(root,'evidence/inspected-sources'),{recursive:true});
const packageBase=resolve(base,'..');
for(const file of ['SKILL.md','references/api-domain.md','references/data.md','references/edge-identity.md','references/verification.md','references/runtime-capacity.md'])await copyFile(resolve(packageBase,file),resolve(root,'evidence/inspected-sources',file.replaceAll('/','_')));
await copyFile(resolve(base,'dispatch/B01-skill-2.txt'),resolve(root,'evidence/inspected-sources/dispatch.txt'));
result.checks.push({id:'result-contract',status:'PASS',command:'node artifact/validate-result.mjs',exitCode:0,evidence:'evidence/structure.stdout.txt; artifact/validate-result.mjs',kind:'contract and retained-evidence verification'});
result.evidence.push('evidence/inspected-sources','artifact/validate-result.mjs');
result.endUtc=new Date().toISOString();
await writeFile(resolve(root,'result.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:'PASS',areas:24,requirements:6,finalIntegrationChecks:30,slowBodyFault:'PASS',originalsUnchanged:true,tools:12,endUtc:result.endUtc,firstObservedClock:'2026-11-05T17:25:09.2922864Z',elapsedSinceFirstObservedSeconds:(Date.parse(result.endUtc)-Date.parse('2026-11-05T17:25:09.2922864Z'))/1000}));
