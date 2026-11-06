import ts from 'file:///C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, strict: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], outDir: 'dist', noEmitOnError: true };
const program = ts.createProgram(['src/app.ts', 'src/fake-api.ts'], options);
const result = program.emit();
const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
if (diagnostics.length) { console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: f => f, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' })); process.exit(1); }
writeFileSync('dist/index.html', readFileSync('index.html'));
writeFileSync('dist/styles.css', readFileSync('styles.css'));
console.log('Built TypeScript and copied page assets.');

