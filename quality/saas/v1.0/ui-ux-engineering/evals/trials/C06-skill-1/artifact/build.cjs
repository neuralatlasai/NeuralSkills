const fs = require('node:fs');
const path = require('node:path');
const ts = require(process.env.TYPESCRIPT_PATH || 'C:/Users/heman/AppData/Local/Programs/Microsoft VS Code/a717861c07/resources/app/extensions/node_modules/typescript/lib/typescript.js');
const root = __dirname;
const files = ['fake-api', 'app'];
const options = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, strict: true, lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'], noEmit: true};
const program = ts.createProgram(files.map(name => path.join(root, 'src', name + '.ts')), options);
const errors = ts.getPreEmitDiagnostics(program);
if (errors.length) { console.error(ts.formatDiagnosticsWithColorAndContext(errors, {getCurrentDirectory: () => root, getCanonicalFileName: f => f, getNewLine: () => '\n'})); process.exit(1); }
const modules = files.map(name => {
  const source = fs.readFileSync(path.join(root, 'src', name + '.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {...options, noEmit: false}}).outputText;
  return JSON.stringify('./' + name) + ': function(module, exports, require) {\n' + compiled + '\n}';
});
fs.mkdirSync(path.join(root, 'dist'), {recursive: true});
fs.writeFileSync(path.join(root, 'dist', 'app.js'), '(function(){"use strict";const modules={' + modules.join(',\n') + '};const cache={};function require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;modules[id](module,module.exports,require);return module.exports;}require("./app");})();\n');
console.log(JSON.stringify({status:'PASS', typescript:ts.version, sourceFiles:files, output:'dist/app.js', dependencies:'TypeScript compiler API only; no runtime dependencies'}));
