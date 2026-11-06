import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import './artifact/serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright');
const directory = path.dirname(fileURLToPath(import.meta.url));
const checks = [];
const errors = [];
let browser;
async function check(id, task) {
  try { const detail = await task(); checks.push({id,status:'PASS',evidence:detail}); }
  catch(error) { checks.push({id,status:'FAIL',evidence:String(error.stack ?? error)}); }
}
function expect(value, message) { if (!value) throw Error(message); }
try {
  browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true});
  const context = await browser.newContext({viewport:{width:1024,height:768}, deviceScaleFactor:1, permissions:['clipboard-read','clipboard-write']});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto('http://127.0.0.1:4171');
  await page.screenshot({path:path.join(directory,'desktop.png'),fullPage:true});
  await check('real-clipboard-keyboard', async()=>{
    await page.keyboard.press('Tab');
    expect(await page.locator('button').evaluate(el=>el===document.activeElement),'Tab focuses button');
    const focus = await page.locator('button').evaluate(el=>({outline:getComputedStyle(el).outlineWidth,style:getComputedStyle(el).outlineStyle}));
    expect(focus.outline==='3px' && focus.style==='solid','focus indicator');
    await page.screenshot({path:path.join(directory,'focus.png'),fullPage:true});
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('button').textContent==='Link copied');
    const copied = await page.evaluate(()=>navigator.clipboard.readText());
    expect(copied==='https://example.test/invite/team-river','actual clipboard content');
    expect(await page.locator('[role=status]').textContent()==='Link copied','live status text');
    const successStart = Date.now();
    await page.waitForFunction(()=>document.querySelector('button').textContent==='Copy invitation link');
    const resetMs = Date.now()-successStart;
    expect(resetMs>=1750 && resetMs<=2400,`reset duration ${resetMs}`);
    return {clipboard:copied,resetObservedMs:resetMs,focus};
  });
  await check('pending-duplicate-space',async()=>{
    await page.evaluate(async()=>{
      const {createInvitationCopy}=await import('./dist/copy-invitation.js');
      window.calls=0;
      const instance=createInvitationCopy({url:'https://example.test/invite/team-river',copy:()=>{window.calls++;return new Promise(resolve=>window.finish=resolve);}});
      document.querySelector('#example').replaceChildren(instance.element);
    });
    await page.locator('button').focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>document.querySelector('button').getAttribute('aria-busy')==='true');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.locator('button').evaluate(el=>{el.click();el.click();});
    expect(await page.evaluate(()=>window.calls)===1,'duplicate submission prevented');
    expect(await page.locator('button').evaluate(el=>el===document.activeElement),'focus retained');
    await page.evaluate(()=>window.finish());
    await page.waitForFunction(()=>document.querySelector('button').textContent==='Link copied');
    return {copyCalls:1,keyboard:'Space starts; repeated Enter, Space and programmatic clicks guarded',focusRetained:true};
  });
  await check('rejection-retry',async()=>{
    await page.evaluate(async()=>{
      const {createInvitationCopy}=await import('./dist/copy-invitation.js');
      window.attempts=0;
      document.querySelector('#example').replaceChildren(createInvitationCopy({url:'https://example.test/invite/team-river',copy:async()=>{if(++window.attempts===1)throw Error('permission rejected');}}).element);
    });
    await page.locator('button').click();
    await page.waitForFunction(()=>document.querySelector('.invitation-copy').dataset.state==='error');
    const error=await page.locator('[role=status]').textContent();
    expect(error.includes('try again')&&error.includes('https://example.test/invite/team-river'),'useful inline error');
    expect(await page.locator('button').getAttribute('aria-disabled')===null,'retry available');
    await page.setViewportSize({width:320,height:700});
    await page.screenshot({path:path.join(directory,'error-320.png'),fullPage:true});
    await page.locator('button').click();
    await page.waitForFunction(()=>document.querySelector('button').textContent==='Link copied');
    expect(await page.evaluate(()=>window.attempts)===2,'retry invoked');
    return {attempts:2,error};
  });
  await check('clipboard-unavailable',async()=>{
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));
    await page.evaluate(async()=>{
      const {createInvitationCopy}=await import('./dist/copy-invitation.js');
      document.querySelector('#example').replaceChildren(createInvitationCopy({url:'https://example.test/invite/team-river'}).element);
    });
    await page.locator('button').click();
    await page.waitForFunction(()=>document.querySelector('.invitation-copy').dataset.state==='error');
    return await page.locator('[role=status]').textContent();
  });
  await check('translated-320-target-reflow',async()=>{
    await page.evaluate(async()=>{
      const {createInvitationCopy}=await import('./dist/copy-invitation.js');
      document.querySelector('#example').replaceChildren(createInvitationCopy({url:'https://example.test/invite/team-river',label:'Einladungslink für das Projektteam kopieren'}).element);
    });
    await page.locator('button').focus();
    const dimensions=await page.locator('button').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,client:el.clientWidth,scroll:el.scrollWidth,label:el.textContent,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
    expect(dimensions.width>=44&&dimensions.height>=44,'44px target');
    expect(dimensions.scroll<=dimensions.client&&dimensions.pageWidth<=dimensions.viewport,'no clipping or horizontal overflow');
    await page.screenshot({path:path.join(directory,'german-320.png'),fullPage:true});
    return dimensions;
  });
  await check('status-semantics',async()=>{
    const attributes=await page.locator('[role=status]').evaluate(el=>({role:el.getAttribute('role'),live:el.getAttribute('aria-live'),atomic:el.getAttribute('aria-atomic')}));
    expect(attributes.live==='polite'&&attributes.atomic==='true','live region semantics');
    return attributes;
  });
  fs.writeFileSync(path.join(directory,'browser-evidence.json'),JSON.stringify({browser:await browser.version(),node:process.version,conditions:{headless:true,deviceScaleFactor:1,desktop:'1024x768',narrow:'320x700',font:'system-ui',network:'loopback, no throttling',mocked:'pending/rejected/unavailable tests only; first test actual clipboard'},checks,errors},null,2));
  console.log(JSON.stringify({checks,errors},null,2));
} catch(error) {
  fs.writeFileSync(path.join(directory,'test-fatal.txt'),String(error.stack??error));
  console.error(error);
  process.exitCode=1;
} finally { await browser?.close(); process.exit(process.exitCode??0); }