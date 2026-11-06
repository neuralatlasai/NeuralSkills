import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { skillRoot } from './validate.mjs';
import { findTypeScript } from './build-lab.mjs';
import { startServer } from './serve.mjs';
import { summarize } from './measure.mjs';

const require=createRequire(import.meta.url), fixture=path.join(skillRoot,'evals/fixtures/heavy');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};
async function run(options){
  const browserPath=options.browser??process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe';
  try{await access(browserPath);}catch{throw new Error(`Browser unavailable: ${browserPath}`);}
  const out=options.out??path.join(skillRoot,'evals/evidence/heavy');await mkdir(out,{recursive:true});
  const planBytes=await readFile(path.join(fixture,'plan.json'));
  const plan=JSON.parse(planBytes);assert.equal(plan.runs,3);assert.equal(plan.frozenBeforeExecution,true);
  const compiler=await findTypeScript();if(!compiler)throw new Error('Installed TypeScript compiler required for heavy fixture semantic checking');
  const ts=require(compiler),source=path.join(fixture,'app.ts');
  const program=ts.createProgram([source],{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,noEmit:true,skipLibCheck:true,lib:['lib.es2022.d.ts','lib.dom.d.ts']});
  const diagnostics=ts.getPreEmitDiagnostics(program);if(diagnostics.length)throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>fixture,getNewLine:()=> '\n'}));
  const emitted=ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});await writeFile(path.join(fixture,'app.js'),emitted.outputText);
  const sourceHashes={};for(const file of ['index.html','styles.css','app.ts','app.js'])sourceHashes[file]=hash(await readFile(path.join(fixture,file)));sourceHashes['../lab/state.js']=hash(await readFile(path.join(fixture,'../lab/state.js')));
  const buildHash=hash(JSON.stringify(sourceHashes));
  const playwright=require(process.env.PLAYWRIGHT_MODULE??path.join(process.env.APPDATA,'npm/node_modules/@playwright/cli/node_modules/playwright'));
  const {server,url}=await startServer({root:path.join(skillRoot,'evals/fixtures'),port:0});let browser;
  const runs=[],profiles=[],checks=[],errors=[];
  const beganAt=new Date().toISOString();
  try{
    browser=await playwright.chromium.launch({headless:true,executablePath:browserPath});
    for(let runIndex=0;runIndex<3;runIndex++){
      const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
      const metric=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(item=>[item.name,item.value]));
      await page.goto(`${url}/heavy/index.html`);await page.getByRole('status').filter({hasText:'1000 matching records.'}).waitFor();
      assert.equal(await page.locator('#rows tr').count(),50);
      await page.getByRole('checkbox',{name:'Select record 0001',exact:true}).check();await page.getByRole('button',{name:'Next page',exact:true}).click();await page.getByRole('button',{name:'Previous page',exact:true}).click();assert.equal(await page.getByRole('checkbox',{name:'Select record 0001',exact:true}).isChecked(),true);
      const baseline=await metric();
      const typingBegan=performance.now();await page.getByRole('searchbox').pressSequentially('Record 09',{delay:15});await page.getByRole('status').filter({hasText:'100 matching records.'}).waitFor();
      const typingOperationMs=performance.now()-typingBegan;
      await page.waitForFunction(()=>window.heavyTelemetry.some(item=>item.query==='Record 0'&&item.settledAt!==undefined));
      assert.equal(await page.locator('#rows tr').count(),50);assert.match(await page.locator('#rows').innerText(),/Record 0900/);assert.doesNotMatch(await page.locator('#rows').innerText(),/Record 0001/);
      const typing=await page.evaluate(()=>window.heavyTelemetry);assert.ok(typing.find(item=>item.query==='Record 0').applied===false);assert.ok(typing.find(item=>item.query==='Record 09').applied===true);
      const feedbackMutationMedianMs=median(typing.map(item=>item.feedbackAt-item.eventAt));const feedbackAnimationMedianMs=median(typing.map(item=>item.animationAt-item.eventAt));assert.ok(feedbackAnimationMedianMs<=100,'predeclared local feedback callback gate');
      const scrollBegan=performance.now();await page.locator('.table-wrap').evaluate(async node=>{for(let step=0;step<12;step++){node.scrollTop=step%2?node.scrollHeight:0;await new Promise(requestAnimationFrame);}});const scrollWorkloadMs=performance.now()-scrollBegan;
      const resizeBegan=performance.now();await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(requestAnimationFrame));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);if(runIndex===0)await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:900});const resizeWorkloadMs=performance.now()-resizeBegan;
      await page.getByRole('searchbox').fill('');await page.getByRole('status').filter({hasText:'1000 matching records.'}).waitFor();assert.equal(await page.getByRole('checkbox',{name:'Select record 0001',exact:true}).isChecked(),true);
      await page.getByRole('checkbox',{name:'Slow next request',exact:true}).check();await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('searchbox').focus();assert.equal(await page.locator('#stale').isVisible(),true);const refreshBegan=performance.now();await page.getByRole('status').filter({hasText:'1000 matching records.'}).waitFor();const refreshReadyMs=performance.now()-refreshBegan;assert.equal(await page.getByRole('searchbox').evaluate(node=>node===document.activeElement),true);assert.equal(await page.getByRole('checkbox',{name:'Select record 0001',exact:true}).isChecked(),true);
      await page.getByRole('checkbox',{name:'Fail next request',exact:true}).check();await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('#error').waitFor({state:'visible'});assert.equal(await page.locator('#rows tr').count(),50);assert.equal(await page.locator('#stale').isVisible(),true);await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByRole('status').filter({hasText:'1000 matching records.'}).waitFor();assert.equal(await page.locator('#stale').isVisible(),false);
      const after=await metric(),dom=await cdp.send('Memory.getDOMCounters');
      const domNodes=await page.evaluate(()=>{const walker=document.createTreeWalker(document,NodeFilter.SHOW_ALL);let count=0;while(walker.nextNode())count++;return count;});
      const values={feedbackMutationMedianMs,feedbackAnimationMedianMs,typingOperationMs,scrollWorkloadMs,resizeWorkloadMs,refreshReadyMs,domNodes,heapUsedBytes:after.JSHeapUsedSize,layoutCountDelta:after.LayoutCount-baseline.LayoutCount,recalcStyleCountDelta:after.RecalcStyleCount-baseline.RecalcStyleCount};
      runs.push(values);profiles.push({run:runIndex+1,typingEvents:typing,baseline,after,domCounters:dom,liveDocumentNodes:domNodes});assert.ok(domNodes<=2000,'predeclared live pagination structural DOM cap');assert.equal(await page.locator('#rows tr').count(),50);checks.push({run:runIndex+1,status:'PASS',functional:'pagination, search, out-of-order guard, selection, focus, stale refresh, failure/retry, scroll/resize and live DOM cap'});if(runIndex===0)await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});await context.close();
    }
    assert.deepEqual(errors,[]);
    const negative=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--browser',path.join(out,'missing-browser.exe')],{encoding:'utf8',timeout:15000});assert.equal(negative.status,1);assert.match(negative.stderr,/Browser unavailable/);
    const conditions={build:buildHash,tool:`Playwright/CDP; TypeScript ${ts.version}`,browser:await browser.version(),device:`${process.platform}/${process.arch}; ${os.cpus()[0]?.model}; ${os.cpus().length} logical CPUs; ${os.totalmem()} RAM bytes; host load uncontrolled`,network:'loopback no throttling; synthetic180ms normal/650ms slow; transport ignores abort',cpu:'no throttling',viewport:'1280x900 ->390x844 ->1280x900',dataset:'1000 deterministic synthetic records;50rendered/page',cache:'fresh browser context per run; HTTP no-store',workload:plan.workload.join('; '),timing:'input handler telemetry to synchronous mutation and next rAF callback; operation/workload wall clocks include automation overhead; not paint or INP'};
    const input={kind:'lab',conditions,runs};await writeFile(path.join(out,'runs.json'),JSON.stringify(input,null,2)+'\n');await writeFile(path.join(out,'measurements.json'),JSON.stringify(summarize(input),null,2)+'\n');
    const report={status:'PASS',beganAt,planHash:hash(planBytes),buildHash,sourceHashes,compiler,checks,errors,profiles,priorHarnessFailure:'failure-001.json retained; correction.json explains live-DOM structural metric versus raw CDP total nodes. Threshold remains2000; no numeric total-CDP-node acceptance claim.',scriptNegative:{command:['node','scripts/heavy-lab.mjs','--browser','missing-browser.exe'],exitCode:negative.status,stderr:negative.stderr},limitations:plan.profileBoundary};await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');return{status:'PASS',runs:runs.length,buildHash,out};
  }catch(error){await writeFile(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',at:new Date().toISOString(),planHash:hash(planBytes),buildHash,checks,runs,profiles,errors,error:error.stack},null,2)+'\n');throw error;}
  finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
try{const args=process.argv.slice(2),options={};while(args.length){const key=args.shift(),value=args.shift();if(!value||!['--out','--browser'].includes(key))throw new Error('usage: node scripts/heavy-lab.mjs [--out DIR] [--browser PATH]');options[key.slice(2)]=path.resolve(value);}console.log(JSON.stringify(await run(options),null,2));}catch(error){console.error(error.stack);process.exitCode=1;}
