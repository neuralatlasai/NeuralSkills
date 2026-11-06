import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url));
const root=mkdtempSync(join(here,'reproduction-'));
for(const phase of ['baseline','optimized']) {
  mkdirSync(join(root,phase));
  copyFileSync(join(here,'bench.mjs'),join(root,phase,'bench.mjs'));
  copyFileSync(join(here,phase==='baseline'?'baseline-query.mjs':'query.mjs'),join(root,phase,'query.mjs'));
}
const db=join(root,'parcels.sqlite');
const exits=[];
function run(name,script,args=[]) {
  const result=spawnSync(process.execPath,[script,...args],{encoding:'utf8',cwd:here});
  writeFileSync(join(root,name+'.stdout.json'),result.stdout??'');
  writeFileSync(join(root,name+'.stderr.txt'),result.stderr??'');
  exits.push({name,exitCode:result.status,error:result.error?.message??null});
  writeFileSync(join(root,'exits.json'),JSON.stringify(exits,null,2));
  if(result.status!==0) throw Error(name+' failed; evidence: '+root);
}
run('seed',join(here,'seed.mjs'),[db]);
run('before',join(root,'baseline','bench.mjs'),[db]);
run('index',join(here,'apply-index.mjs'),[db]);
run('after',join(root,'optimized','bench.mjs'),[db]);
run('verify',join(here,'verify.mjs'),[db]);
run('index-repeat',join(here,'apply-index.mjs'),[db]);
console.log(JSON.stringify({root,exits},null,2));
