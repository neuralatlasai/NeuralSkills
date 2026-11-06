const fs = require('node:fs');
const path = require('node:path');
const ts = require('C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js');
const root = __dirname;
const files = ['app.ts', 'fake-api.ts'].map(name => path.join(root, 'src', name));
const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], outDir: path.join(root, 'public'), noEmitOnError: true };
const program = ts.createProgram(files, options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) { console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: x=>x, getCurrentDirectory: ()=>root, getNewLine: ()=>'\n' })); process.exit(1); }
const output = program.emit();
if (output.emitSkipped) process.exit(1);
console.log('TypeScript checked and emitted app.js and fake-api.js.');
