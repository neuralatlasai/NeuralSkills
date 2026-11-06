const fs = require('node:fs');
const path = require('node:path');
const ts = require('C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js');
const trial = __dirname;
const artifact = path.join(trial, 'artifact');
const fixture = path.resolve(trial, '../../fixtures/C05/repo');
const files = ['package.json', 'index.html', 'tsconfig.json', 'vite.config.ts', 'src/main.tsx', 'src/App.tsx', 'src/styles.css', 'README.md'];
const changed = files.filter(file => !fs.readFileSync(path.join(fixture, file)).equals(fs.readFileSync(path.join(artifact, file))));
const source = fs.readFileSync(path.join(artifact, 'src/App.tsx'), 'utf8');
const original = fs.readFileSync(path.join(fixture, 'src/App.tsx'), 'utf8');
const css = fs.readFileSync(path.join(artifact, 'src/styles.css'), 'utf8');
const originalCss = fs.readFileSync(path.join(fixture, 'src/styles.css'), 'utf8');
const parse = text => ts.createSourceFile('App.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const data = text => parse(text).statements.find(statement => ts.isVariableStatement(statement) && statement.declarationList.declarations.some(d => d.name.getText() === 'invoices')).declarationList.declarations[0].initializer.getText();
const transpile = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, isolatedModules: true }, fileName: 'App.tsx', reportDiagnostics: true });
const diagnostics = [...parse(source).parseDiagnostics, ...(transpile.diagnostics || [])].map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
const results = {
  kind: 'Source comparison and syntax only; no React runtime, typecheck, visual or accessibility result',
  typescriptApiVersion: ts.version,
  changedFiles: changed,
  checks: [
    { id: 'only-requested-source-files-changed', pass: JSON.stringify(changed) === JSON.stringify(['src/App.tsx', 'src/styles.css']) },
    { id: 'all-supplied-invoice-data-identical', pass: data(source) === data(original) },
    { id: 'css-variables-identical', pass: css.match(/:root\s*\{[^}]*\}/)[0] === originalCss.match(/:root\s*\{[^}]*\}/)[0] },
    { id: 'focus-style-preserved', pass: css.includes(originalCss.split('\n').find(line => line.startsWith('a:focus-visible'))) },
    { id: 'tsx-parse-transpile', pass: diagnostics.length === 0, diagnostics }
  ]
};
fs.writeFileSync(path.join(trial, 'source-checks.json'), JSON.stringify(results, null, 2));
process.stdout.write(JSON.stringify(results, null, 2));
process.exitCode = results.checks.every(check => check.pass) ? 0 : 1;
