import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { buildLab } from './build-lab.mjs';
import { startServer } from './serve.mjs';
import { skillRoot } from './validate.mjs';
import { summarize } from './measure.mjs';

const require = createRequire(import.meta.url);
async function findBrowser(explicit) {
  const candidates = explicit ? [explicit] : [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
  for (const candidate of candidates) { try { await access(candidate); return candidate; } catch {} }
  throw new Error('Browser unavailable. Supply --browser PATH or CHROME_PATH to an installed Chrome/Edge/Chromium binary.');
}
async function findPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); } catch {}
  const installed = process.env.APPDATA && path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright');
  if (installed) { try { return require(installed); } catch {} }
  throw new Error('Optional Playwright unavailable. Set PLAYWRIGHT_MODULE to an already installed playwright module; this tool does not install packages.');
}
export async function runLab({ browserPath, out = path.join(skillRoot, 'evals/evidence/lab') } = {}) {
  const executablePath = await findBrowser(browserPath);
  const { chromium } = await findPlaywright();
  const build = await buildLab();
  await mkdir(out, { recursive: true });
  const { server, url } = await startServer({ port: 0 });
  let browser;
  const checks = [], runs = [], runtimeErrors = [], networkFailures = [], contrastSamples = [];
  const check = async (name, action) => { await action(); checks.push({ name, status: 'PASS' }); };
  try {
    browser = await chromium.launch({ headless: true, executablePath });
    for (let index = 0; index < 3; index++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', error => runtimeErrors.push(error.message));
      page.on('requestfailed', request => networkFailures.push({ url: request.url(), error: request.failure()?.errorText }));
      const began = performance.now();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('status').filter({ hasText: '6 requests shown.' }).waitFor();
      const navigateToReadyMs = performance.now() - began;
      const domContentLoadedMs = await page.evaluate(() => performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd);
      const refreshStart = performance.now();
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Refreshing requests.' }).waitFor();
      await page.getByRole('status').filter({ hasText: '6 requests shown.' }).waitFor();
      const refreshReadyMs = performance.now() - refreshStart;
      runs.push({ navigateToReadyMs, domContentLoadedMs, refreshReadyMs });
      if (index === 0) {
        await page.screenshot({ path: path.join(out, 'desktop.png'), fullPage: true });
        await check('landmarks, table, labels and polite status region exist', async () => {
          assert.equal(await page.getByRole('main').count(), 1); assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
          assert.equal(await page.getByRole('table', { name: 'Team requests' }).count(), 1);
          assert.equal(await page.getByRole('searchbox', { name: 'Search requests' }).count(), 1);
          assert.equal(await page.getByLabel('Status', { exact: true }).count(), 1);
          assert.equal(await page.getByRole('status').getAttribute('aria-live'), 'polite');
        });
        await check('selected meaningful text and status pairs meet 4.5:1 contrast', async () => {
          const samples = await page.evaluate(() => {
            const parse = value => value.match(/[\d.]+/g).map(Number);
            const luminance = color => color.slice(0, 3).map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
            return ['.request-title strong', '.request-meta', '.in-progress', '.in-review', '.backlog', '.updated', '.priority-high', '.priority-medium', '.priority-low', '.metric-label', '.panel-footer', '.load-status', '.button.primary'].map(selector => {
              const node = document.querySelector(selector); const foreground = getComputedStyle(node).color;
              let parent = node, background = 'rgb(255, 255, 255)';
              while (parent) { const candidate = getComputedStyle(parent).backgroundColor; const channels = parse(candidate); if (channels.length < 4 || channels[3] === 1) { background = candidate; break; } parent = parent.parentElement; }
              const fg = luminance(parse(foreground)), bg = luminance(parse(background));
              return { selector, foreground, background, ratio: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) };
            });
          });
          contrastSamples.push(...samples); for (const sample of samples) assert.ok(sample.ratio >= 4.5, `${sample.selector}: ${sample.ratio}`);
        });
        await check('search, status filter, empty state and clear-filters recovery', async () => {
          await page.getByRole('searchbox').fill('onboarding'); await page.getByRole('status').filter({ hasText: '1 request shown.' }).waitFor();
          assert.equal(await page.locator('#rows tr').count(), 1); assert.match(await page.locator('#rows').innerText(), /onboarding/);
          await page.getByRole('searchbox').fill(''); await page.getByLabel('Status', { exact: true }).selectOption('Backlog');
          await page.getByRole('status').filter({ hasText: '2 requests shown.' }).waitFor();
          await page.getByRole('searchbox').fill('no matching request'); await page.getByRole('heading', { name: 'No requests found' }).waitFor();
          await page.screenshot({ path: path.join(out, 'empty.png'), fullPage: true });
          await page.getByRole('button', { name: 'Clear filters' }).click(); await page.getByRole('status').filter({ hasText: '6 requests shown.' }).waitFor();
          assert.equal(await page.getByRole('searchbox').evaluate(node => node === document.activeElement), true);
        });
        await check('background failure preserves rows, exposes stale indicator, and retry restores freshness', async () => {
          await page.getByText('Demo controls', { exact: true }).click();
          await page.getByLabel('Fail the next request to exercise retry').check(); await page.getByRole('button', { name: 'Refresh', exact: true }).click();
          await page.locator('#error-panel').waitFor({ state: 'visible' }); assert.equal(await page.locator('#rows tr').count(), 6);
          assert.equal(await page.locator('#stale').isVisible(), true); await page.screenshot({ path: path.join(out, 'error.png'), fullPage: true });
          await page.getByRole('button', { name: 'Try again' }).click(); await page.getByRole('status').filter({ hasText: '6 requests shown.' }).waitFor();
          assert.equal(await page.locator('#error-panel').isVisible(), false); assert.equal(await page.locator('#stale').isVisible(), false);
        });
        await check('explicit abort preserves previous results and announces cancellation', async () => {
          await page.getByRole('button', { name: 'Refresh', exact: true }).click(); await page.getByRole('button', { name: 'Stop refresh' }).click();
          await page.getByRole('status').filter({ hasText: 'Refresh stopped.' }).waitFor(); assert.equal(await page.locator('#rows tr').count(), 6);
          await page.getByRole('button', { name: 'Refresh', exact: true }).click(); await page.getByRole('status').filter({ hasText: '6 requests shown.' }).waitFor();
        });
        await check('native modal focuses title, prevents duplicate submit, recovers failed mutation and returns focus', async () => {
          await page.getByLabel('Fail the next request to exercise retry').check(); await page.getByRole('button', { name: 'New request' }).click();
          const title = page.getByRole('textbox', { name: 'Request title' }); assert.equal(await title.evaluate(node => node === document.activeElement), true);
          await title.fill('Plan the next customer interview'); await page.getByRole('button', { name: 'Create request', exact: true }).click();
          assert.equal(await page.locator('#submit-request').isDisabled(), true);
          await page.locator('#submit-error').waitFor({ state: 'visible' }); assert.equal(await page.locator('#submit-request').isEnabled(), true);
          await page.screenshot({ path: path.join(out, 'dialog-error.png'), fullPage: true });
          await page.getByRole('button', { name: 'Create request', exact: true }).click();
          // Programmatic duplicate event exercises the handler gate while disabled.
          await page.locator('#create-form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
          await page.getByRole('status').filter({ hasText: '7 requests shown.' }).waitFor(); assert.equal(await page.locator('#rows tr').count(), 7);
          assert.equal(await page.getByRole('button', { name: 'New request' }).evaluate(node => node === document.activeElement), true);
          await page.getByRole('button', { name: 'New request' }).click(); await page.keyboard.press('Escape'); assert.equal(await page.locator('#create-dialog').isVisible(), false);
        });
        await check('keyboard skip link and visible focus style are available', async () => {
          await page.goto(url); await page.keyboard.press('Tab'); assert.equal(await page.getByRole('link', { name: 'Skip to work queue' }).evaluate(node => node === document.activeElement), true);
          await page.keyboard.press('Enter'); assert.equal(await page.getByRole('main').evaluate(node => node === document.activeElement), true);
          const buttonFocus = await page.locator('#new-request').evaluate(node => { node.focus(); const style = getComputedStyle(node); return { width: parseFloat(style.outlineWidth), style: style.outlineStyle }; });
          assert.ok(buttonFocus.width >= 2); assert.notEqual(buttonFocus.style, 'none');
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByRole('status').filter({ hasText: '6 requests shown.' }).waitFor();
        await check('390px layout contains page overflow and keeps primary controls at least 24px', async () => {
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          for (const id of ['new-request', 'search', 'status-filter', 'refresh']) { const box = await page.locator(`#${id}`).boundingBox(); assert.ok(box.width >= 24 && box.height >= 24, `${id} minimum target size`); }
          assert.equal(await page.locator('#new-request').evaluate(node => getComputedStyle(node).transitionDuration), '0s');
        });
        await page.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true });
      }
      await context.close();
    }
    assert.deepEqual(runtimeErrors, [], 'browser runtime exceptions'); assert.deepEqual(networkFailures, [], 'failed resource requests');
    const conditions = { build: 'local typed fixture compiled by build-lab.mjs', tool: 'Playwright using installed Chromium-family browser', browser: await browser.version(), executablePath, device: `${process.platform} ${process.arch}; host CPU/memory not controlled`, network: 'loopback; no throttling; synthetic in-memory request delay 320ms', cpu: 'no throttling', viewport: '1440x1050 metrics; 390x844 responsive check', dataset: 'six synthetic requests; mutation case creates seventh temporarily', cache: 'new browser context per run; HTTP Cache-Control no-store', workload: 'navigate to six rendered requests; refresh until six requests announced', timing: 'Node performance clock end-to-end UI readiness, plus browser navigation DCL timing' };
    const input = { kind: 'lab', conditions, runs };
    const report = { status: 'PASS', build, checks, runtimeErrors, networkFailures, contrastSamples, contrastMethod: 'WCAG sRGB relative luminance formula on 13 computed foreground/background pairs; selected opaque backgrounds only; does not audit every text/interaction state.', screenshotFiles: ['desktop.png', 'empty.png', 'error.png', 'dialog-error.png', 'mobile.png'], accessibilityBoundary: 'Bounded DOM/keyboard/focus/layout/24px-target/reduced-motion and selected contrast checks in one Chromium browser. No full WCAG conformance, screen-reader session, comprehensive contrast audit, zoom/forced-colors coverage, or multi-browser compatibility claim.', raceEvidence: 'A/B out-of-order completion and same-gate failure/retry are tested in scripts/test-tools.mjs independently of browser abort behavior.' };
    await writeFile(path.join(out, 'runs.json'), `${JSON.stringify(input, null, 2)}\n`);
    await writeFile(path.join(out, 'measurements.json'), `${JSON.stringify(summarize(input), null, 2)}\n`);
    await writeFile(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    return { status: 'PASS', checks: checks.length, runs: runs.length, out, browser: conditions.browser };
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {}; const args = process.argv.slice(2);
    while (args.length) { const flag = args.shift(), value = args.shift(); if (!value || !['--browser', '--out'].includes(flag)) throw new Error('usage: node scripts/lab.mjs [--browser PATH] [--out DIR]'); options[flag === '--browser' ? 'browserPath' : 'out'] = path.resolve(value); }
    console.log(JSON.stringify(await runLab(options), null, 2));
  } catch (error) { console.error(error.stack); process.exitCode = 1; }
}
