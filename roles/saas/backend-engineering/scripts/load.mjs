import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { startFixture, BOUNDS } from './service.mjs';
import { generateCerts } from './cert-gen.mjs';
import { request } from './client.mjs';
import { machine, recorder, sourceHash, assert } from './evidence.mjs';

const percentile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.ceil(p*values.length)-1)]:null;
const range=values=>({median:percentile(values,.5),min:Math.min(...values),max:Math.max(...values)});
async function main(){
  if(process.argv.includes('--invalid'))throw new Error('Invalid load option');
  const configText=readFileSync('evals/fixtures/load-workloads.json','utf8');const config=JSON.parse(configText);
  const base=resolve('evals/evidence/integrated');const directory=join(base,'load-runs',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(directory,{recursive:true});writeFileSync(join(directory,'frozen-workloads.json'),configText);
  const log=recorder(directory,'load');const certs=generateCerts(join(directory,'certs'));const fixture=await startFixture({directory,certs});fixture.certs=certs;const rows={'tenant-a':[],'tenant-b':[]};
  const measurements=[];
  try{
    for(let i=0;i<config.seedItems;i++){const tenant=i<32?'tenant-a':'tenant-b';const token=tenant==='tenant-a'?'fixture-token-a':'fixture-token-b';const r=await request(fixture,'/v1/items',{method:'POST',token,body:{name:`load-${i}`,quantity:100},headers:{'idempotency-key':`load-seed-${i}`}});assert(r.status===201,'load seed failed');rows[tenant].push(r.body.id);}
    for(let repeat=1;repeat<=config.repetitions;repeat++){
      for(let warm=0;warm<3;warm++)await request(fixture,'/health');
      for(const scenario of config.scenarios){
        Object.assign(fixture.controls,{costMs:scenario.costMs,dependencyDown:scenario.dependencyDown||false});const before=fixture.state();let inflight=0;let generated=0;let dropped=0;let maxInflight=0;let maxRss=process.memoryUsage().rss;const responses=[];const pending=[];const started=performance.now();const cpuBefore=process.cpuUsage();const eventLoop=monitorEventLoopDelay({resolution:10});eventLoop.enable();const memoryTimer=setInterval(()=>{maxRss=Math.max(maxRss,process.memoryUsage().rss);},10);
        await Promise.all(Array.from({length:scenario.arrivals},(_,index)=>new Promise(resolveArrival=>setTimeout(()=>{
          const scheduledMs=index*scenario.intervalMs;const actualMs=performance.now()-started;
          if(inflight>=config.generatorConcurrency){dropped++;log({kind:'generator-drop',repeat,scenario:scenario.name,index,scheduledMs,actualMs});resolveArrival();return;}
          generated++;inflight++;maxInflight=Math.max(maxInflight,inflight);const tenant=index%5===4?'tenant-b':'tenant-a';const token=tenant==='tenant-a'?'fixture-token-a':'fixture-token-b';const ids=rows[tenant];const path=index%4===0?'/v1/items?limit=3':`/v1/items/${ids[index%ids.length]}`;
          const task=request(fixture,path,{token,timeoutMs:1200}).then(response=>{responses.push(response);log({kind:'load-request',repeat,scenario:scenario.name,index,tenant,path,scheduledMs,actualMs,scheduleLagMs:actualMs-scheduledMs,status:response.status,error:response.error,latencyMs:response.latencyMs,problemType:response.body?.type});}).finally(()=>inflight--);pending.push(task);resolveArrival();
        },index*scenario.intervalMs))));
        await Promise.all(pending);clearInterval(memoryTimer);eventLoop.disable();const elapsedMs=performance.now()-started;const cpu=process.cpuUsage(cpuBefore);const after=fixture.state();const useful=responses.filter(x=>x.status>=200&&x.status<300).length;const timeouts=responses.filter(x=>x.status===0&&x.error==='CLIENT_TIMEOUT').length;const rejected=responses.filter(x=>x.status===429||x.status===503&&String(x.body?.type).match(/capacity|queue-timeout/)).length;const failed=generated-useful-timeouts-rejected;const latencies=responses.map(x=>x.latencyMs);
        const result={repeat,scenario:scenario.name,model:config.model,intendedArrivals:scenario.arrivals,generated,admitted:after.admitted-before.admitted,useful,timeouts,rejected,failed,retries:0,generatorDropped:dropped,elapsedMs,generatedPerSecond:generated*1000/elapsedMs,usefulPerSecond:useful*1000/elapsedMs,maxGeneratorInflight:maxInflight,latencyAllGeneratedMs:{samples:latencies.length,p50:percentile(latencies,.5),p95:percentile(latencies,.95),p99:percentile(latencies,.99),max:Math.max(...latencies)},cpuMicroseconds:cpu,maxRssBytes:maxRss,eventLoopDelayMs:{mean:eventLoop.mean/1e6,p99:eventLoop.percentile(99)/1e6,max:eventLoop.max/1e6},serverDelta:{received:after.received-before.received,cacheHits:after.cacheHits-before.cacheHits,errors:after.errors-before.errors},postState:after,status:'PASS'};
        assert(scenario.arrivals===generated+dropped,'arrival accounting mismatch');assert(generated===useful+timeouts+rejected+failed,'outcome accounting mismatch');assert(after.active===0&&after.queued===0,'work leaked after scenario');assert(maxInflight<=config.generatorConcurrency,'generator bound exceeded');measurements.push(result);log({kind:'measurement',...result});
      }
    }
    Object.assign(fixture.controls,{costMs:0,dependencyDown:false});const aggregates=config.scenarios.map(scenario=>{const runs=measurements.filter(x=>x.scenario===scenario.name);return {scenario:scenario.name,runs:runs.length,usefulPerSecond:range(runs.map(x=>x.usefulPerSecond)),allGeneratedP95Ms:range(runs.map(x=>x.latencyAllGeneratedMs.p95)),allGeneratedP99Ms:range(runs.map(x=>x.latencyAllGeneratedMs.p99)),generated:runs.reduce((a,r)=>a+r.generated,0),useful:runs.reduce((a,r)=>a+r.useful,0),rejected:runs.reduce((a,r)=>a+r.rejected,0),failed:runs.reduce((a,r)=>a+r.failed,0),generatorDropped:runs.reduce((a,r)=>a+r.generatorDropped,0)};});
    const metadata={status:'PASS',recordedAt:new Date().toISOString(),runDirectory:directory,machine:machine(),source:sourceHash(),openssl:certs.openssl,sqlite:fixture.db.prepare('select sqlite_version() version').get().version,configuration:config,configurationHash:createHash('sha256').update(configText).digest('hex'),bounds:BOUNDS,payload:{requestBodyBytes:0,seedBodyExampleBytes:Buffer.byteLength(JSON.stringify({name:'load-00',quantity:100})),resultRowsPerList:3},cardinality:fixture.db.prepare('SELECT tenant,count(*) n FROM items GROUP BY tenant').all(),queryPlan:fixture.db.prepare('EXPLAIN QUERY PLAN SELECT * FROM items WHERE tenant=? AND id>? ORDER BY id LIMIT ?').all('tenant-a','',4),measurements,aggregates,limits:['Loopback experiment, single process SQLite sync connection and co-resident generator; no production or multi-replica capacity inference.','All generated response latency samples include rejections, dependency failures and client timeouts. Dropped demand has no response latency and is separately counted.','Generator creates fresh TLS connections (agent:false); TLS CPU and local runtime are part of measurements. No automatic retries.','SQLite query rows examined, physical I/O, lock wait, OS FD/NAT exhaustion and cold filesystem cache are UNVERIFIED.','No optimization speedup claim; these are bounded workload observations only.']};
    writeFileSync(join(directory,'load-results.json'),JSON.stringify(metadata,null,2));writeFileSync(join(base,'load-results.json'),JSON.stringify(metadata,null,2));console.log(JSON.stringify({status:metadata.status,runs:measurements.length,generated:measurements.reduce((a,r)=>a+r.generated,0),intended:measurements.reduce((a,r)=>a+r.intendedArrivals,0),generatorDropped:measurements.reduce((a,r)=>a+r.generatorDropped,0)}));
  }finally{await fixture.stop();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
