const { chromium } = require('C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const evidence = path.join(__dirname, 'evidence');
const findings = [];
const check = (id, details) => { findings.push({ id, status: 'PASS', evidence: details }); console.log(id, JSON.stringify(details)); };
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(() => {
      window.copyCalls = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText(value) { window.copyCalls.push(value); return new Promise((resolve, reject) => { window.resolveCopy = resolve; window.rejectCopy = reject; }); }
      } });
    });
    const url = pathToFileURL(path.join(__dirname, 'artifact/index.html')).href;
    await page.goto(url);
    await page.screenshot({ path: path.join(evidence, 'default.png') });
    const button = page.getByRole('button', { name: 'Copy invitation link' });
    await page.keyboard.press('Tab');
    assert.equal(await button.evaluate(el => el === document.activeElement), true);
    const focus = await button.evaluate(el => ({ outline: getComputedStyle(el).outline, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
    assert.match(focus.outline, /3px/);
    assert.ok(focus.width >= 44 && focus.height >= 44);
    await page.screenshot({ path: path.join(evidence, 'keyboard-focus.png') });
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('button').disabled);
    await page.locator('button').dispatchEvent('click');
    const pending = await page.evaluate(() => ({ calls: window.copyCalls, disabled: document.querySelector('button').disabled, busy: document.querySelector('button').getAttribute('aria-busy'), status: document.querySelector('[role=status]').textContent }));
    assert.deepEqual(pending.calls, ['https://example.test/invite/team-river']);
    assert.equal(pending.busy, 'true');
    check('keyboard-target-pending', { focus, pending });
    const successStart = Date.now();
    await page.evaluate(() => window.resolveCopy());
    await page.getByRole('button', { name: 'Link copied', exact: true }).waitFor();
    assert.equal(await page.locator('[role=status]').textContent(), 'Link copied');
    await page.screenshot({ path: path.join(evidence, 'success.png') });
    await page.getByRole('button', { name: 'Copy invitation link', exact: true }).waitFor();
    const resetMs = Date.now() - successStart;
    assert.ok(resetMs >= 1900 && resetMs < 3500);
    check('success-reset', { resetMs, statusRole: 'status', copied: pending.calls[0] });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.copyCalls.length === 2);
    await page.evaluate(() => window.rejectCopy(new Error('denied')));
    await page.getByRole('alert').filter({ hasText: 'Couldn’t copy' }).waitFor();
    assert.equal(await page.locator('button').isEnabled(), true);
    await page.screenshot({ path: path.join(evidence, 'rejected.png') });
    await page.locator('button').click();
    await page.waitForFunction(() => window.copyCalls.length === 3);
    await page.evaluate(() => window.resolveCopy());
    check('reject-retry-enter', { callsAfterRetry: 3, errorCleared: await page.locator('[role=alert]').textContent() });
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      const element = document.createElement('invitation-copy');
      element.setAttribute('label', 'Einladungslink für das Projektteam kopieren');
      element.setAttribute('lang', 'de');
      document.querySelector('invitation-copy').replaceWith(element);
    });
    await page.setViewportSize({ width: 320, height: 568 });
    const german = page.getByRole('button', { name: 'Einladungslink für das Projektteam kopieren' });
    await german.focus();
    const layout = await german.evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(layout.height >= 44 && layout.width >= 44);
    assert.ok(layout.pageWidth <= 320 && layout.scrollWidth <= layout.clientWidth && layout.scrollHeight <= layout.clientHeight);
    await page.screenshot({ path: path.join(evidence, 'german-320.png') });
    await german.click();
    await page.getByRole('alert').filter({ hasText: 'Couldn’t copy' }).waitFor();
    assert.equal(await german.isEnabled(), true);
    await page.screenshot({ path: path.join(evidence, 'unavailable-320.png') });
    check('unavailable-and-translation', layout);
    assert.deepEqual(errors, []);
    check('browser-errors', errors);
    const real = await browser.newPage();
    await real.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await real.goto(url);
    await real.getByRole('button').click();
    await real.waitForTimeout(200);
    const native = await real.evaluate(async () => ({ label: document.querySelector('button').textContent, error: document.querySelector('[role=alert]').textContent, clipboard: await navigator.clipboard.readText().catch(error => String(error)) }));
    if (native.label === 'Link copied' && native.clipboard === 'https://example.test/invite/team-river') check('native-clipboard', native);
    else { findings.push({ id: 'native-clipboard', status: 'UNVERIFIED', evidence: native }); console.log('native-clipboard', JSON.stringify(native)); }
  } catch (error) {
    findings.push({ id: 'execution', status: 'FAIL', evidence: String(error.stack || error) });
    console.error(error);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(evidence, 'browser-observations.json'), JSON.stringify(findings, null, 2));
    await browser.close();
  }
})();
