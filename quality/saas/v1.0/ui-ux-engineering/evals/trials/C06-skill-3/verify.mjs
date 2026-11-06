import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './artifact/serve.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const root=path.dirname(fileURLToPath(import.meta.url));
const checks=[];const errors=[];const snapshots=[];
const record=(id,condition,evidence)=>{checks.push({id,status:condition?'PASS':'FAIL',evidence});if(!condition)console.error(id,evidence);};
const {server,url}=await startServer();let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1024,height:768},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{window.__fixtureTimers=[];const original=window.setTimeout;window.setTimeout=function(fn,delay,...args){if([180,300,650,1200].includes(delay))window.__fixtureTimers.push({delay,at:performance.now()});return original(fn,delay,...args);};});
 await page.goto(url);const input=page.getByLabel('What would you like to explore?');const search=page.getByRole('button',{name:'Search',exact:true});const status=page.getByRole('status');
 record('initial',await status.textContent()==='Search for a topic to discover a guide.','Initial status prompt visible; no cards.');
 await page.keyboard.press('Tab');record('keyboard-input',await input.evaluate(e=>e===document.activeElement),'First Tab focuses labeled search input.');
 await input.fill('cedar');await input.press('Enter');record('pending',/Searching for “cedar”/.test(await status.textContent())&&await search.isEnabled()&&await page.locator('#results').getAttribute('aria-busy')==='true','Enter submits; pending feedback and busy results; Search stays enabled.');
 await page.screenshot({path:path.join(root,'pending.png')});await page.waitForTimeout(1300);
 record('cedar',await page.locator('.guide').count()===1&&/Cedar trails/.test(await page.locator('.guide').innerText()),'Cedar resolves to one expected card.');
 record('focus-preservation',await input.evaluate(e=>e===document.activeElement),'Input retains focus across pending and result render.');
 const submit=async(q)=>{await input.fill(q);await search.click();};
 await submit('moss');await page.waitForTimeout(300);record('moss',await page.locator('.guide').count()===2,'Moss resolves to two cards including long title.');await page.screenshot({path:path.join(root,'desktop-moss.png')});
 await submit('empty');await page.waitForTimeout(400);record('empty',await page.locator('.guide').count()===0&&/No guides found.*broader topic/.test(await status.textContent()),'Empty clears cards and suggests a broader topic.');
 await submit('fail');await page.waitForTimeout(750);const retry=page.getByRole('button',{name:'Retry search for fail'});record('failure',await retry.isVisible()&&/temporarily unavailable/.test(await status.textContent()),'Failure message and query-specific Retry appear.');await page.screenshot({path:path.join(root,'failure.png')});
 await input.fill('cedar');const before=await page.evaluate(()=>window.__fixtureTimers.length);await retry.click();
 record('retry-pending',/Searching for “fail”/.test(await status.textContent())&&await retry.getAttribute('aria-disabled')==='true','Retry resubmits failed fail query despite edited input cedar; visible pending state.');
 await retry.dispatchEvent('click');record('retry-duplicate',await page.evaluate(()=>window.__fixtureTimers.length)===before+1,'A repeated retry activation while pending adds no second fixture call.');
 record('retry-focus-pending',await retry.evaluate(e=>e===document.activeElement),'Retry remains focused and mounted while pending.');await page.waitForTimeout(750);
 record('retry-failure',await retry.isVisible()&&await retry.getAttribute('aria-disabled')==='false'&&await input.inputValue()==='cedar','Retry fails again as fixture specifies, is reenabled, and edited input is preserved.');record('retry-focus-outcome',await retry.evaluate(e=>e===document.activeElement),'Retry retains focus after the failed outcome.');
 for(const first of ['cedar','fail']){
  await submit(first);await page.waitForTimeout(100);await submit('moss');await page.waitForTimeout(first==='cedar'?1450:900);
  const snapshot={scenario:`${first}-then-moss`,heading:await page.locator('h2').textContent(),status:await status.textContent(),cards:await page.locator('.guide h3').allTextContents(),busy:await page.locator('#results').getAttribute('aria-busy'),retry:await retry.isVisible()};snapshots.push(snapshot);
  record(`race-${first}`,snapshot.heading==='Guides for “moss”'&&snapshot.cards.length===2&&snapshot.status==='Found 2 guides for “moss”.'&&snapshot.busy==='false'&&!snapshot.retry,JSON.stringify(snapshot));
 }
 await input.fill('unsubmitted draft');await search.focus();await page.keyboard.press('Tab');record('keyboard-order',await page.evaluate(()=>document.activeElement?.tagName)==='BODY','After Search, no result card or hidden Retry enters tab order.');
 for(const width of [320,640]){await page.setViewportSize({width,height:800});const metrics=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,input:document.querySelector('input').getBoundingClientRect().width,button:document.querySelector('button').getBoundingClientRect().height}));record(`reflow-${width}`,metrics.scroll<=width&&metrics.input>0&&metrics.button>=44,JSON.stringify(metrics));await page.screenshot({path:path.join(root,`moss-${width}.png`),fullPage:true});}
 await page.setViewportSize({width:320,height:600});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});record('text-resize',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px viewport with root font-size 200% has no page overflow; this is text-resize, not a browser zoom/AT test.');
 const semantics=await page.evaluate(()=>({label:document.querySelector('label').htmlFor,input:document.querySelector('input').id,live:document.querySelector('#status').getAttribute('aria-live'),atomic:document.querySelector('#status').getAttribute('aria-atomic'),lang:document.documentElement.lang,focusRule:[...document.styleSheets[0].cssRules].some(r=>r.cssText.includes(':focus-visible'))}));record('semantics',semantics.label===semantics.input&&semantics.live==='polite'&&semantics.atomic==='true'&&semantics.lang==='en'&&semantics.focusRule,JSON.stringify(semantics));
 const sha=b=>createHash('sha256').update(b).digest('hex');const source=await readFile(path.resolve(root,'../../fixtures/C06/fake-api.ts'));const copied=await readFile(path.join(root,'artifact/src/fake-api.ts'));record('fixture-unchanged',sha(source)===sha(copied),`SHA256 ${sha(copied)}`);
 record('browser-errors',errors.length===0,JSON.stringify(errors));
 const raw={recordedAt:new Date().toISOString(),browser:await browser.version(),node:process.version,url,viewport:'1024x768, 640x800, 320x800; deviceScaleFactor 1',network:'loopback only; deterministic fixture, no throttling',checks,errors,snapshots,timers:await page.evaluate(()=>window.__fixtureTimers)};
 await writeFile(path.join(root,'browser-evidence.json'),JSON.stringify(raw,null,2));console.log(JSON.stringify({checks:checks.length,failed:checks.filter(x=>x.status==='FAIL'),browser:raw.browser},null,2));
}catch(error){errors.push(String(error.stack||error));await writeFile(path.join(root,'browser-failure.json'),JSON.stringify({checks,errors},null,2));console.error(error);process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
