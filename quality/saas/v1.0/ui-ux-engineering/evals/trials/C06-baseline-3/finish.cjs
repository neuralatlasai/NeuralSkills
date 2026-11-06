const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const trial = __dirname;
(async()=> {
  const child = spawn(process.execPath,['serve.cjs'],{cwd:path.join(trial,'artifact'),windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output='';
  let setup;
  try {
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Server startup timed out.')),3000);
      child.stdout.on('data',data=>{ output+=data; if(output.includes('Fieldnotes:')) {clearTimeout(timer);resolve();} });
      child.stderr.on('data',data=>{output+=data;});
      child.on('error',reject);
      child.on('exit',code=>{clearTimeout(timer);reject(new Error(`Server exited ${code}: ${output}`));});
    });
    const replies=await Promise.all(['','style.css','app.js','fake-api.js'].map(async file=>{
      const response=await fetch(`http://127.0.0.1:4173/${file}`);
      return {file:file||'index.html',status:response.status,contentType:response.headers.get('content-type'),bytes:(await response.text()).length};
    }));
    setup={id:'setup-server',status:replies.every(r=>r.status===200)?'PASS':'FAIL',evidence:{command:'node serve.cjs',output,replies}};
  } catch(error) {
    setup={id:'setup-server',status:'FAIL',evidence:{message:error.message,output}};
  } finally {
    if(child.exitCode===null) {
      const exited=new Promise(resolve=>child.once('exit',resolve));
      child.kill(); await exited;
    }
  }
  fs.writeFileSync(path.join(trial,'evidence/setup-check.json'),JSON.stringify(setup,null,2));
  const browser=JSON.parse(fs.readFileSync(path.join(trial,'evidence/browser-checks.json'),'utf8'));
  const errors=JSON.parse(fs.readFileSync(path.join(trial,'evidence/tool-errors.json'),'utf8'));
  errors.errors.push({step:'Second browser run',error:'Test runner locator for Search also matched Retry search for fail, causing a strict-mode locator failure after the required scenarios had passed.',resolution:'Used exact Search accessible-name matching. Original failure retained in browser-checks-second.json. Third run passed all 21 checks with zero console, HTTP, or page errors.'});
  fs.writeFileSync(path.join(trial,'evidence/tool-errors.json'),JSON.stringify(errors,null,2));
  const end=new Date();
  const result={
    caseId:'C06',arm:'baseline',run:3,
    startedAt:'2026-11-05T16:48:03Z',endedAt:end.toISOString(),elapsedSeconds:Math.round((end-new Date('2026-11-05T16:48:03Z'))/1000),
    route:'native TypeScript + CSS; local static page at /; provided local Node, TypeScript API, Playwright and Chrome',
    requirementCoverage:[
      {id:'C06-R01',status:'PASS',implementation:'One small native TypeScript/CSS page with unchanged fixture, no framework or backend.',evidence:['artifact/src/app.ts','artifact/src/fake-api.ts','evidence/browser-checks.json#fixture-unchanged']},
      {id:'C06-R02',status:'PASS',implementation:'Labeled search input and Search button; native form submits via Enter.',evidence:['artifact/public/index.html','evidence/browser-checks.json#search-button','evidence/browser-checks.json#focus-after-enter']},
      {id:'C06-R03',status:'PASS',implementation:'Initial prompt and visible pending feedback; search stays available during requests.',evidence:['evidence/desktop-initial.png','evidence/desktop-pending.png','evidence/browser-checks.json#pending-search-enabled']},
      {id:'C06-R04',status:'PASS',implementation:'Guide cards show title, habitat and page count; empty and failure states offer clear next steps.',evidence:['evidence/browser-checks.json#cedar','evidence/browser-checks.json#moss','evidence/browser-checks.json#empty','evidence/browser-checks.json#failure']},
      {id:'C06-R05',status:'PASS',implementation:'Monotonic request identity checks both resolution and rejection before any outcome update. Cedar→moss and fail→moss preserve moss after all promises settle.',evidence:['artifact/src/app.ts','evidence/browser-checks.json#stale-success','evidence/browser-checks.json#stale-failure']},
      {id:'C06-R06',status:'PASS',implementation:'Retry captures the failed submitted query and makes a new request even after input edits.',evidence:['evidence/browser-checks.json#retry-same-query','evidence/browser-checks.json#retry-new-attempt']},
      {id:'C06-R07',status:'PASS',implementation:'Persistent polite atomic status, busy result region, explicit label, keyboard focus retained on search and restored before Retry is removed, visible focus styling and reduced motion support.',evidence:['evidence/browser-checks.json#accessible-markup','evidence/browser-checks.json#retry-keyboard-reachable','evidence/browser-checks.json#retry-focus','evidence/browser-checks.json#reduced-motion']},
      {id:'C06-R08',status:'PASS',implementation:'Responsive 320px layout, wrapping cards and outcomes, setup instructions with checked built JavaScript.',evidence:['evidence/mobile-moss.png','evidence/mobile-failure.png','evidence/browser-checks.json#mobile-320','artifact/README.md','evidence/setup-check.json']}
    ],
    assumptions:[
      'The input lists eight requirement IDs without individual definitions; coverage maps them to the task requirements in task order.',
      'No extra visual references or brand assets were supplied; used a restrained field-library identity with native fonts and decorative text glyphs.',
      'Fixture paths in C06.json resolve under evals/fixtures; the initially attempted role-root fixture paths did not exist.'
    ],
    decisions:[
      'Keep Search enabled and use request sequence IDs instead of cancellation because the API has no AbortSignal.',
      'Use textContent for all query and API content and a persistent live region outside the busy results region.',
      'Keep the search input and button mounted; Retry returns focus to the input before replacing its own card.',
      'Supply precompiled browser modules so running the page only requires Node; rebuilding uses the provided local TypeScript API.',
      'No UI skill, references, cases, rubric, previous trials, network, installs, or unrelated files were consulted.'
    ],
    checks:[
      {id:'typescript-strict-build',status:'PASS',evidence:'node artifact/build.cjs completed with zero diagnostics; TypeScript checked and emitted app.js and fake-api.js.'},
      ...browser.checks.map(check=>({...check,evidence:{observed:check.evidence,file:'evidence/browser-checks.json'}})),
      setup,
      {id:'visual-review',status:'PASS',evidence:'Viewed desktop-initial.png, desktop-moss.png, mobile-moss.png, and mobile-failure.png. Text and controls are legible, long titles wrap, focus ring is visible, and no clipping or overlap observed.'},
      {id:'first-run-console-error',status:'FAIL',evidence:'Historical: first browser run recorded one resource 404. Added embedded favicon; final run recorded zero HTTP, console, and page errors. Preserved in evidence/browser-checks-first.json.'},
      {id:'second-run-test-selector',status:'FAIL',evidence:'Historical runner failure: non-exact Search locator matched Search and Retry search for fail. Corrected to exact accessible-name matching. Preserved in evidence/browser-checks-second.json; final complete run passed.'},
      {id:'screen-reader-announcement',status:'UNVERIFIED',evidence:'Live-region attributes verified in Chrome DOM; no actual screen reader or assistive technology was run.'},
      {id:'cross-browser',status:'UNVERIFIED',evidence:'Only supplied Chrome via Playwright was executed.'},
      {id:'helper-shutdown',status:'PASS',evidence:'Browser test closes browser and ephemeral server in finally; setup smoke server child was terminated and awaited before writing result.'}
    ],
    limitations:[
      'Real screen-reader announcement behavior and non-Chrome engines were not tested.',
      'Build script references the provided environment-specific TypeScript path; README explains changing it on another machine.',
      'Historical tooling and test-runner failures are retained separately from final passing behavior.'
    ],
    tokens:null,cost:null
  };
  fs.writeFileSync(path.join(trial,'result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({result:'result.json',setupStatus:setup.status,finalBrowserChecks:browser.checks.length,finalBrowserErrors:browser.errors,startedAt:result.startedAt,endedAt:result.endedAt,elapsedSeconds:result.elapsedSeconds,helpersStopped:true},null,2));
})();
