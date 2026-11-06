// No install required. Supply an existing TypeScript compiler path as the argument.
const path = require('node:path');
const ts = require(process.argv[2] || 'typescript');
const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020, strict: true,
  lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'], noEmitOnError: true, skipLibCheck: true };
const program = ts.createProgram([path.join(__dirname, 'invitation-copy.ts')], options);
const result = program.emit();
const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
for (const item of diagnostics) console.error(ts.flattenDiagnosticMessageText(item.messageText, '\n'));
if (diagnostics.length || result.emitSkipped) process.exitCode = 1;
else console.log('TypeScript checked and invitation-copy.js generated.');
