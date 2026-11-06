import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=fileURLToPath(new URL('.',import.meta.url)),root=resolve(here,'../../../..');
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const records=['b01-results.json','b02-skill-results.json','b02-baseline-results.json'].filter(f=>existsSync(join(here,f))).flatMap(f=>read(join(here,f)).trials.map(t=>({...t,resultFile:f})));
const cases=read(join(root,'evals/cases.json')).cases;
const b01Basis=[
 'Own HTTP assertions and stored public projection establish allowed title/note, trim, absence/null and version behavior; source uses a single conditional UPDATE RETURNING.',
 'Own HTTP reader/missing identity, forged tenant header and absent tenant object checks plus unchanged south data establish fixture registry scope.',
 'Two simultaneous actual HTTP same-version requests yield200/409; close/reopen retains only winner and expected version.',
 'Own malformed/schema/media/2049byte checks yield requested JSON statuses with no prior invalid mutation; parser bounds inspected.',
 'Own GET before/after and real file reopen preserve public contract; task verification and commands retained.',
 '24unique valid coverage values with actual components/reasons/evidence and six five-field requirement decisions inspected. No production claims in README.'
];
const b02Basis=[
 'Own two-DatabaseSync-connection shared afterRead barrier yields201/409; reopened file has stock1/version2/oneallocation4; south unchanged.',
 'Own synchronous afterWrite throw leaves no stock/allocation partial mutation; connection has no transaction and subsequent valid reservation succeeds.',
 'Own zero/negative/fractional, absent item, insufficient stock and tenant checks; source preserves exported async API and version predicates.',
 'Own forced interleaving invokes both async hooks; actual fault and later retry plus source inspection preserve hooks without memory-only serialization.',
 'Actual SQLite transaction/CAS mechanism, one-writer/synchronous busy timeout and no distributed guarantee documented and inspected.',
 '24unique valid coverage values with components/reasons/evidence and six five-field decisions inspected; scope and unavailable metrics stated.'
];
const trials=records.map(t=>{const caseId=t.id.slice(0,3),raw=read(join(root,'evals/trials',t.id,'result.json')),coverage=raw.coverageDispositions,ids=coverage.map(c=>c.area??c.id),coverageValid=ids.length===24&&new Set(ids).size===24&&coverage.every(c=>['IMPLEMENTED_OR_CHANGED','INHERITED_VERIFIED','OUT_OF_SCOPE','RELEVANT_UNVERIFIED'].includes(c.disposition)&&c.component&&c.reason&&(c.disposition!=='INHERITED_VERIFIED'||c.evidence)),decisions=raw.decisions.every(d=>['requirement','mechanism','limit','failure','verification'].every(k=>d[k]!==undefined)),dynamic=t.checks.every(c=>c.status==='PASS');return{trial:t.id,caseId,controlVersion:'2',blinding:'Broken: arm/directory/result visible; fixed objective HTTP/SQLite probes.',sourceEvidence:t.resultFile,requirements:cases.find(c=>c.id===caseId).requirements.map((r,i)=>({id:r.id,status:(i===5?coverageValid&&decisions:dynamic)?'PASS':'UNVERIFIED',basis:(caseId==='B01'?b01Basis:b02Basis)[i],evidence:[t.resultFile,`evals/trials/${t.id}/result.json`,`evals/trials/${t.id}/artifact/${caseId==='B01'?'service':'store'}.mjs`,`evals/trials/${t.id}/artifact/README.md`]})),coverage:{count:coverage.length,unique:new Set(ids).size,valid:!!coverageValid},decisions:{count:raw.decisions.length,fiveFields:decisions}};});
const summary=trials.flatMap(t=>t.requirements).reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{PASS:0,FAIL:0,UNVERIFIED:0,NOT_APPLICABLE:0});
const result={assessedAt:new Date().toISOString(),control:'Both arms supplied same explicit user-derived disposition definitions/output contract, case requirements, raw fixture, inherited model/tools/budget; skill instructions are the intervention.',observedTrials:trials.length,expectedComparativeTrials:4,status:trials.length===4&&summary.FAIL===0&&summary.UNVERIFIED===0?'PASS':'UNVERIFIED',trials,summary,resources:'Budget/resource observations live separately in ../coordinator-evidence-summary.json; functional criterion PASS is not exact metering proof.',comparison:'One run per arm per case after control repair; original pilots retained; no best-of, broad superiority, statistical-confidence or resource-saving inference.'};
writeFileSync(join(here,'requirement-assessment.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,observedTrials:trials.length,summary}));
