import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js');
fs.mkdirSync('dist', { recursive: true });
for (const name of fs.readdirSync('src').filter(name => name.endsWith('.ts'))) {
  const input = fs.readFileSync(path.join('src', name), 'utf8');
  const result = ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }, fileName: name, reportDiagnostics: true });
  if (result.diagnostics?.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(result.diagnostics, { getCanonicalFileName: s => s, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' }));
  fs.writeFileSync(path.join('dist', name.replace(/\.ts$/, '.js')), result.outputText);
}
console.log('Built TypeScript into dist/');
