import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { sourceHash, machine, recorder, assert } from './evidence.mjs';
import { startFixture } from './service.mjs';
import { legacyCreate } from '../evals/fixtures/legacy-repository.mjs';

async function main(){
  if(process.argv.includes('--invalid'))throw new Error('Invalid smoke option');
  const base=resolve('evals/evidence/integrated');const directory=join(base,'smoke-runs',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(directory,{recursive:true});const log=recorder(directory,'smoke');const results=[];
  function run(name,args,expectedExit=0){const started=performance.now();const execution=spawnSync(process.execPath,args,{encoding:'utf8',timeout:60000});const result={name,args,expectedExit,actualExit:execution.status,signal:execution.signal,stdout:execution.stdout,stderr:execution.stderr,error:execution.error?.message,durationMs:performance.now()-started,status:execution.status===expectedExit?'PASS':'FAIL'};results.push(result);log(result);assert(result.status==='PASS',`${name}: expected exit${expectedExit}, got${execution.status}`);}
  for(const script of ['check','cert-gen','service','integrated','dns-network','load','worker','smoke'])run(`${script} failure path`,[`scripts/${script}.mjs`,'--invalid'],1);
  let serviceError='';try{await startFixture();}catch(error){serviceError=error.message;}assert(serviceError.includes('required'),'service export invalid input not rejected');
  let evidenceError='';try{sourceHash(join(directory,'missing-root'));}catch(error){evidenceError=error.code;}assert(evidenceError==='ENOENT','evidence sourceHash invalid input not rejected');
  let legacyError='';try{legacyCreate(null,{});}catch(error){legacyError=error.message;}assert(legacyError.includes('requires'),'legacy invalid input not rejected');
  log({kind:'module-failure-paths',status:'PASS',serviceError,evidenceError,legacyError});
  run('syntax and contract typecheck',['scripts/check.mjs']);
  run('certificate generator CLI',['scripts/cert-gen.mjs',join(directory,'certs')]);
  run('service startup and stop CLI',['scripts/service.mjs',join(directory,'service'),'--smoke']);
  const workerPath=join(directory,'worker.sqlite');const db=new DatabaseSync(workerPath);db.exec("CREATE TABLE jobs(id TEXT PRIMARY KEY,tenant TEXT,item_id TEXT,state TEXT,attempts INTEGER DEFAULT 0);CREATE TABLE effects(job_id TEXT PRIMARY KEY,tenant TEXT,effect TEXT);INSERT INTO jobs VALUES('smoke-job','tenant-a','smoke-item','pending',0)");db.close();
  run('worker ack CLI',['scripts/worker.mjs',workerPath,'--ack']);
  run('integrated HTTPS database suite',['scripts/integrated.mjs']);
  run('real DNS endpoint replacement suite',['scripts/dns-network.mjs']);
  run('open arrivals load suite',['scripts/load.mjs']);
  const summary={status:'PASS',recordedAt:new Date().toISOString(),runDirectory:directory,source:sourceHash(),machine:machine(),results,moduleFailurePaths:{status:'PASS',serviceError,evidenceError,legacyError},scope:'All executable CLIs tested with successful and invalid-option exits; helper modules exercised through integration; invalid TLS/HTTP/SQL paths are in raw integrated evidence.'};writeFileSync(join(directory,'smoke-results.json'),JSON.stringify(summary,null,2));writeFileSync(join(base,'smoke-results.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({status:'PASS',checks:results.length,moduleFailurePaths:'PASS'}));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
