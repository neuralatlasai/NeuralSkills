const ts=require('C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js');
const path=require('node:path');
const program=ts.createProgram([path.join(__dirname,'app.ts')],{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,strict:true,lib:['lib.es2022.d.ts','lib.dom.d.ts'],noEmitOnError:true});
const result=program.emit();
const diagnostics=ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
for(const d of diagnostics)console.error(ts.flattenDiagnosticMessageText(d.messageText,'\n'));
if(result.emitSkipped||diagnostics.length)process.exitCode=1;
