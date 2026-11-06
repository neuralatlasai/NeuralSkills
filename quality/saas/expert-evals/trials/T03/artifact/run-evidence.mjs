import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const results=[];
for(let i=1;i<=3;i++){
 const start=new Date().toISOString(); const t=performance.now();
 const r=spawnSync(process.execPath,['test.mjs'],{encoding:'utf8',cwd:import.meta.dirname});
 results.push({run:i,start,end:new Date().toISOString(),elapsedMs:performance.now()-t,exitCode:r.status,stdout:r.stdout,stderr:r.stderr});
}
const e=spawnSync(process.execPath,['edge-test.mjs'],{encoding:'utf8',cwd:import.meta.dirname});
results.push({run:'edges',exitCode:e.status,stdout:e.stdout,stderr:e.stderr});
writeFileSync(new URL('./verification.json',import.meta.url),JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({run,exitCode,elapsedMs,stdout})=>({run,exitCode,elapsedMs,stdout})),null,2));
process.exitCode=results.some(x=>x.exitCode!==0)?1:0;
