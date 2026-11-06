import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dispositions = ['IMPLEMENTED_OR_CHANGED','INHERITED_VERIFIED','OUT_OF_SCOPE','RELEVANT_UNVERIFIED'];
const statuses = ['PASS','FAIL','UNVERIFIED','NOT_APPLICABLE'];
const layerIds = Array.from({ length:24 }, (_, i) => `L${String(i+1).padStart(2,'0')}`);
const load = async path => JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const inside = (root,path) => { const r=relative(root,path);return r==='' || (!isAbsolute(r)&&r!=='..'&&!r.startsWith(`..${sep}`)); };
const nonempty = value => typeof value==='string' && value.trim().length>0;

// Supported assertions are intentionally bounded. This is not a complete
// JSON Schema implementation; unsupported schema keywords fail closed.
export function schemaCheck(value,schema,location='$') {
  assert(object(schema),`${location}: schema must be object`);
  const allowed=['$schema','$id','title','description','type','const','enum','required','properties','additionalProperties','items','minItems','maxItems','minLength'];
  for(const key of Object.keys(schema))assert(allowed.includes(key),`${location}: unsupported schema keyword ${key}`);
  if('const' in schema)assert.deepEqual(value,schema.const,`${location}: constant mismatch`);
  if(schema.enum)assert(schema.enum.includes(value),`${location}: enum mismatch`);
  if(schema.type) {
    const checks={object:object(value),array:Array.isArray(value),string:typeof value==='string',number:typeof value==='number'&&Number.isFinite(value),integer:Number.isInteger(value),boolean:typeof value==='boolean',null:value===null};
    assert(Object.hasOwn(checks,schema.type),`${location}: unsupported type`);assert(checks[schema.type],`${location}: wrong type ${schema.type}`);
  }
  if(object(value)) {
    for(const name of schema.required??[])assert(Object.hasOwn(value,name),`${location}.${name}: required`);
    for(const [name,child]of Object.entries(value)) {
      if(schema.properties?.[name])schemaCheck(child,schema.properties[name],`${location}.${name}`);
      else if(schema.additionalProperties===false)assert.fail(`${location}.${name}: additional field`);
    }
  }
  if(Array.isArray(value)) {
    if(schema.minItems!==undefined)assert(value.length>=schema.minItems,`${location}: too few items`);
    if(schema.maxItems!==undefined)assert(value.length<=schema.maxItems,`${location}: too many items`);
    if(schema.items)value.forEach((child,i)=>schemaCheck(child,schema.items,`${location}[${i}]`));
  }
  if(typeof value==='string'&&schema.minLength!==undefined)assert([...value].length>=schema.minLength,`${location}: string too short`);
}
export function contractCheck(context,schema) {
  schemaCheck(context,schema);
  assert.deepEqual(context.coverage.map(x=>x.id).sort(),layerIds,'Coverage must contain each L01–L24 exactly once');
  const ids=new Set();
  for(const check of context.acceptance){assert(nonempty(check.id)&&!ids.has(check.id),'Acceptance IDs must be unique/nonempty');ids.add(check.id);assert(statuses.includes(check.status),'Unknown status');if(check.status==='PASS')assert(check.evidence.length>0,'PASS requires evidence');if(check.status==='NOT_APPLICABLE')assert(nonempty(check.rationale),'NOT_APPLICABLE requires rationale');}
  const decisionIds=new Set();
  for(const decision of context.decisions){assert(!decisionIds.has(decision.id),'Duplicate decision ID');decisionIds.add(decision.id);assert(ids.has(decision.requirement),`Decision requirement ${decision.requirement} is not an acceptance ID`);}
  for(const area of context.coverage){assert(dispositions.includes(area.disposition),'Unknown disposition');if(area.disposition==='INHERITED_VERIFIED')assert(area.evidence.length>0&&area.verifiedScope.length>0,'Inherited verification requires scope and evidence');if(area.disposition==='OUT_OF_SCOPE')assert(nonempty(area.reason),'Outside scope requires reason');if(area.disposition==='RELEVANT_UNVERIFIED')assert(area.unverifiedScope.length>0,'Unverified coverage requires named scope');}
}
async function files(root,prefix='') {
  const result=[];
  for(const entry of await readdir(resolve(root,prefix),{withFileTypes:true})) {
    const path=prefix?`${prefix}/${entry.name}`:entry.name;
    if(['node_modules','.git'].includes(entry.name))continue;
    if(entry.isDirectory())result.push(...await files(root,path));else result.push(path);
  }
  return result;
}
export async function validate(root=packageRoot) {
  const errors=[];let links=0,resources=0;
  const check=async action=>{try{await action();}catch(error){errors.push(error.message);}};
  await check(async()=>{
    const text=await readFile(resolve(root,'SKILL.md'),'utf8');
    assert(/^---\r?\nname: backend-engineering\r?\ndescription: .+\r?\n/m.test(text),'Required simple YAML name/description absent');
    assert(text.trimEnd().split(/\r?\n/).length<500,'Entry must be under500 lines');
    const description=text.match(/^description: (.+)$/m)?.[1];assert(description?.length<=1024,'Description exceeds1024 characters');
    assert.equal(basename(root),'backend-engineering','Folder/name mismatch');
  });
  await check(async()=>{
    for(const path of (await files(root)).filter(x=>x.endsWith('.md'))) {
      const text=(await readFile(resolve(root,path),'utf8')).replace(/^\s*```[^\n]*\n[\s\S]*?^\s*```\s*$/gm,'').replace(/`[^`\n]*`/g,'');
      for(const match of text.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+['"][^'"]*['"])?\)/g)) {
        const target=match[1]??match[2];if(/^[a-z][a-z\d+.-]*:|^\/\/|^#/i.test(target))continue;
        const local=decodeURIComponent(target.split(/[?#]/)[0]);if(!local)continue;
        links++;await check(async()=>{await stat(resolve(root,dirname(path),local));});
      }
    }
  });
  await check(async()=>{const manifest=await load(resolve(root,'assets/manifest.json'));assert.equal(manifest.schemaVersion,'1.0');const seen=new Set();for(const item of manifest.resources){assert(nonempty(item.path)&&nonempty(item.purpose),'Manifest purpose/path required');assert(!seen.has(item.path),'Duplicate manifest path');seen.add(item.path);const target=resolve(root,item.path);assert(inside(root,target),'Manifest escapes root');assert((await stat(target)).isFile(),'Manifest resource not file');resources++;}});
  await check(async()=>contractCheck(await load(resolve(root,'assets/task.template.json')),await load(resolve(root,'assets/task.schema.json'))));
  await check(async()=>{const index=await load(resolve(root,'assets/coverage-index.json'));assert.deepEqual(index.areas.map(x=>x.id),layerIds);for(const item of index.areas)assert((await stat(resolve(root,item.procedure))).isFile(),'Missing module procedure');});
  await check(async()=>{const gates=await load(resolve(root,'assets/gates.json'));assert.equal(gates.gates.length,10,'Ten explicit gate decompositions required');assert.equal(new Set(gates.gates.map(x=>x.id)).size,10,'Duplicate gates');});
  return {status:errors.length?'FAIL':'PASS',scope:'Bounded frontmatter/link/manifest/schema/coverage/decision checks; not full YAML, Markdown or JSON Schema conformance.',links,resources,errors};
}
async function selfTest() {
  const schema=await load(resolve(packageRoot,'assets/task.schema.json')),context=await load(resolve(packageRoot,'assets/task.template.json'));
  contractCheck(context,schema);
  const bad=structuredClone(context);bad.coverage[1].id='L01';assert.throws(()=>contractCheck(bad,schema));
  const falsePass=structuredClone(context);falsePass.acceptance[0].status='PASS';assert.throws(()=>contractCheck(falsePass,schema));
  const disconnected=structuredClone(context);disconnected.decisions[0].requirement='missing';assert.throws(()=>contractCheck(disconnected,schema));
  assert.throws(()=>schemaCheck(1,{type:'number',unknownAssertion:true}));
  console.log(JSON.stringify({status:'PASS',checks:5,coverage:'Valid context; duplicate layer, unsupported PASS, disconnected decision and unsupported keyword rejected.'}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);
    if(args.length===1&&args[0]==='--help')console.log('node scripts/validate-package.mjs [--root DIR | --self-test | --contract FILE]');
    else if(args.length===1&&args[0]==='--self-test')await selfTest();
    else if(args.length===2&&args[0]==='--contract'){contractCheck(await load(resolve(args[1])),await load(resolve(packageRoot,'assets/task.schema.json')));console.log(JSON.stringify({status:'PASS',scope:'Bounded contract assertions'}));}
    else {assert(args.length===0||(args.length===2&&args[0]==='--root'),'Invalid arguments; use --help');const result=await validate(args[1]?resolve(args[1]):packageRoot);console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='PASS'?0:1;}
  }catch(error){console.error(error.message);process.exitCode=1;}
}
