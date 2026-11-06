import { chromium } from 'file:///C:/Users/heman/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
const trial = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(trial, '../../..');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const [name,width,height] of [['brand',720,460],['layout',1280,900],['typography',900,600]]) {
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 await page.setContent(await readFile(path.join(root,'evals/fixtures/C03',name+'.svg'),'utf8'));
 await page.addStyleTag({content:'body{margin:0}'});
 await page.screenshot({path:path.join(trial,'evidence',name+'.png'),timeout:10000});
 await page.close();
}
await browser.close();