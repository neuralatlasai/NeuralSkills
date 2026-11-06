import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const inside = (base, target) => {
  const relative = path.relative(base, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
function assert(condition, message) { if (!condition) throw new Error(message); }

// Deliberately bounded assertions, not a full JSON Schema implementation. Unknown
// assertion keywords fail closed rather than silently claiming schema conformance.
export function validateSchema(value, schema, location = '$', document = schema) {
  const annotations = new Set(['$schema', '$id', '$defs', 'title', 'description', 'default', 'examples', '$comment']);
  const assertions = new Set(['$ref', 'type', 'const', 'enum', 'required', 'properties', 'additionalProperties', 'items', 'minItems', 'minLength', 'pattern', 'minimum', 'maximum']);
  assert(isObject(schema), `${location}: schema must be an object`);
  for (const key of Object.keys(schema)) assert(annotations.has(key) || assertions.has(key), `${location}: unsupported schema keyword ${key}`);
  if (schema.$ref) {
    assert(schema.$ref.startsWith('#/'), `${location}: external schema references are unsupported`);
    const target = schema.$ref.slice(2).split('/').reduce((node, key) => node?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], document);
    assert(target, `${location}: unresolved schema reference`);
    validateSchema(value, target, location, document);
  }
  if ('const' in schema) assert(JSON.stringify(value) === JSON.stringify(schema.const), `${location}: expected constant ${schema.const}`);
  if (schema.enum) assert(schema.enum.includes(value), `${location}: value outside enum`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const matches = type => ({ object: isObject(value), array: Array.isArray(value), string: typeof value === 'string', number: typeof value === 'number' && Number.isFinite(value), integer: Number.isInteger(value), boolean: typeof value === 'boolean', null: value === null })[type];
    assert(types.every(type => ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(type)), `${location}: unsupported schema type`);
    assert(types.some(matches), `${location}: expected ${types.join(' or ')}`);
  }
  if (isObject(value)) {
    for (const key of schema.required ?? []) assert(Object.hasOwn(value, key), `${location}.${key}: missing required field`);
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties?.[key]) validateSchema(child, schema.properties[key], `${location}.${key}`, document);
      else if (schema.additionalProperties === false) throw new Error(`${location}.${key}: additional field`);
      else if (isObject(schema.additionalProperties)) validateSchema(child, schema.additionalProperties, `${location}.${key}`, document);
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined) assert(value.length >= schema.minItems, `${location}: too few items`);
    if (schema.items) value.forEach((item, index) => validateSchema(item, schema.items, `${location}[${index}]`, document));
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined) assert([...value].length >= schema.minLength, `${location}: string too short`);
    if (schema.pattern) assert(new RegExp(schema.pattern, 'u').test(value), `${location}: pattern mismatch`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined) assert(value >= schema.minimum, `${location}: below minimum`);
    if (schema.maximum !== undefined) assert(value <= schema.maximum, `${location}: above maximum`);
  }
}
async function markdownFiles(root) {
  const output = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (['node_modules', '.git', '.artifacts'].includes(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...await markdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) output.push(full);
  }
  return output;
}
function internalLinks(text) {
  const clean = text.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, '').replace(/`[^`\n]+`/g, '');
  return [...clean.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+['"][^'"]*['"])?\s*\)/g)].map(match => match[1] ?? match[2])
    .concat([...clean.matchAll(/^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm)].map(match => match[1] ?? match[2]));
}
function anchors(source) {
  const found = new Set(); const counts = new Map();
  const clean = source.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, '');
  for (const match of clean.matchAll(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const slug = match[1].toLowerCase().replace(/<[^>]+>/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    const count = counts.get(slug) ?? 0; counts.set(slug, count + 1); found.add(count ? `${slug}-${count}` : slug);
  }
  for (const match of source.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) found.add(match[1]);
  return found;
}
export async function validate(root = skillRoot) {
  const errors = [];
  let links = 0;
  let resources = 0;
  const check = async fn => { try { await fn(); } catch (error) { errors.push(error.message); } };
  await check(async () => {
    const source = await readFile(path.join(root, 'SKILL.md'), 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    assert(frontmatter, 'SKILL.md: missing YAML frontmatter');
    assert(/^name:\s*ui-ux-engineering\s*$/m.test(frontmatter[1]), 'SKILL.md: name must be ui-ux-engineering');
    assert(/^description:\s*\S.+$/m.test(frontmatter[1]), 'SKILL.md: non-empty one-line description required');
    assert(source.trimEnd().split(/\r?\n/).length < 500, 'SKILL.md: must remain under 500 lines');
  });
  await check(async () => {
    for (const file of await markdownFiles(root)) {
      for (const link of internalLinks(await readFile(file, 'utf8'))) {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link)) continue;
        const destination = decodeURIComponent(link.split(/[?#]/)[0]);
        const fragment = link.includes('#') ? decodeURIComponent(link.slice(link.indexOf('#') + 1)) : '';
        links++;
        await check(async () => {
          const target = destination ? path.resolve(path.dirname(file), destination) : file;
          await stat(target);
          if (fragment) assert(anchors(await readFile(target, 'utf8')).has(fragment), `${path.relative(root, file)}: missing anchor in ${link}`);
        });
      }
    }
  });
  await check(async () => {
    const manifest = await readJson(path.join(root, 'assets/manifest.json'));
    assert(manifest.schemaVersion === '1.0' && Array.isArray(manifest.resources), 'manifest: schemaVersion 1.0 and resources array required');
    const seen = new Set();
    for (const resource of manifest.resources) {
      assert(typeof resource.path === 'string' && typeof resource.purpose === 'string' && resource.purpose.trim(), 'manifest: each resource needs path and purpose');
      assert(!seen.has(resource.path), `manifest: duplicate resource ${resource.path}`);
      seen.add(resource.path);
      const target = path.resolve(root, resource.path);
      assert(inside(root, target), `manifest: resource escapes skill root: ${resource.path}`);
      assert((await stat(target)).isFile(), `manifest: resource is not a file: ${resource.path}`);
      resources++;
    }
  });
  await check(async () => {
    const schema = await readJson(path.join(root, 'assets/contracts.schema.json'));
    assert(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'contracts schema: expected draft 2020-12 declaration');
    validateSchema(await readJson(path.join(root, 'assets/contract.template.json')), schema);
  });
  return { status: errors.length ? 'FAIL' : 'PASS', validator: 'bounded supported-keyword assertions; not full JSON Schema conformance', markdownLinks: links, manifestResources: resources, errors };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    assert(args.length === 0 || (args.length === 2 && args[0] === '--root'), 'usage: node scripts/validate.mjs [--root DIR]');
    const result = await validate(args[1] ? path.resolve(args[1]) : skillRoot);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'PASS' ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
