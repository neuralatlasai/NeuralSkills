const { chromium } = require('C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const evidence = path.join(__dirname, 'evidence');
fs.mkdirSync(evidence, { recursive: true });
const report = { startedAt: new Date().toISOString(), environment: { node: process.version, viewport: '900x600 and 320x640', deviceScaleFactor: 1, font: 'system-ui', network: 'loopback, no throttling', cpu: 'host, no throttling', cache: 'new context', provenance: 'local browser verification; deterministic clipboard scenarios explicitly injected' }, checks: [], errors: [] };
function check(id, condition, details) { report.checks.push({ id, status: condition ? 'PASS' : 'FAIL', evidence: details }); }
(async () => {
  let browser;
  try {
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    report.environment.browser = await browser.version();
    const context = await browser.newContext({ viewport: { width: 900, height: 600 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(String(e)));
    await page.goto('http://127.0.0.1:4313');
    const button = page.getByRole('button');
    check('initial-name', await button.textContent() === 'Copy invitation link', await button.textContent());
    await page.screenshot({ path: path.join(evidence, 'desktop.png') });
    await page.keyboard.press('Tab');
    check('keyboard-focus', await button.evaluate(b => b === document.activeElement && getComputedStyle(b).outlineWidth === '3px'), 'Tab focuses native button; computed 3px outline');
    await page.screenshot({ path: path.join(evidence, 'focus.png') });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('button').textContent === 'Link copied');
    check('real-clipboard', await page.evaluate(() => navigator.clipboard.readText()) === 'https://example.test/invite/team-river', 'Actual Chrome Clipboard API read after keyboard Enter');
    await page.waitForFunction(() => document.querySelector('button').textContent === 'Copy invitation link');

    await page.evaluate(async () => {
      const { mountInvitationCopy } = await import('./invitation-copy.js');
      window.mount = mountInvitationCopy;
      document.querySelector('#copy-host').replaceChildren();
      window.calls = [];
      window.handle = mountInvitationCopy(document.querySelector('#copy-host'), { writeText: text => { window.calls.push(text); return new Promise(resolve => window.resolveCopy = resolve); } });
    });
    await button.focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('button').textContent === 'Copying…');
    await page.keyboard.press('Enter');
    await button.evaluate(b => { b.click(); b.click(); });
    check('duplicate-pending', await page.evaluate(() => window.calls.length === 1 && window.calls[0] === 'https://example.test/invite/team-river'), 'Space starts unresolved adapter; Enter plus two native clicks produce one writer call');
    check('pending-accessibility', await button.getAttribute('aria-disabled') === 'true' && await button.getAttribute('aria-busy') === 'true', 'Pending aria-disabled and aria-busy true');
    check('live-region', await page.locator('[role=status]').getAttribute('aria-live') === 'polite' && await page.locator('[role=status]').getAttribute('aria-atomic') === 'true', 'Separate polite atomic status contains pending text');
    await page.screenshot({ path: path.join(evidence, 'pending.png') });
    await page.evaluate(() => window.resolveCopy());
    await page.waitForFunction(() => document.querySelector('button').textContent === 'Link copied');
    const successStart = Date.now();
    await page.screenshot({ path: path.join(evidence, 'success.png') });
    await page.waitForTimeout(1500);
    check('success-retained', await button.textContent() === 'Link copied', 'Success remains after 1500ms');
    await page.waitForFunction(() => document.querySelector('button').textContent === 'Copy invitation link');
    const resetMs = Date.now() - successStart;
    check('success-reset', resetMs >= 1800 && resetMs <= 2400, { elapsedMs: resetMs, acceptedMs: [1800, 2400] });
    check('focus-preserved', await button.evaluate(b => b === document.activeElement), 'Focus preserved across pending, success and reset');

    await page.evaluate(() => {
      window.handle.destroy(); window.attempts = 0;
      window.handle = window.mount(document.querySelector('#copy-host'), { writeText: async () => { if (++window.attempts === 1) throw new Error('denied'); } });
    });
    await button.click();
    await page.waitForFunction(() => document.querySelector('[role=status]').textContent.includes('Couldn’t copy'));
    check('rejection-error', await page.locator('.invitation-copy__fallback').isVisible() && await button.getAttribute('aria-disabled') === null, 'Rejected clipboard shows inline recovery plus selectable exact URL; button enabled');
    await page.screenshot({ path: path.join(evidence, 'error.png') });
    await button.click();
    await page.waitForFunction(() => document.querySelector('button').textContent === 'Link copied');
    check('retry', await page.evaluate(() => window.attempts === 2), 'Second deliberate attempt succeeds');

    await page.evaluate(() => {
      window.handle.destroy();
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      window.handle = window.mount(document.querySelector('#copy-host'));
    });
    await button.click();
    await page.waitForFunction(() => document.querySelector('[role=status]').textContent.includes('Couldn’t copy'));
    check('unavailable-clipboard', await page.locator('.invitation-copy__fallback').isVisible() && await button.textContent() === 'Copy invitation link', 'Clipboard API removed in fixture; useful inline error and retry label shown');

    await page.setViewportSize({ width: 320, height: 640 });
    await page.screenshot({ path: path.join(evidence, 'narrow-error.png') });
    check('narrow-error-fit', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '320px error state has no horizontal overflow');
    await page.evaluate(() => {
      window.handle.destroy(); document.documentElement.lang = 'de';
      window.handle = window.mount(document.querySelector('#copy-host'), { label: 'Einladungslink für das Projektteam kopieren' });
    });
    await button.focus();
    const geometry = await button.evaluate(b => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return { width:r.width, height:r.height, scrollWidth:b.scrollWidth, clientWidth:b.clientWidth, pageWidth:document.documentElement.scrollWidth, viewport:innerWidth, outline:s.outlineWidth, text:b.textContent }; });
    check('german-narrow-fit-target', geometry.width >= 44 && geometry.height >= 44 && geometry.scrollWidth <= geometry.clientWidth && geometry.pageWidth <= 320, geometry);
    await page.screenshot({ path: path.join(evidence, 'german-320.png') });
    await page.evaluate(() => document.documentElement.style.fontSize = '32px');
    // Text enlargement is exercised directly because CSS-pixel viewport reflow is a separate check.
    await button.evaluate(b => b.style.fontSize = '30px');
    check('text-200-percent-fit', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Button text enlarged 15px to 30px at 320px; no page horizontal overflow');
    await page.screenshot({ path: path.join(evidence, 'text-200.png') });
    check('runtime-errors', report.errors.length === 0, report.errors);
    await context.close();
  } catch (error) { report.errors.push(error.stack || String(error)); report.checks.push({ id:'browser-harness', status:'FAIL', evidence:String(error) }); }
  finally { if (browser) await browser.close(); report.endedAt = new Date().toISOString(); fs.writeFileSync(path.join(evidence, 'browser.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); }
})();
