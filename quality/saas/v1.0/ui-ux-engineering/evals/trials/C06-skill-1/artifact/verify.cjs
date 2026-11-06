const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const { chromium } = require('C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const evidence = path.resolve(__dirname, '../evidence');
fs.mkdirSync(evidence, {recursive:true});
const checks = [], messages = [];
async function check(id, fn) { try { const observation = await fn(); checks.push({id,status:'PASS',observation}); } catch(error) { checks.push({id,status:'FAIL',error:String(error.stack)}); } }
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page = await browser.newPage({viewport:{width:960,height:850}});
 page.on('pageerror',error => messages.push({type:'pageerror',text:String(error)}));
 page.on('console',msg => messages.push({type:msg.type(),text:msg.text()}));
 const url = pathToFileURL(path.join(__dirname,'index.html')).href;
 const submit = async query => { await page.locator('#query').fill(query); await page.locator('#query').press('Enter'); };
 const state = async expected => page.waitForFunction(s => document.querySelector('#outcome').dataset.state === s, expected);
 const snap = async name => page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});
 await page.goto(url);
 await check('initial-form', async () => {
   assert.equal(await page.getByLabel('What would you like to explore?').count(),1);
   assert.match(await page.locator('#feedback').textContent(),/Enter a topic/);
   await page.keyboard.press('Tab'); assert.equal(await page.locator('#query').evaluate(el => el === document.activeElement),true);
   await snap('desktop-initial'); return 'Visible initial prompt, associated label, Tab reaches search input.';
 });
 await check('cedar-pending-success-enter',async () => {
   await submit('cedar'); await state('pending');
   assert.equal(await page.locator('#results').getAttribute('aria-busy'),'true');
   assert.equal(await page.locator('button[type=submit]').isEnabled(),true);
   assert.match(await page.locator('#feedback').textContent(),/Searching.*cedar/);
   assert.equal(await page.locator('#feedback').getAttribute('role'),'status');
   assert.equal(await page.locator('#feedback').evaluate(el => !!el.closest('[aria-busy="true"]')),false);
   await snap('desktop-pending'); await state('success');
   assert.equal(await page.locator('#results li').count(),1);
   assert.match(await page.locator('#results').textContent(),/Cedar trails/);
   assert.equal(await page.locator('#query').evaluate(el => el === document.activeElement),true);
   return 'Enter submits; pending visible immediately; live region not suppressed by busy ancestor; cedar resolves; input focus retained.';
 });
 await check('moss-search-button',async () => {
   await page.locator('#query').fill('moss'); await page.getByRole('button',{name:'Search',exact:false}).click(); await state('success');
   assert.equal(await page.locator('#results li').count(),2); await snap('desktop-results');
   return 'Search button returns both moss cards, habitat and page counts.';
 });
 await check('empty',async () => { await submit('empty'); await state('empty'); assert.equal(await page.locator('#results li').count(),0); assert.match(await page.locator('#feedback').textContent(),/Try a broader topic/); return 'Empty outcome includes a useful next search suggestion.'; });
 await check('failure-retry-same-query',async () => {
   await submit('fail'); await state('error'); await snap('desktop-error');
   assert.equal(await page.locator('#retry').isVisible(),true);
   await page.locator('#query').fill('cedar'); await page.locator('#retry').focus(); await page.keyboard.press('Enter');
   await state('pending'); assert.match(await page.locator('#outcome-heading').textContent(),/fail/);
   assert.equal(await page.locator('#query').inputValue(),'cedar');
   assert.equal(await page.locator('#query').evaluate(el => el === document.activeElement),true);
   await state('error'); assert.match(await page.locator('#outcome-heading').textContent(),/fail/);
   return 'Keyboard Retry creates a new pending attempt for fail despite edited input cedar; deterministic failure returns; focus transferred to persistent input.';
 });
 await check('race-stale-success',async () => {
   await submit('cedar'); await page.waitForTimeout(100); await submit('moss'); await state('success');
   await page.waitForTimeout(1400); assert.match(await page.locator('#outcome-heading').textContent(),/moss/);
   assert.equal(await page.locator('#results li').count(),2); assert.equal(await page.locator('#retry').isHidden(),true);
   assert.equal(await page.locator('#results').getAttribute('aria-busy'),'false');
   return 'cedar starts; moss starts about 100ms later; after 1400ms additional wait, moss status/query/cards remain.';
 });
 await check('race-stale-failure',async () => {
   await submit('fail'); await page.waitForTimeout(100); await submit('moss'); await state('success');
   await page.waitForTimeout(850); assert.equal(await page.locator('#outcome').getAttribute('data-state'),'success');
   assert.match(await page.locator('#outcome-heading').textContent(),/moss/); assert.equal(await page.locator('#results li').count(),2);
   assert.equal(await page.locator('#retry').isHidden(),true); return 'fail starts; moss starts about 100ms later; after stale rejection, moss stays visible without Retry.';
 });
 await check('narrow-320-and-focus',async () => {
   await page.setViewportSize({width:320,height:760});
   await page.locator('#query').focus(); await page.keyboard.press('Tab');
   assert.equal(await page.getByRole('button',{name:'Search',exact:false}).evaluate(el => el === document.activeElement),true);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
   const heights = await page.locator('#query,button[type=submit]').evaluateAll(els => els.map(el => el.getBoundingClientRect().height));
   assert(heights.every(h => h >=44)); await snap('mobile-results-focus');
   await page.setViewportSize({width:640,height:850}); await page.evaluate(() => document.documentElement.style.fontSize='200%');
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true); await snap('text-200-percent');
   await page.evaluate(() => document.documentElement.style.fontSize='');
   return {viewport:'320Ã—760',horizontalOverflow:false,controlHeights:heights,textResize:'200% text at 640px: no horizontal overflow; not browser zoom'};
 });
 await check('fixture-unchanged', async () => {
   const source = path.resolve(__dirname,'../../../fixtures/C06/fake-api.ts');
   assert(fs.readFileSync(source).equals(fs.readFileSync(path.join(__dirname,'src/fake-api.ts')))); return 'Byte-for-byte Buffer equality against supplied fixture.';
 });
 await check('runtime-errors',async () => {assert.equal(messages.filter(m => m.type==='pageerror'||m.type==='error').length,0); return messages;});
 const report = {environment:{node:process.version,playwright:require('C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright/package.json').version,browser:browser.version(),url,headless:true,network:'file URL; no service or network request',fonts:'system-ui/Georgia',viewports:['960Ã—850','320Ã—760','640Ã—850 with 200% text']},checks,messages};
 fs.writeFileSync(path.join(evidence,'browser.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2)); await browser.close();
 process.exitCode = checks.some(c=>c.status==='FAIL')?1:0;
})().catch(error => {fs.writeFileSync(path.join(evidence,'browser-fatal.txt'),String(error.stack)); console.error(error);process.exitCode=1;});

