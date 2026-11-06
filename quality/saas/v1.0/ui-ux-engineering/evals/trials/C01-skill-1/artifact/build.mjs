import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const compilerPath = process.env.TYPESCRIPT_PATH ?? 'C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js';
const ts = require(compilerPath);
const directory = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const files = ['main.ts', 'copy-invitation.ts'].map(file => path.join(directory, file));
const program = ts.createProgram(files, {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  outDir: path.join(directory, 'dist'),
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
});
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: f => f,
    getCurrentDirectory: () => directory,
    getNewLine: () => '\n',
  }));
  process.exitCode = 1;
} else {
  program.emit();
  console.log(`Compiled native TypeScript with TypeScript ${ts.version}`);
}
