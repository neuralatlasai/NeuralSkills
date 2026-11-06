import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const compiler = process.env.TYPESCRIPT_PATH || 'C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js';
const ts = require(compiler);
export function build() {
  const inputs = ['invitation-copy.ts', 'demo.ts'].map(name => fileURLToPath(new URL(name, import.meta.url)));
  const program = ts.createProgram(inputs, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, strict: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], noEmitOnError: true });
  const result = program.emit();
  const errors = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
  if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n', getCanonicalFileName: p => p }));
  console.log('TypeScript strict build passed.');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
