import { readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const source = await readFile(new URL('./app.ts', import.meta.url), 'utf8');
await writeFile(new URL('./app.js', import.meta.url), stripTypeScriptTypes(source, { mode: 'strip' }));
console.log('Built app.js with the Node 24 TypeScript stripper.');
