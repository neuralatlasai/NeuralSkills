import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 800, height: 600 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const checks = [];
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const run = async (id, fn) => {
  try { const evidence = await fn(); checks.push({ id, status: 'PASS', evidence }); }
  catch(e) { checks.push({ id, status: 'FAIL', evidence: e.stack }); }
};
await page.goto('http://127.0.0.1:43182');
await run('actual-clipboard-keyboard', async () => {
  const b = page.getByRole('button', { name: 'Copy invitation link', exact: true });
  await page.keyboard.press('Tab');
  assert.equal(await b.evaluate(el => document.activeElement === el), true);
  const focus = await b.evaluate(el => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
  assert.equal(focus.style, 'solid'); assert.equal(focus.width, '3px');
  await page.screenshot({ path: new URL('./desktop-focus.png', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });
  const start = Date.now();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Link copied', exact: true }).waitFor();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(copied, 'https://example.test/invite/team-river');
  const status = await page.locator('[role=status]').textContent(); assert.equal(status, 'Link copied');
  await page.screenshot({ path: new URL('./success.png', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });
  await b.waitFor();
  const elapsed = Date.now() - start;
  assert(elapsed >= 1900 && elapsed <= 2900, `reset ${elapsed}ms`);
  return { payload: copied, keyboard: 'Tab and Enter', resetElapsedMs: elapsed, focus };
});
await page.evaluate(async () => {
  const { createInvitationCopy } = await import('./invitation-copy.js');
  document.querySelector('#copy-example').replaceChildren();
  window.count = 0;
  window.cleanup = createInvitationCopy(document.querySelector('#copy-example'), {
    url: 'https://example.test/invite/team-river',
    writeText: text => { window.count++; window.payload = text; return new Promise((resolve, reject) => { window.finish = resolve; window.fail = reject; }); }
  });
});
await run('pending-duplicate-space-and-recovery', async () => {
  const b = page.getByRole('button');
  await b.focus(); await page.keyboard.press('Space');
  assert.equal(await b.textContent(), 'Copying link\u2026');
  assert.equal(await b.getAttribute('aria-disabled'), 'true');
  await page.keyboard.press('Enter'); await page.keyboard.press('Space');
  await b.evaluate(el => { el.click(); el.click(); });
  assert.equal(await page.evaluate(() => window.count), 1);
  assert.equal(await b.evaluate(el => el === document.activeElement), true);
  await page.evaluate(() => window.finish());
  await page.getByRole('button', { name: 'Link copied' }).waitFor();
  assert.equal(await b.getAttribute('aria-disabled'), null);
  await b.click();
  assert.equal(await page.evaluate(() => window.count), 2);
  await page.evaluate(() => window.fail(new Error('Permission denied')));
  await page.locator('[data-state=error]').waitFor();
  assert.match(await page.locator('[role=status]').textContent(), /Please try again/);
  assert.equal(await page.locator('.invitation-copy__fallback').isVisible(), true);
  await page.screenshot({ path: new URL('./error.png', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });
  await b.click(); assert.equal(await page.evaluate(() => window.count), 3);
  await page.evaluate(() => window.finish());
  await page.getByRole('button', { name: 'Link copied' }).waitFor();
  return { callsDuringPending: 1, callsAfterRetry: 3, focusPreserved: true, error: 'Useful inline error and selectable fallback; retry succeeded' };
});
await run('missing-clipboard', async () => {
  await page.evaluate(async () => {
    window.cleanup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const { createInvitationCopy } = await import('./invitation-copy.js');
    window.cleanup = createInvitationCopy(document.querySelector('#copy-example'), { url: 'https://example.test/invite/team-river' });
  });
  await page.getByRole('button').click();
  await page.locator('[data-state=error]').waitFor();
  assert.equal(await page.getByRole('button').getAttribute('aria-disabled'), null);
  assert.match(await page.locator('[role=status]').textContent(), /select and copy/);
  return 'Unavailable navigator.clipboard produces inline error and re-enabled retry';
});
await run('narrow-translated-target-and-status', async () => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(async () => {
    window.cleanup();
    const { createInvitationCopy } = await import('./invitation-copy.js');
    window.cleanup = createInvitationCopy(document.querySelector('#copy-example'), { url: 'https://example.test/invite/team-river', label: 'Einladungslink f\u00fcr das Projektteam kopieren', writeText: () => Promise.resolve() });
    document.documentElement.lang = 'de';
  });
  await page.getByRole('button').focus();
  const metrics = await page.getByRole('button').evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, pageWidth: document.documentElement.scrollWidth, text: el.textContent, live: document.querySelector('[role=status]').getAttribute('aria-live') }));
  assert(metrics.width >= 44 && metrics.height >= 44);
  assert(metrics.scrollWidth <= metrics.clientWidth);
  assert(metrics.pageWidth <= 320);
  assert.equal(metrics.live, 'polite');
  await page.screenshot({ path: new URL('./narrow-translated.png', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });
  await page.setViewportSize({ width: 160, height: 640 });
  assert((await page.evaluate(() => document.documentElement.scrollWidth)) <= 160);
  await page.screenshot({ path: new URL('./reflow-160.png', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });
  return metrics;
});
const luminance = hex => {
  const c = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
};
await run('contrast', async () => {
  const ratios = Object.fromEntries([['button','#ffffff','#254f46'],['hover','#ffffff','#1b3d35'],['text','#252b32','#fbfbfa'],['status','#555f6b','#fbfbfa'],['error','#a32626','#fbfbfa'],['focus','#1669cc','#fbfbfa']].map(([name,a,b]) => { const x=luminance(a.slice(1)),y=luminance(b.slice(1)); return [name,(Math.max(x,y)+.05)/(Math.min(x,y)+.05)]; }));
  for (const [name,ratio] of Object.entries(ratios)) assert(ratio >= (name === 'focus' ? 3 : 4.5), name);
  return ratios;
});
await run('browser-errors', async () => { assert.deepEqual(errors, []); return errors; });
await fs.writeFile(new URL('./browser-evidence.json', import.meta.url), JSON.stringify({ browser: browser.version(), node: process.version, viewport: { desktop: [800,600], narrow: [320,640], reflow: [160,640] }, font: 'system-ui', headless: true, checks, errors }, null, 2));
await browser.close();
console.log(JSON.stringify(checks, null, 2));
if(checks.some(c => c.status === 'FAIL')) process.exitCode = 1;
