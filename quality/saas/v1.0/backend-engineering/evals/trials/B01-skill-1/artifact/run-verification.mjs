import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const run=spawnSync(process.execPath,[resolve(import.meta.dirname,'verify.mjs')],{encoding:'utf8',timeout:30000});
writeFileSync(resolve(import.meta.dirname,'../verification.stdout.log'),run.stdout??'');
writeFileSync(resolve(import.meta.dirname,'../verification.stderr.log'),run.stderr??'');
writeFileSync(resolve(import.meta.dirname,'../verification-exit.json'),JSON.stringify({command:'node artifact/verify.mjs',exitCode:run.status,signal:run.signal,error:run.error?.message??null},null,2));
process.stdout.write(run.stdout??'');process.stdout.write(run.stderr??'');
process.exitCode=run.status??1;
