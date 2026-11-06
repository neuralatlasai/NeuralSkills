import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const candidates = [process.env.TYPESCRIPT_PATH, 'typescript', 'C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js'].filter(Boolean);
let ts;
for (const candidate of candidates) { try { ts = require(candidate); break; } catch {} }
if (!ts) throw new Error('TypeScript is unavailable. Set TYPESCRIPT_PATH to your existing typescript.js compiler API path. The prebuilt app.js is runnable without compiling.');
const root = fileURLToPath(new URL('../', import.meta.url));
const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, strict: true, noEmitOnError: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'] };
const program = ts.createProgram([path.join(root, 'app.ts')], options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => root, getCanonicalFileName: f => f, getNewLine: () => '\n' }));
  process.exitCode = 1;
} else {
  program.emit();
  console.log(`TypeScript ${ts.version}: strict type check and app.js emit passed.`);
}
