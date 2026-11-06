import { chromium } from 'file:///C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const checks=[]; const errors=[]; let browser;
const assert=(condition,message)=>{if(!condition) throw new Error(message)};
const check=async(id,fn)=>{try {const detail=await fn();checks.push({id,status:'PASS',evidence:detail})}catch(e){checks.push({id,status:'FAIL',evidence:String(e.stack||e)})}};
const server=spawn(process.execPath,[join(root,'artifact','serve.mjs')],{stdio:['ignore','pipe','pipe'],windowsHide:true});
server.stdout.on('data',d=>console.log(String(d).trim()));server.stderr.on('data',d=>errors.push(String(d)));
try{
 for(let i=0;i<50;i++){try{const r=await fetch('http://127.0.0.1:4175');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:800,height:650},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4175');
 await check('real-clipboard-and-timer',async()=>{await page.getByRole('button').click();await page.getByRole('button',{name:'Link copied',exact:true}).waitFor();assert(await page.evaluate(()=>navigator.clipboard.readText())==='https://example.test/invite/team-river','Wrong clipboard content');await page.screenshot({path:join(root,'evidence','success.png')});await page.waitForTimeout(1100);assert(await page.getByRole('button').textContent()==='Link copied','Success label restored too early');await page.getByRole('button',{name:'Copy invitation link',exact:true}).waitFor({timeout:2000});return 'Real Chrome clipboard matched URL; success visible after 1.1s; original label returned within 3.1s.'});
 const mock=await context.newPage();mock.on('pageerror',e=>errors.push(String(e)));
 await mock.addInitScript(()=>{window.copyCalls=0;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>{window.copyCalls++;return new Promise(resolve=>window.finishCopy=resolve)}}})});
 await mock.goto('http://127.0.0.1:4175');
 await check('keyboard-and-pending',async()=>{await mock.keyboard.press('Tab');await mock.keyboard.press('Enter');await mock.evaluate(()=>{document.querySelector('button').click();document.querySelector('button').click()});assert(await mock.evaluate(()=>window.copyCalls)===1,'Duplicate submissions');assert(await mock.getByRole('button').getAttribute('aria-disabled')==='true','Missing pending semantics');assert(await mock.getByRole('button').getAttribute('aria-busy')==='true','Missing busy semantics');assert(await mock.evaluate(()=>document.activeElement.tagName)==='BUTTON','Focus moved');await mock.evaluate(()=>window.finishCopy());await mock.getByRole('button',{name:'Link copied',exact:true}).waitFor();return 'Tab + Enter triggered one request; repeated clicks ignored while pending; aria-disabled/aria-busy set and focus preserved.'});
 await check('rejection-and-retry',async()=>{await mock.evaluate(()=>navigator.clipboard.writeText=async()=>{throw new Error('Denied')});await mock.getByRole('button').click();assert((await mock.getByRole('status').textContent()).includes('Check clipboard permissions'),'Missing useful error');assert(await mock.getByRole('textbox').isVisible(),'Missing manual field');assert(await mock.getByRole('textbox').inputValue()==='https://example.test/invite/team-river','Wrong fallback URL');await mock.screenshot({path:join(root,'evidence','error.png')});await mock.evaluate(()=>navigator.clipboard.writeText=async()=>{});await mock.getByRole('button').focus();await mock.keyboard.press('Space');await mock.getByRole('button',{name:'Link copied',exact:true}).waitFor();return 'Rejected clipboard showed inline permission guidance and manual URL; keyboard Space retry succeeded.'});
 const small=await context.newPage();await small.setViewportSize({width:320,height:640});small.on('pageerror',e=>errors.push(String(e)));
 await small.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));
 await small.goto('http://127.0.0.1:4175/?lang=de');
 await check('small-viewport-long-label-focus',async()=>{await small.keyboard.press('Tab');const metrics=await small.getByRole('button').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {width:r.width,height:r.height,scroll:el.scrollWidth,client:el.clientWidth,outline:s.outlineStyle,outlineWidth:s.outlineWidth,overflow:document.documentElement.scrollWidth>innerWidth,text:el.textContent,live:document.querySelector('[role=status]').getAttribute('aria-live')}});assert(metrics.width>=44&&metrics.height>=44,'Target too small');assert(!metrics.overflow&&metrics.scroll<=metrics.client,'Clipping or horizontal overflow');assert(metrics.outline==='solid'&&metrics.outlineWidth==='3px','Focus outline missing');assert(metrics.text==='Einladungslink für das Projektteam kopieren','Translated label mismatch');assert(metrics.live==='polite','Missing live region');await small.screenshot({path:join(root,'evidence','german-320-focus.png')});return JSON.stringify(metrics)});
 await check('unavailable-clipboard',async()=>{await small.keyboard.press('Enter');assert((await small.getByRole('status').textContent()).includes('unavailable'),'Missing unavailable error');assert(await small.getByRole('textbox').isVisible(),'Missing manual fallback');assert(await small.getByRole('button').getAttribute('aria-disabled')===null,'Retry blocked');await small.screenshot({path:join(root,'evidence','unavailable-320.png')});return 'Unavailable API produced inline browser guidance and manual-copy field; retry button remained enabled.'});
 await context.close();
}catch(e){errors.push(String(e.stack||e))}finally{if(browser)await browser.close();server.kill();await writeFile(join(root,'evidence','browser-checks.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));if(errors.length||checks.some(c=>c.status==='FAIL'))process.exitCode=1}


