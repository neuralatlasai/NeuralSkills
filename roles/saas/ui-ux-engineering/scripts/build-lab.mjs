import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { skillRoot } from './validate.mjs';

const require = createRequire(import.meta.url);
export async function findTypeScript() {
  if (process.env.TYPESCRIPT_MODULE) { await access(process.env.TYPESCRIPT_MODULE); return process.env.TYPESCRIPT_MODULE; }
  try { return require.resolve('typescript'); } catch {}
  const candidates = [];
  if (process.env.APPDATA) candidates.push(path.join(process.env.APPDATA, 'npm/node_modules/typescript/lib/typescript.js'));
  if (process.env.LOCALAPPDATA) {
    const vscode = path.join(process.env.LOCALAPPDATA, 'Programs/Microsoft VS Code');
    candidates.push(path.join(vscode, 'resources/app/extensions/node_modules/typescript/lib/typescript.js'));
    for (const name of await readdir(vscode).catch(() => [])) candidates.push(path.join(vscode, name, 'resources/app/extensions/node_modules/typescript/lib/typescript.js'));
  }
  for (const candidate of candidates) { try { await access(candidate); return candidate; } catch {} }
  return null;
}
// Prefer an installed compiler, without downloading or installing anything.
// Fallback only strips erasable syntax and explicitly reports no type checking.
export async function buildLab(root = path.join(skillRoot, 'evals/fixtures/lab')) {
  const compiler = await findTypeScript();
  if (compiler) {
    for (const name of ['state', 'app']) await access(path.join(root, `${name}.ts`));
    const ts = require(compiler);
    const program = ts.createProgram(['state.ts', 'app.ts'].map(name => path.join(root, name)), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noEmitOnError: true, skipLibCheck: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'] });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: name => name, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
    const result = program.emit();
    if (result.emitSkipped) throw new Error('TypeScript emission failed');
    return { status: 'PASS', method: 'installed TypeScript compiler; strict semantic check and JavaScript emit', compiler, version: ts.version, built: ['state.js', 'app.js'] };
  }
  const built = [];
  for (const name of ['state', 'app']) {
    const source = await readFile(path.join(root, `${name}.ts`), 'utf8');
    const output = stripTypeScriptTypes(source, { mode: 'strip' });
    await writeFile(path.join(root, `${name}.js`), output);
    built.push(`${name}.js`);
  }
  return { status: 'PASS', method: 'Node built-in erasable TypeScript syntax stripping; no semantic type checking', compiler: null, built };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (!(args.length === 0 || (args.length === 2 && args[0] === '--root'))) throw new Error('usage: node scripts/build-lab.mjs [--root DIR]');
    console.log(JSON.stringify(await buildLab(args[1] ? path.resolve(args[1]) : undefined), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
