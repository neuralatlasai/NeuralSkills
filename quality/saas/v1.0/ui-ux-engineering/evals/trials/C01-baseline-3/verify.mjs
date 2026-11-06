import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { startServer } from './artifact/serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const started = new Date().toISOString();
const checks = [];
const errors = [];
let server;
let browser;
function assert(value, message) { if (!value) throw new Error(message); }
async function check(id, run) {
  try { const evidence = await run(); checks.push({ id, status: 'PASS', evidence }); }
  catch (error) { checks.push({ id, status: 'FAIL', evidence: error.stack }); }
}
try {
  server = await startServer(0);
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(origin);
  await page.screenshot({ path: new URL('./default.png', import.meta.url).pathname.slice(1), fullPage: true });
  await check('strict-build-and-render', async () => {
    assert(await page.locator('h1').textContent() === 'Invite your team', 'Heading missing');
    return { pageTitle: await page.title(), compile: 'TypeScript strict compilation completed before server started', screenshot: 'default.png' };
  });
  await check('keyboard-focus-and-target', async () => {
    await page.keyboard.press('Tab');
    const details = await page.locator('button').evaluate(b => ({ focused: document.activeElement === b, outline: getComputedStyle(b).outline, width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height }));
    assert(details.focused && details.outline.includes('3px'), JSON.stringify(details));
    assert(details.width >= 44 && details.height >= 44, JSON.stringify(details));
    await page.screenshot({ path: new URL('./focus.png', import.meta.url).pathname.slice(1), fullPage: true });
    return details;
  });
  await check('real-clipboard-keyboard-success-reset', async () => {
    const before = Date.now();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Link copied', exact: true }).waitFor();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert(copied === 'https://example.test/invite/team-river', copied);
    const status = await page.locator('[role=status]').textContent();
    await page.getByRole('button', { name: 'Copy invitation link', exact: true }).waitFor();
    const elapsed = Date.now() - before;
    assert(elapsed >= 1900 && elapsed < 3000, `Reset took ${elapsed}ms`);
    return { copied, resetElapsedMs: elapsed, status };
  });
  async function mockedPage(mode) {
    const p = await context.newPage();
    p.on('pageerror', error => errors.push(String(error)));
    await p.addInitScript(mode => {
      window.__copyCalls = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'unavailable' ? undefined : { writeText: text => {
        window.__copyCalls.push(text);
        if (mode === 'pending') return new Promise(resolve => { window.__resolveCopy = resolve; });
        if (mode === 'reject') return Promise.reject(new Error('Permission denied fixture'));
        return Promise.resolve();
      } } });
    }, mode);
    await p.goto(origin);
    return p;
  }
  await check('pending-prevents-duplicates', async () => {
    const p = await mockedPage('pending');
    await p.getByRole('button').click();
    await p.getByRole('button').evaluate(b => { b.click(); b.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const pending = await p.getByRole('button').evaluate(b => ({ disabled: b.disabled, busy: b.getAttribute('aria-busy'), label: b.textContent }));
    const calls = await p.evaluate(() => window.__copyCalls);
    assert(pending.disabled && pending.busy === 'true' && calls.length === 1, JSON.stringify({ pending, calls }));
    await p.evaluate(() => window.__resolveCopy());
    await p.getByRole('button', { name: 'Link copied', exact: true }).waitFor();
    assert(await p.getByRole('button').isEnabled(), 'Success left button disabled');
    await p.close();
    return { pending, calls };
  });
  for (const mode of ['reject', 'unavailable']) {
    await check(`clipboard-${mode}-retry`, async () => {
      const p = await mockedPage(mode);
      await p.getByRole('button').click();
      await p.locator('[data-state=error]').waitFor();
      const message = await p.getByRole('status').textContent();
      assert(await p.getByRole('button').isEnabled(), 'Retry disabled');
      assert(await p.locator('#manual-copy').isVisible(), 'Manual URL hidden');
      await p.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: text => { window.__copyCalls.push(text); return Promise.resolve(); } } }));
      await p.getByRole('button').focus();
      await p.keyboard.press('Space');
      await p.getByRole('button', { name: 'Link copied', exact: true }).waitFor();
      const calls = await p.evaluate(() => window.__copyCalls);
      await p.close();
      return { message, retryViaSpace: true, calls };
    });
  }
  await check('translation-320px-layout', async () => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.evaluate(async () => {
      const { attachInvitationCopy } = await import('/invitation-copy.js');
      document.querySelector('.invitation-copy').innerHTML = '<button id="translated" type="button"></button><p id="translated-status" class="status"></p><p id="translated-fallback" class="manual-copy" hidden>https://example.test/invite/team-river</p>';
      attachInvitationCopy(document.querySelector('#translated'), document.querySelector('#translated-status'), document.querySelector('#translated-fallback'), { url: 'https://example.test/invite/team-river', label: 'Einladungslink für das Projektteam kopieren' });
      document.querySelector('#translated').lang = 'de';
    });
    const dimensions = await page.locator('#translated').evaluate(b => ({ width: b.clientWidth, scrollWidth: b.scrollWidth, height: b.getBoundingClientRect().height, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, text: b.textContent, whiteSpace: getComputedStyle(b).whiteSpace }));
    assert(dimensions.pageWidth === 320 && dimensions.scrollWidth <= dimensions.width && dimensions.height >= 44, JSON.stringify(dimensions));
    await page.screenshot({ path: new URL('./german-320.png', import.meta.url).pathname.slice(1), fullPage: true });
    return { ...dimensions, screenshot: 'german-320.png' };
  });
  await check('accessible-status-and-browser-errors', async () => {
    const accessibility = await page.getByRole('status').evaluate(s => ({ role: s.getAttribute('role'), live: s.getAttribute('aria-live'), atomic: s.getAttribute('aria-atomic') }));
    assert(accessibility.live === 'polite' && accessibility.atomic === 'true', JSON.stringify(accessibility));
    assert(errors.length === 0, JSON.stringify(errors));
    return { accessibility, uncaughtPageErrors: errors };
  });
} catch (error) { errors.push(error.stack); }
finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  const report = { started, ended: new Date().toISOString(), checks, errors };
  await writeFile(new URL('./browser-evidence.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (errors.length || checks.some(c => c.status === 'FAIL')) process.exitCode = 1;
}
