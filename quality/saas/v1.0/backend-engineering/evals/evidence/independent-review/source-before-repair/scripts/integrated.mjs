import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash, X509Certificate } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { generateCerts } from './cert-gen.mjs';
import { startFixture, BOUNDS } from './service.mjs';
import { request, slowBody, directAppRequest, malformedFraming } from './client.mjs';
import { assert, machine, recorder, sourceHash } from './evidence.mjs';
import { legacyRead, legacyCreate } from '../evals/fixtures/legacy-repository.mjs';

const sleep=ms=>new Promise(resolveSleep=>setTimeout(resolveSleep,ms));
const baseDirectory=resolve('evals/evidence/integrated');
const directory=join(baseDirectory,'runs',new Date().toISOString().replace(/[:.]/g,'-'));
const frozenSchedule={version:1,scope:'loopback reference fixture only',cases:[
  ['I01','CRUD lifecycle and trace','POST/read/PATCH/PUT/list cursor/delete; forged forwarding and direct ingress bypass'],
  ['I02','Concurrent duplicate create','8 simultaneous same-key POST; changed parameters; direct SQLite CHECK failure'],
  ['I03','Competing versions and inventory bounds','2 simultaneous expected-version=1 decrements; negative outcome denied'],
  ['I04','Lost response after commit and retry','destroy app socket after committed POST; same-key retry returns committed item'],
  ['I05','Authorization across applicable operations','cross-tenant GET/PATCH/PUT/DELETE/adjust; object scope; privileged field POST/PATCH/PUT; auth missing'],
  ['I06','Request bytes syntax deadline and cost','oversized JSON; malformed JSON; slow incomplete body; >=180ms application cost'],
  ['I07','Admission exhaustion and recovery','20 simultaneous requests at 120ms service cost; active=2 queue=4 age=90ms; reset cost and retry'],
  ['I08','Cache and dependency outage','cache warm/bypass; cache outage read; simulated database dependency outage fails503 then recovery'],
  ['I09','Worker effect-before-ack replay','commit SQLite local effect then throw before ack; replay and deduplicate same effect'],
  ['I10','TLS and credential rotation','untrusted CA/wrong host/expired/malformed cert rejected; live valid cert rotation; revoke old credential'],
  ['I11','Migration compatibility and drain','real v1 database -> additive v2 migration; legacy/new payloads; admit then drain; post-drain503'],
  ['I12','Actual backup restore and deletion reconciliation','SQLite online backup -> restore -> compare data/tenant authorization -> reapply deletion ledger'],
  ['I13','Telemetry outage is bounded','40 sequential requests with sink disabled; bounded16 queue, counted drops; sink recovery']
],faultRules:'No adaptive fault changes inside a case. Each case restores controls in finally. Failed cases remain in raw.jsonl and summary.'};

