import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,join,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../../..');
const inventoryPath='evals/evidence/delivery-inventory.json';
const inventory=JSON.parse(readFileSync(join(root,inventoryPath),'utf8').replace(/^\uFEFF/,''));
const walk=(dir,prefix='')=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=prefix?`${prefix}/${e.name}`:e.name;return e.isDirectory()?walk(join(dir,e.name),p):[p];});
const actual=walk(root).filter(p=>p!==inventoryPath).sort(),entries=inventory.files,listed=entries.map(e=>e.path).sort(),errors=[];
if(new Set(listed).size!==listed.length)errors.push({problem:'Duplicate inventory path'});
for(const p of actual)if(!listed.includes(p))errors.push({path:p,problem:'Not inventoried'});
for(const p of listed)if(!actual.includes(p))errors.push({path:p,problem:'Missing file'});
for(const e of entries){const path=resolve(root,e.path),rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith(`..${sep}`)){errors.push({path:e.path,problem:'Escapes package'});continue;}if(typeof e.purpose!=='string'||!e.purpose.trim())errors.push({path:e.path,problem:'Missing purpose'});try{const b=readFileSync(path),sha256=createHash('sha256').update(b).digest('hex');if(e.bytes!==b.length||e.sha256!==sha256)errors.push({path:e.path,problem:'Byte/hash mismatch',expectedBytes:e.bytes,actualBytes:b.length,expectedSha256:e.sha256,actualSha256:sha256});}catch(error){errors.push({path:e.path,problem:error.code??error.message});}}
const result={status:errors.length?'FAIL':'PASS',scope:'Read-only independent complete path/purpose/byte/SHA256 check. Exactly the self-referential inventory file is excluded; no package file is written.',inventory:inventoryPath,inventoryCreatedAt:inventory.createdAt,files:actual.length,totalBytes:entries.reduce((n,e)=>n+e.bytes,0),errors};
console.log(JSON.stringify(result,null,2));
process.exitCode=errors.length?1:0;
