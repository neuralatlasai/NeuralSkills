import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ts = require(process.env.TYPESCRIPT_API || 'C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js');
const root = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(root, 'dist'), { recursive: true });
const program = ts.createProgram([path.join(root,'src/app.ts'),path.join(root,'src/fake-api.ts')],{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,noEmitOnError:true,outDir:path.join(root,'dist'),lib:['lib.es2022.d.ts','lib.dom.d.ts']});
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) { console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>root,getNewLine:()=> '\n'})); process.exitCode=1; }
else { program.emit(); console.log(`TypeScript ${ts.version}: strict build passed`); }
