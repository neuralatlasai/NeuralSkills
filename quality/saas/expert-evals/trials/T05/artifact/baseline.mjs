import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
const root=process.cwd();
const server=spawn(process.execPath,['../../../serve-fixture.mjs',root,'0'],{cwd:root,stdio:['ignore','pipe','pipe']});
const url=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(String(d).trim()));server.on('exit',c=>reject(Error('server '+c)));});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {const page=await browser.newPage({viewport:{width:320,height:480}});await page.goto(url);await page.locator('#open').click();await page.keyboard.press('Tab');const evidence=await page.evaluate(()=>({focus:document.activeElement?.id,panel:document.querySelector('#panel').getBoundingClientRect().toJSON(),card:document.querySelector('.card').getBoundingClientRect().toJSON(),overflow:document.body.style.overflow,semantic:document.querySelector('#panel').tagName}));await page.keyboard.press('Escape');evidence.afterEscape=await page.evaluate(()=>({overflow:document.body.style.overflow,hidden:document.querySelector('#panel').hidden}));await fs.writeFile('baseline.json',JSON.stringify(evidence,null,2));console.log(evidence);}finally{await browser.close();server.kill();}

