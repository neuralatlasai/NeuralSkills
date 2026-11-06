import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const compiler = process.argv[2];
if (!compiler) throw new Error('Usage: node build.mjs /absolute/path/to/typescript.js');
const ts = require(path.resolve(compiler));
const root = path.dirname(fileURLToPath(import.meta.url));
const program = ts.createProgram([path.join(root, 'invitation-copy.ts')], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022,
  strict: true, noEmitOnError: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
});
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  for (const diagnostic of diagnostics) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  process.exitCode = 1;
} else {
  const result = program.emit();
  if (result.emitSkipped) process.exitCode = 1;
  else console.log(`TypeScript ${ts.version}: strict compilation passed`);
}
