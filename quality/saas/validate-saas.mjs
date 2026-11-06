import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../roles/saas');
const args=process.argv.slice(2);
if(args.length && (args.length!==2 || args[0]!=='--root')) throw Error('usage: node validate-saas.mjs [--root DIR]');
const root=args.length?path.resolve(args[1]):defaultRoot;
const errors=[],check=fn=>{try{fn();}catch(e){errors.push(e.message);}};
let entryWords=0,resources=0,links=0;
check(()=>{
  const list=fs.readdirSync(root,{withFileTypes:true});
  assert(!list.some(x=>x.isDirectory()),'Active skill must remain one flat folder');
  assert(list.filter(x=>x.name==='SKILL.md').length===1,'One active SKILL.md required');
  const text=fs.readFileSync(path.join(root,'SKILL.md'),'utf8');
  assert(/^---\r?\nname: saas\r?\ndescription: .+\r?\n/m.test(text),'Missing name/description metadata');
  assert(path.basename(root)==='saas','Skill folder/name mismatch');
  assert(text.trimEnd().split(/\r?\n/).length<500,'Entry exceeds499lines');
  entryWords=text.trim().split(/\s+/).length;
  assert(entryWords<=320,'Default entry exceeds320word context budget');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  const names=manifest.resources.map(x=>x.path);
  assert(new Set(names).size===names.length,'Duplicate manifest resource');
  assert.deepEqual([...names].sort(),list.map(x=>x.name).sort(),'Manifest does not exactly cover active files');
  for(const x of manifest.resources){assert(x.purpose?.trim(),'Missing resource purpose');assert(!x.path.includes('/')&&!x.path.includes('\\'),'Resource must be flat');assert(fs.statSync(path.join(root,x.path)).isFile(),'Resource missing');resources++;}
  for(const item of list.filter(x=>x.name.endsWith('.md'))){
    const source=fs.readFileSync(path.join(root,item.name),'utf8').replace(/^\s*```[^\n]*\n[\s\S]*?^\s*```\s*$/gm,'').replace(/`[^`\n]*`/g,'');
    for(const m of source.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)){
      const href=m[1];if(/^[a-z][a-z0-9+.-]*:|^\/\//i.test(href))continue;
      links++;const [name,anchor]=href.split('#'),target=path.resolve(root,decodeURIComponent(name||item.name));
      assert(path.dirname(target)===root,'Reference escapes active folder: '+href);
      assert(fs.statSync(target).isFile(),'Missing local reference: '+href);
      if(anchor){const targetText=fs.readFileSync(target,'utf8');const found=[...targetText.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)].map(x=>x[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-'));assert(found.includes(anchor),'Missing heading anchor: '+href);}
    }
  }
  const index=JSON.parse(fs.readFileSync(path.join(root,'backend-coverage.json'),'utf8'));
  assert.deepEqual(index.areas.map(x=>x.id).sort(),Array.from({length:24},(_,i)=>'L'+String(i+1).padStart(2,'0')),'Backend coverage incomplete');
  for(const a of index.areas)assert(fs.existsSync(path.join(root,a.procedure)),'Coverage procedure missing');
  const workflow=fs.readFileSync(path.join(root,'workflow.md'),'utf8');
  for(let i=1;i<=8;i++)assert(workflow.includes('| M'+i+' '),'Missing responsibility M'+i);
});
console.log(JSON.stringify({status:errors.length?'FAIL':'PASS',scope:'Bounded flat-package metadata/link/anchor/manifest/coverage/context assertions; not formal standards or full YAML/schema conformance',entryWords,resources,links,errors},null,2));
process.exitCode=errors.length?1:0;
