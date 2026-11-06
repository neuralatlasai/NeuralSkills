import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function summarize(input) {
  if (!input || input.kind !== 'lab' || !Array.isArray(input.runs) || input.runs.length < 3) throw new Error('provide kind: lab and at least three runs');
  const forbidden = /field|real.?user|p75|core.?web.?vitals|percentile/i;
  function rejectClaims(value) {
    if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (forbidden.test(key)) throw new Error('lab input cannot assert field, real-user, percentile, or Core Web Vitals claims');
      rejectClaims(child);
    }
  }
  rejectClaims(input);
  if (Object.keys(input).some(key => !['kind', 'runs', 'conditions'].includes(key))) throw new Error('lab input permits only kind, runs and conditions');
  const metrics = Object.keys(input.runs[0]);
  if (!metrics.length) throw new Error('runs must contain numeric metrics');
  const summary = {};
  for (const run of input.runs) {
    if (Object.keys(run).sort().join('|') !== [...metrics].sort().join('|')) throw new Error('all runs must have identical metric names');
    for (const [name, value] of Object.entries(run)) {
      if (forbidden.test(name)) throw new Error('lab metrics cannot assert field or percentile claims');
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`metric ${name} must be finite and nonnegative`);
    }
  }
  for (const name of metrics) {
    const values = input.runs.map(run => run[name]).sort((a, b) => a - b);
    const center = Math.floor(values.length / 2);
    summary[name] = { median: values.length % 2 ? values[center] : (values[center - 1] + values[center]) / 2, min: values[0], max: values.at(-1) };
  }
  return { kind: 'lab-summary', runCount: input.runs.length, claimBoundary: 'Controlled local lab observations only; no field Core Web Vitals, real-user percentile, or production SLO claim.', conditions: input.conditions ?? {}, metrics: summary };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
      console.log('usage: node scripts/measure.mjs INPUT.json [--out OUTPUT.json]\nSummarize at least three controlled lab runs; field percentile claims are rejected.');
      process.exit(0);
    }
    if (!(args.length === 1 || (args.length === 3 && args[1] === '--out'))) throw new Error('usage: node scripts/measure.mjs INPUT.json [--out OUTPUT.json]');
    const output = `${JSON.stringify(summarize(JSON.parse(await readFile(args[0], 'utf8'))), null, 2)}\n`;
    if (args[2]) await writeFile(args[2], output);
    console.log(output.trimEnd());
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