async function main(){
  if(process.argv.includes('--invalid'))throw new Error('Invalid integrated option');
  mkdirSync(directory,{recursive:true});
  writeFileSync(join(directory,'fault-schedule.json'),JSON.stringify(frozenSchedule,null,2));
  const scheduleHash=createHash('sha256').update(readFileSync(join(directory,'fault-schedule.json'))).digest('hex');
  const log=recorder(directory,'integrated');const started=new Date().toISOString();
  const certs=generateCerts(join(directory,'certs'));const fixture=await startFixture({directory:join(directory,'primary'),certs});fixture.certs=certs;
  const results=[];let counter=0;
  async function req(label,path,options){const response=await request(fixture,path,options);log({kind:'request',label,path,method:options?.method||'GET',...response});return response;}
  async function create(label,body={name:label,quantity:5},options={}){const response=await req(label,'/v1/items',{method:'POST',body,headers:{'idempotency-key':`case-${++counter}`},...options});assert(response.status===201,`${label} create returned ${response.status}`);return response.body;}
  async function run(index,test){const [id,name]=frozenSchedule.cases[index];const start=performance.now();log({kind:'case-start',id,name,scheduleHash});try{const details=await test();const result={id,name,status:'PASS',durationMs:performance.now()-start,details};results.push(result);log({kind:'case-result',...result});}catch(error){const result={id,name,status:'FAIL',durationMs:performance.now()-start,reason:error.stack,details:fixture.state()};results.push(result);log({kind:'case-result',...result});}finally{Object.assign(fixture.controls,{costMs:0,dependencyDown:false,cacheDown:false,telemetryDown:false,loseResponse:false});}}
  try{
    await run(0,async()=>{
      const item=await create('lifecycle',{name:'created',quantity:5,description:'cleared by PUT'});const path=`/v1/items/${item.id}`;
      let response=await req('read with spoofed forwarded headers',path,{headers:{forwarded:'for=attacker;proto=http','x-forwarded-for':'attacker','x-forwarded-proto':'http','x-ingress-secret':'forged'}});assert(response.status===200&&response.headers['x-trace-id'],'read trace missing');
      response=await req('patch',path,{method:'PATCH',body:{quantity:4},headers:{'if-match':'1'}});assert(response.status===200&&response.body.version===2&&response.body.description==='cleared by PUT','PATCH did not preserve omitted fields');
      response=await req('put',path,{method:'PUT',body:{name:'replaced',quantity:3},headers:{'if-match':'2'}});assert(response.status===200&&response.body.version===3&&response.body.description==='','PUT replacement semantics incorrect');
      await create('cursor extra');const page=await req('list page1','/v1/items?limit=1');assert(page.status===200&&page.body.nextCursor,'bounded pagination absent');
      const next=await req('list page2',`/v1/items?limit=1&cursor=${encodeURIComponent(page.body.nextCursor)}`);assert(next.status===200&&next.body.items[0].id>page.body.items[0].id,'unstable cursor ordering');
      const crossCursor=await req('cross tenant cursor',`/v1/items?cursor=${encodeURIComponent(page.body.nextCursor)}`,{token:'fixture-token-b'});assert(crossCursor.status===400,'cursor accepted outside scope');
      response=await req('delete',path,{method:'DELETE',headers:{'if-match':'3'}});assert(response.status===204,'delete failed');response=await req('read deleted',path);assert(response.status===404&&response.body.status===404&&response.body.traceId&&response.headers['content-type']==='application/problem+json','Problem Details missing');
      assert(await directAppRequest(fixture)===400,'untrusted direct forwarding accepted');
      return {traceHeader:true,crud:['POST','GET','list','PATCH','PUT','DELETE'],sqlite:fixture.db.prepare('select sqlite_version() version').get().version,path:fixture.dependencyPath};
    });
    await run(1,async()=>{
      const options={method:'POST',body:{name:'deduplicated',quantity:7},headers:{'idempotency-key':'simultaneous-create'}};
      const responses=await Promise.all(Array.from({length:8},(_,i)=>req(`duplicate-${i}`,'/v1/items',options)));assert(responses.every(r=>r.status===201),'duplicate requests failed');assert(new Set(responses.map(r=>r.body.id)).size===1,'duplicate created multiple objects');
      const changed=await req('duplicate different parameters','/v1/items',{...options,body:{name:'different',quantity:7}});assert(changed.status===409,'parameter mismatch was accepted');
      const count=fixture.db.prepare('SELECT count(*) n FROM items WHERE tenant=? AND name=?').get('tenant-a','deduplicated').n;assert(count===1,'DB did not contain exactly one item');
      let constraint='';try{fixture.db.prepare('INSERT INTO items(tenant,id,owner,name,quantity) VALUES(?,?,?,?,?)').run('tenant-a','bad','alice','bad',-1);}catch(error){constraint=error.message;}assert(constraint.includes('CHECK constraint failed'),'real database CHECK not enforced');
      return {requests:8,itemCount:count,replays:responses.filter(r=>r.headers['idempotency-replayed']==='true').length,sqliteConstraintFailure:constraint};
    });
    await run(2,async()=>{
      const item=await create('inventory-race');const path=`/v1/items/${item.id}/adjust`;
      const responses=await Promise.all([0,1].map(i=>req(`competing-${i}`,path,{method:'POST',body:{delta:-4},headers:{'if-match':'1','idempotency-key':`adjust-${i}`}})));
      assert(responses.map(r=>r.status).sort().join(',')==='200,409','expected one winner one conflict');
      const final=await req('inventory final',`/v1/items/${item.id}`);assert(final.body.quantity===1&&final.body.version===2,'lost write or invalid inventory');
      const negative=await req('inventory underflow',path,{method:'POST',body:{delta:-2},headers:{'if-match':'2','idempotency-key':'underflow'}});assert(negative.status===409,'negative inventory allowed');return {statuses:responses.map(r=>r.status),quantity:final.body.quantity,version:final.body.version};
    });
    await run(3,async()=>{
      fixture.controls.loseResponse=true;const options={method:'POST',body:{name:'lost-response',quantity:2},headers:{'idempotency-key':'lost-response'}};
      const lost=await req('committed response lost','/v1/items',options);assert(lost.status===0||lost.status===502,'injected lost response not observed');
      const retry=await req('safe retry','/v1/items',options);assert(retry.status===201&&retry.headers['idempotency-replayed']==='true','retry did not replay');assert(fixture.db.prepare('SELECT count(*) n FROM items WHERE name=?').get('lost-response').n===1,'retry duplicated effect');return {lostStatus:lost.status,retryStatus:retry.status,id:retry.body.id,committedCount:1};
    });
    await run(4,async()=>{
      const item=await create('authorization');const path=`/v1/items/${item.id}`;const denials=[];
      for(const method of ['GET','PATCH','PUT','DELETE']){const response=await req(`tenant denial ${method}`,path,{method,token:'fixture-token-b',body:['PATCH','PUT'].includes(method)?{name:'forbidden',quantity:2}:undefined,headers:{'if-match':'1'}});assert(response.status===404,'cross tenant access leaked');denials.push([method,response.status]);}
      let response=await req('tenant adjustment deny',`${path}/adjust`,{method:'POST',token:'fixture-token-b',body:{delta:1},headers:{'if-match':'1','idempotency-key':'denied-adjust'}});assert(response.status===404,'cross tenant adjustment accepted');
      for(const method of ['GET','PATCH','PUT','DELETE']){response=await req(`object denial ${method}`,path,{method,token:'fixture-token-limited',body:['PATCH','PUT'].includes(method)?{name:'forbidden',quantity:2}:undefined,headers:{'if-match':'1'}});assert(response.status===403,'object authorization not applied');}
      for(const method of ['POST','PUT','PATCH']){response=await req(`privileged field ${method}`,method==='POST'?'/v1/items':path,{method,body:{name:'forbidden',quantity:2,owner:'admin'},headers:{'if-match':'1','idempotency-key':'deny-owner'}});assert(response.status===403,'privileged owner writable');}
      const job=fixture.db.prepare('SELECT id FROM jobs WHERE tenant=? AND item_id=?').get('tenant-a',item.id);await req('warm authorized cache',path);assert((await req('cache tenant denial',path,{token:'fixture-token-b'})).status===404,'cached data crossed tenants');
      for(const [token,status] of [['fixture-token-b',404],['fixture-token-limited',403]]){response=await req('job result denied',`/v1/jobs/${job.id}`,{token});assert(response.status===status,'job/result authorization failed');}
      let relation='';try{fixture.db.prepare("INSERT INTO jobs(id,tenant,item_id,state) VALUES(?,?,?,'pending')").run('invalid-relation','tenant-b',item.id);}catch(error){relation=error.message;}assert(relation.includes('FOREIGN KEY constraint failed'),'cross tenant job reference allowed');
      response=await req('unauthenticated',path,{token:'invalid'});assert(response.status===401,'invalid auth allowed');
      response=await req('unknown field',path,{method:'PATCH',body:{arbitrary:true},headers:{'if-match':'1'}});assert(response.status===422,'mass assignment allowlist failed');
      response=await req('SQL metacharacters as data','/v1/items',{method:'POST',body:{name:"'; DROP TABLE items; --",quantity:1},headers:{'idempotency-key':'sql-as-data'}});assert(response.status===201&&fixture.db.prepare('SELECT count(*) n FROM items').get().n>0,'parameterization path failed');
      return {crossTenant:denials,objectMethods:['GET','PATCH','PUT','DELETE'],fieldMethods:['POST','PUT','PATCH'],crossTenantJobConstraint:relation,jobResultScope:'tenant and object enforced',directDatabaseAuthority:'SQLite file owner is privileged; independent DCL/RLS/session-pool tenant enforcement NOT_APPLICABLE for SQLite adapter',unsupportedAdapters:'NOT_APPLICABLE: no GraphQL, gRPC, bulk, upsert or external adapters shipped'};
    });
    await run(5,async()=>{
      const oversized=await req('oversized','/v1/items',{method:'POST',rawBody:JSON.stringify({name:'x'.repeat(3000)}),headers:{'idempotency-key':'oversized'}});assert(oversized.status===413,'oversized body accepted');
      const malformed=await req('malformed','/v1/items',{method:'POST',rawBody:'{',headers:{'idempotency-key':'malformed'}});assert(malformed.status===400,'malformed JSON accepted');
      const compressed=await req('unsupported compression','/v1/items',{method:'POST',rawBody:'compressed bytes',headers:{'content-encoding':'gzip','idempotency-key':'compressed'}});assert(compressed.status===415,'unsupported compressed body accepted');
      const deeplyNested=await req('deeply nested JSON','/v1/items',{method:'POST',body:{name:{a:{b:{c:{d:{e:1}}}}}},headers:{'idempotency-key':'deep'}});assert(deeplyNested.status===422,'deep nesting accepted');
      const framing=await malformedFraming(fixture);log({kind:'malformed-framing',...framing});assert(framing.status===400,'conflicting HTTP request framing was accepted');
      const slow=await slowBody(fixture);log({kind:'request',label:'slow body',...slow});assert([0,408,502].includes(slow.status)&&slow.latencyMs<1300,'slow body was not bounded');
      fixture.controls.costMs=200;const costly=await req('costly deadline','/v1/items');assert(costly.status===504,'cost deadline not enforced');return {oversized:oversized.status,malformed:malformed.status,slow,costly:costly.status,limits:BOUNDS,slowResponseLimitation:'Interrupted body may surface as ingress502 or socket close; bounded completion is asserted, not a reliable408 response'};
    });
    await run(6,async()=>{
      fixture.controls.costMs=120;const responses=await Promise.all(Array.from({length:20},(_,i)=>req(`capacity-${i}`,'/v1/items')));const state=fixture.state();assert(responses.some(r=>r.status===503)&&responses.some(r=>r.status===200),'capacity controls not exercised');assert(state.queueHighWater===BOUNDS.queued&&state.active===0&&state.queued===0,'queue bound or cleanup failed');
      fixture.controls.costMs=0;const recovered=await req('capacity recovered','/v1/items');assert(recovered.status===200,'capacity failed to recover');return {counts:responses.reduce((out,r)=>(out[r.status]=(out[r.status]||0)+1,out),{}),state,recovered:recovered.status};
    });
    await run(7,async()=>{
      const item=await create('cache-dependency');const path=`/v1/items/${item.id}`;await req('warm1',path);await req('warm2',path);const hits=fixture.state().cacheHits;assert(hits>0,'cache not exercised');fixture.controls.cacheDown=true;assert((await req('cache outage',path)).status===200,'cache bypass failed');fixture.controls.dependencyDown=true;assert((await req('dependency unavailable',path)).status===503,'dependency outage did not fail closed');fixture.controls.dependencyDown=false;assert((await req('dependency recovered',path)).status===200,'dependency recovery failed');return {cacheHits:hits,cacheBypass:fixture.state().cacheBypass,cacheBound:BOUNDS.cacheEntries,dependencyFault:'Application seam returns503 before SQLite queries; no physical disk or remote network failure asserted'};
    });
    await run(8,async()=>{
      const crash=spawnSync(process.execPath,['scripts/worker.mjs',fixture.dbPath,'--crash-after-effect'],{encoding:'utf8'});log({kind:'worker-process',phase:'crash',exitCode:crash.status,stdout:crash.stdout,stderr:crash.stderr});assert(crash.status===77,'effect-before-ack process exit absent');
      const jobId=JSON.parse(crash.stdout.trim()).jobId;const before=fixture.db.prepare('SELECT * FROM jobs WHERE id=?').get(jobId);assert(before.state==='pending','job acked before fault');const replay=spawnSync(process.execPath,['scripts/worker.mjs',fixture.dbPath,'--ack'],{encoding:'utf8'});log({kind:'worker-process',phase:'replay',exitCode:replay.status,stdout:replay.stdout,stderr:replay.stderr});assert(replay.status===0,'fresh worker process failed');const after=fixture.db.prepare('SELECT * FROM jobs WHERE id=?').get(jobId);const effects=fixture.db.prepare('SELECT count(*) n FROM effects WHERE job_id=?').get(jobId).n;assert(after.state==='acked'&&after.attempts===2&&effects===1,'replay duplicated local effect');return {jobId,attempts:after.attempts,effects,guarantee:'Exactly one committed SQLite local effect per job_id across worker process exit77 and restart; remote effects and power-loss durability remain UNVERIFIED'};
    });
    await run(9,async()=>{
      const untrusted=await req('untrusted CA','/health',{ca:[]});assert(untrusted.status===0&&untrusted.error,'untrusted cert accepted');const wrongHost=await req('wrong TLS host','/health',{servername:'wrong.invalid'});assert(wrongHost.status===0&&wrongHost.error==='ERR_TLS_CERT_ALTNAME_INVALID','wrong host accepted');
      const original=await req('original certificate','/health');fixture.rotateCertificate(certs.expired);const expired=await req('expired certificate','/health');assert(expired.status===0&&expired.error==='CERT_HAS_EXPIRED','expired cert accepted');fixture.rotateCertificate(certs.rotated);const rotated=await req('rotated certificate','/health');assert(rotated.status===200&&rotated.peerFingerprint!==original.peerFingerprint,'live certificate rotation failed');
      let invalid='';try{fixture.rotateCertificate({key:'not a key',cert:'not a certificate'});}catch(error){invalid=error.code||error.message;}assert(invalid,'invalid certificate context accepted');assert((await req('after invalid cert attempt','/health')).status===200,'invalid cert broke current context');
      fixture.rotateCredential('fixture-token-a','fixture-token-a-rotated');const revoked=await req('old credential','/health');const accepted=await req('new credential','/health',{token:'fixture-token-a-rotated'});assert(revoked.status===401&&accepted.status===200,'credential rotation failed');fixture.rotateCredential('fixture-token-a-rotated','fixture-token-a');
      return {untrusted:untrusted.error,wrongHost:wrongHost.error,expired:expired.error,invalidContext:invalid,oldFingerprint:original.peerFingerprint,newFingerprint:rotated.peerFingerprint,credentialStatuses:[revoked.status,accepted.status],globalTrustStoreChanged:false};
    });
    await run(10,async()=>{
      const oldDir=join(directory,'migration');mkdirSync(oldDir,{recursive:true});const path=join(oldDir,'old.sqlite');const old=new DatabaseSync(path);old.exec(`CREATE TABLE items(tenant TEXT NOT NULL,id TEXT NOT NULL,owner TEXT NOT NULL,name TEXT NOT NULL,quantity INTEGER NOT NULL,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(tenant,id));`);legacyCreate(old,{tenant:'tenant-a',id:'00000000-0000-4000-8000-000000000001',owner:'alice',name:'legacy',quantity:4});assert(legacyRead(old,'tenant-a','00000000-0000-4000-8000-000000000001').name==='legacy','legacy adapter failed before migration');old.close();
      const migrated=await startFixture({directory:oldDir,databasePath:path,certs});migrated.certs=certs;
      try{let response=await request(migrated,'/v1/items/00000000-0000-4000-8000-000000000001');log({kind:'request',label:'migrated legacy',...response});assert(response.status===200&&response.body.description==='','additive migration failed');
        assert(legacyRead(migrated.db,'tenant-a','00000000-0000-4000-8000-000000000001').name==='legacy','old SQL adapter failed after migration');legacyCreate(migrated.db,{tenant:'tenant-a',id:'00000000-0000-4000-8000-000000000002',owner:'alice',name:'legacy-after-migration',quantity:2});assert(migrated.db.prepare('SELECT description FROM items WHERE tenant=? AND id=?').get('tenant-a','00000000-0000-4000-8000-000000000002').description==='','old writer failed postmigration default');
        response=await request(migrated,'/v1/items',{method:'POST',body:{name:'new-schema',quantity:1,description:'new'},headers:{'idempotency-key':'new-schema'}});assert(response.status===201,'new payload incompatible');
        migrated.controls.costMs=60;const admitted=request(migrated,'/v1/items');await sleep(20);migrated.beginDrain();const denied=await request(migrated,'/health');const completed=await admitted;assert(denied.status===503&&completed.status===200,'drain did not distinguish inflight/new requests');return {schemaVersion:migrated.db.prepare('SELECT version FROM schema_meta').get().version,legacyPayload:'PASS',newPayload:'PASS',inflight:completed.status,newDuringDrain:denied.status,limitation:'Single local process additive migration only; no rolling fleet or destructive migration claim'};
      }finally{await migrated.stop();}
    });
    await run(11,async()=>{
      const item=await create('backup-target');const before=fixture.db.prepare('SELECT tenant,id,name,quantity,version,description FROM items ORDER BY tenant,id').all();const restoreDir=join(directory,'restore');mkdirSync(restoreDir,{recursive:true});const backupPath=join(restoreDir,'restored.sqlite');const backupStart=performance.now();await fixture.backup(backupPath);const backupMs=performance.now()-backupStart;
      const deletion=await req('delete after backup',`/v1/items/${item.id}`,{method:'DELETE',headers:{'if-match':'1'}});assert(deletion.status===204,'source deletion failed');const ledger=fixture.db.prepare('SELECT tenant,item_id FROM deletions').all();
      const restoreStart=performance.now();const restored=await startFixture({directory:restoreDir,databasePath:backupPath,certs});restored.certs=certs;
      try{const restoredRows=restored.db.prepare('SELECT tenant,id,name,quantity,version,description FROM items ORDER BY tenant,id').all();assert(JSON.stringify(before)===JSON.stringify(restoredRows),'restored dataset mismatch');const own=await request(restored,`/v1/items/${item.id}`);const cross=await request(restored,`/v1/items/${item.id}`,{token:'fixture-token-b'});assert(own.status===200&&cross.status===404,'restored tenant permissions broken');for(const deleted of ledger)restored.reconcileDeletion(deleted.tenant,deleted.item_id);const reconciled=await request(restored,`/v1/items/${item.id}`);assert(reconciled.status===404,'deletion reconciliation failed');return {backupMs,restoreAndVerifyMs:performance.now()-restoreStart,rowCount:before.length,tenantAccess:[own.status,cross.status],deletionReconciled:reconciled.status,dbIntegrity:restored.db.prepare('PRAGMA integrity_check').get().integrity_check,scope:'Local same-machine SQLite backup/restore. Explicit source deletion ledger reapplication, not automatic cross-system retention compliance'};
      }finally{await restored.stop();}
    });
    await run(12,async()=>{
      fixture.controls.telemetryDown=true;for(let i=0;i<40;i++)assert((await req(`telemetry outage ${i}`,'/health')).status===200,'telemetry outage affected response');const outage=fixture.state();assert(outage.telemetryEntries===BOUNDS.telemetryEntries&&outage.telemetryDropped>=24,'telemetry buffering unbounded or drops invisible');fixture.controls.telemetryDown=false;await req('telemetry recovery','/health');assert(fixture.state().telemetryEntries===0,'telemetry failed to drain');return {outage,recovery:fixture.state(),sink:'In-memory sink toggle; external collector/network outage NOT_APPLICABLE'};
    });
    const metadata={startedAt:started,finishedAt:new Date().toISOString(),machine:machine(),openssl:certs.openssl,sqlite:fixture.db.prepare('select sqlite_version() version').get().version,source:sourceHash(),scheduleHash,bounds:BOUNDS,configuration:{transport:'native https with CA validation; loopback HTTP proxy hop',database:'disk-backed SQLite WAL',tenantCount:2,syntheticSubjects:4,cachePolicy:'bounded insertion-order process cache; bypass on injected cacheDown',auth:'Synthetic bearer credentials SHA-256 hashes in SQLite; fixture only'},data:{rows:fixture.db.prepare('SELECT count(*) n FROM items').get().n,tenants:fixture.db.prepare('SELECT tenant,count(*) n FROM items GROUP BY tenant').all()},results,summary:{PASS:results.filter(x=>x.status==='PASS').length,FAIL:results.filter(x=>x.status==='FAIL').length,UNVERIFIED:0,NOT_APPLICABLE:0},limits:['No production authentication, cloud, broker, external side effect, fleet rollout or portable capacity conclusion.','Dependency/cache/telemetry failure injection occurs at explicit application seams; real TCP/TLS and SQLite still execute on healthy paths.','Worker process exits77 after local-effect commit and restarts; power-loss durability and remote effects remain UNVERIFIED.']};
    writeFileSync(join(directory,'integrated-results.json'),JSON.stringify(metadata,null,2));writeFileSync(join(baseDirectory,'integrated-results.json'),JSON.stringify({...metadata,runDirectory:directory},null,2));console.log(JSON.stringify(metadata.summary));if(metadata.summary.FAIL)process.exitCode=1;
  }finally{await fixture.stop();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
