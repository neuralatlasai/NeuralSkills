import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

try {
  if(process.argv.includes('--invalid'))throw new Error('Invalid check option');
  const scripts=readdirSync('scripts').filter(path=>path.endsWith('.mjs'));
  for(const script of scripts)execFileSync(process.execPath,['--check',`scripts/${script}`],{stdio:'pipe'});
  const require=createRequire(import.meta.url);
  const compilerPath=process.env.TYPESCRIPT_PATH||'C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js';
  const ts=require(compilerPath);
  const program=ts.createProgram([resolve('evals/fixtures/contracts.ts')],{noEmit:true,strict:true,target:ts.ScriptTarget.ES2022});
  const diagnostics=ts.getPreEmitDiagnostics(program);
  if(diagnostics.length)throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:p=>p,getNewLine:()=> '\n'}));
  console.log(JSON.stringify({status:'PASS',syntaxChecked:scripts,typedContracts:'evals/fixtures/contracts.ts',typescript:ts.version,limitation:'Runtime fixture JavaScript receives syntax and integration checks; only contracts.ts is statically typechecked'}));
}catch(error){console.error(error.message);process.exitCode=1;}
