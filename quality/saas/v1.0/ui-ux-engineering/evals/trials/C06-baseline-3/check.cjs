const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const root = path.join(__dirname, 'artifact/public');
const evidenceDir = path.join(__dirname, 'evidence');
const checks = [];
const errors = [];
let browser;
const server = http.createServer((req,res) => {
  const file = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(file, (error,data) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(data);
  });
});
function check(id, condition, evidence) {
  checks.push({ id, status: condition ? 'PASS' : 'FAIL', evidence, at: new Date().toISOString() });
  if (!condition) throw new Error(id + ': ' + JSON.stringify(evidence));
}
(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const page = await browser.newPage({viewport:{width:1100,height:900}, deviceScaleFactor:1});
    page.on('response', response => { if (response.status() >= 400) errors.push({type:'http',status:response.status(),url:response.url()}); });
    page.on('pageerror', error => errors.push({type:'pageerror', message:error.message}));
    page.on('console', message => { if (message.type()==='error') errors.push({type:'console',message:message.text()}); });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const input = page.getByLabel('What would you like to explore?');
    const status = page.locator('#status');
    const results = page.locator('#results');
    const submit = async query => { await input.fill(query); await input.press('Enter'); };
    check('initial', await page.getByText('Your next discovery starts here.').isVisible(), await status.textContent());
    await page.screenshot({path:path.join(evidenceDir,'desktop-initial.png'),fullPage:true});
    await submit('cedar');
    check('pending', await results.getAttribute('aria-busy') === 'true' && await page.getByText('Looking a little closer…').isVisible(), await status.textContent());
    check('pending-search-enabled', await page.getByRole('button',{name:'Search',exact:true}).isEnabled() && await input.isEnabled(), 'Input and Search enabled while cedar pending.');
    await page.screenshot({path:path.join(evidenceDir,'desktop-pending.png'),fullPage:true});
    await page.getByRole('heading',{name:'Cedar trails and their seasonal wildlife'}).waitFor();
    check('cedar', await page.locator('.guide').count() === 1, {status:await status.textContent(), cards:await page.locator('.guide').allTextContents()});
    check('focus-after-enter', await input.evaluate(el=>document.activeElement===el), 'Input retains focus after Enter and result arrival.');
    await submit('moss');
    await page.getByRole('heading',{name:'Pocket guide to urban moss'}).waitFor();
    check('moss', await page.locator('.guide').count()===2, {status:await status.textContent(), cards:await page.locator('.guide').allTextContents()});
    await page.screenshot({path:path.join(evidenceDir,'desktop-moss.png'),fullPage:true});
    await submit('empty');
    await page.getByText('No guides found this time.').waitFor();
    check('empty', await page.locator('.guide').count()===0 && (await status.textContent()).includes('0 guides'), await results.textContent());
    await submit('fail');
    const retry = page.getByRole('button',{name:'Retry search for fail'});
    await retry.waitFor();
    check('failure', (await status.textContent()).includes('“fail” failed') && await retry.isVisible(), await results.textContent());
    await page.screenshot({path:path.join(evidenceDir,'desktop-failure.png'),fullPage:true});
    await input.fill('edited but not submitted');
    await input.press('Tab');
    await page.keyboard.press('Tab');
    check('retry-keyboard-reachable', await retry.evaluate(el=>el===document.activeElement), 'Tab from input to Search, then Retry.');
    await page.keyboard.press('Enter');
    check('retry-same-query', (await status.textContent()).includes('Searching for “fail”') && await input.inputValue()==='fail', {status:await status.textContent(),input:await input.inputValue()});
    check('retry-focus', await input.evaluate(el=>document.activeElement===el), 'Retry moves focus to search input before removing itself.');
    await retry.waitFor();
    check('retry-new-attempt', (await status.textContent()).includes('“fail” failed'), 'Retry showed pending and subsequently failed again through real fixture.');
    const cedarStart=Date.now(); await submit('cedar'); await page.waitForTimeout(100); await submit('moss');
    await page.getByRole('heading',{name:'Pocket guide to urban moss'}).waitFor();
    await page.waitForTimeout(Math.max(0,1450-(Date.now()-cedarStart)));
    check('stale-success', (await status.textContent()).includes('2 guides found for “moss”') && await page.locator('.guide').count()===2 && await page.getByRole('heading',{name:'Cedar trails and their seasonal wildlife'}).count()===0, {elapsedMs:Date.now()-cedarStart,status:await status.textContent()});
    const failStart=Date.now(); await submit('fail'); await page.waitForTimeout(100); await submit('moss');
    await page.getByRole('heading',{name:'Pocket guide to urban moss'}).waitFor();
    await page.waitForTimeout(Math.max(0,900-(Date.now()-failStart)));
    check('stale-failure', (await status.textContent()).includes('2 guides found for “moss”') && await retry.count()===0 && await page.locator('.guide').count()===2, {elapsedMs:Date.now()-failStart,status:await status.textContent()});
    await page.setViewportSize({width:320,height:800});
    await page.screenshot({path:path.join(evidenceDir,'mobile-moss.png'),fullPage:true});
    const layout = await page.evaluate(()=>({viewport:innerWidth,body:document.body.scrollWidth,document:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.guide')].map(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})),input:document.querySelector('#query').getBoundingClientRect().toJSON()}));
    check('mobile-320', layout.body<=320 && layout.document<=320 && layout.cards.every(card=>card.left>=0 && card.right<=320), layout);
    await submit('fail'); await retry.waitFor();
    await page.screenshot({path:path.join(evidenceDir,'mobile-failure.png'),fullPage:true});
    check('mobile-failure-320', await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'Failure and Retry stay within 320px viewport.');
    const a11y=await page.evaluate(()=>({label:document.querySelector('label').htmlFor,inputId:document.querySelector('input').id,role:document.querySelector('#status').getAttribute('role'),live:document.querySelector('#status').getAttribute('aria-live'),atomic:document.querySelector('#status').getAttribute('aria-atomic'),busy:document.querySelector('#results').getAttribute('aria-busy')}));
    check('accessible-markup', a11y.label===a11y.inputId && a11y.role==='status' && a11y.live==='polite' && a11y.atomic==='true' && a11y.busy==='false', a11y);
    const source=fs.readFileSync(path.join(__dirname,'../../fixtures/C06/fake-api.ts'));
    const copy=fs.readFileSync(path.join(__dirname,'artifact/src/fake-api.ts'));
    check('fixture-unchanged', source.equals(copy), {sha256:crypto.createHash('sha256').update(copy).digest('hex')});
    await input.fill('moss');
    await page.getByRole('button',{name:'Search',exact:true}).click();
    await page.getByRole('heading',{name:'Pocket guide to urban moss'}).waitFor();
    check('search-button', (await status.textContent()).includes('2 guides found'), 'Search button submitted moss and displayed two cards.');
    await page.emulateMedia({reducedMotion:'reduce'});
    await submit('cedar');
    check('reduced-motion', await page.locator('.spinner').evaluate(el=>getComputedStyle(el).animationName)==='none', 'Spinner animation disabled with prefers-reduced-motion: reduce.');
    await page.getByRole('heading',{name:'Cedar trails and their seasonal wildlife'}).waitFor();
    check('browser-runtime', errors.length===0, {errors});
  } catch(error) {
    errors.push({type:'runner',message:error.message,stack:error.stack});
    process.exitCode=1;
  } finally {
    fs.writeFileSync(path.join(evidenceDir,'browser-checks.json'),JSON.stringify({checks,errors,finishedAt:new Date().toISOString()},null,2));
    if(browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
    console.log(JSON.stringify({checks,errors},null,2));
  }
})();
