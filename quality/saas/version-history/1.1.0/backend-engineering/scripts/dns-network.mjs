import dgram from 'node:dgram';
import { Resolver } from 'node:dns/promises';
import http from 'node:http';
import net from 'node:net';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { assert, machine, recorder, sourceHash } from './evidence.mjs';

const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const listen=(server,host,port=0)=>new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,host,()=>ok(server.address().port));});
const stop=server=>new Promise(done=>server.close(done));
async function main(){
  if(process.argv.includes('--invalid'))throw new Error('Invalid DNS/network option');
  const base=resolve('evals/evidence/integrated');const directory=join(base,'network-runs',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(directory,{recursive:true});
  const schedule={positiveDnsTtlSeconds:1,applicationPositiveCacheCapMs:500,applicationNegativeCacheMs:80,resolverTimeoutMs:120,resolverTries:1,httpDeadlineMs:150,churnRequests:50,sequence:['NXDOMAIN and negative cache','initial A endpoint and explicit cache refresh','close endpoint A and change DNS to B','stale cached address fails','refresh after510ms discovers B','DNS timeout','slow response deadline','50 fresh TCP connections and cleanup']};writeFileSync(join(directory,'frozen-fault-schedule.json'),JSON.stringify(schedule,null,2));const log=recorder(directory,'network');
  let address='127.0.0.1',dropDns=false,queries=0;const udp=dgram.createSocket('udp4');
  udp.on('message',(query,remote)=>{
    queries++;if(dropDns)return;
    let offset=12;const labels=[];while(query[offset]){const length=query[offset++];labels.push(query.subarray(offset,offset+length).toString());offset+=length;}offset+=5;const name=labels.join('.');
    const exists=name==='inventory.fixture.test';const header=Buffer.alloc(12);query.copy(header,0,0,2);header.writeUInt16BE(exists?0x8180:0x8183,2);header.writeUInt16BE(1,4);header.writeUInt16BE(exists?1:0,6);
    const question=query.subarray(12,offset);let answer=Buffer.alloc(0);if(exists){answer=Buffer.alloc(16);answer.writeUInt16BE(0xc00c,0);answer.writeUInt16BE(1,2);answer.writeUInt16BE(1,4);answer.writeUInt32BE(schedule.positiveDnsTtlSeconds,6);answer.writeUInt16BE(4,10);address.split('.').forEach((part,i)=>answer[12+i]=Number(part));}
    udp.send(Buffer.concat([header,question,answer]),remote.port,remote.address);
  });
  await new Promise((ok,fail)=>{udp.once('error',fail);udp.bind(0,'127.0.0.1',ok);});
  const resolver=new Resolver({timeout:schedule.resolverTimeoutMs,tries:schedule.resolverTries});resolver.setServers([`127.0.0.1:${udp.address().port}`]);const cache=new Map();
  async function discover(name){const cached=cache.get(name);if(cached&&cached.expires>performance.now()){if(cached.error)throw Object.assign(new Error('Negative application DNS cache'),{code:cached.error});return cached.address;}
    try{const records=await resolver.resolve4(name,{ttl:true});cache.set(name,{address:records[0].address,expires:performance.now()+Math.min(records[0].ttl*1000,schedule.applicationPositiveCacheCapMs)});return records[0].address;}catch(error){cache.set(name,{error:error.code,expires:performance.now()+schedule.applicationNegativeCacheMs});throw error;}}
  const sockets=new Set();let maxSockets=0;const makeServer=label=>{const server=http.createServer((req,res)=>{if(req.url==='/slow'){setTimeout(()=>{if(!res.destroyed)res.end(label);},300);}else res.end(label);});server.on('connection',socket=>{sockets.add(socket);maxSockets=Math.max(maxSockets,sockets.size);socket.on('close',()=>sockets.delete(socket));});server.keepAliveTimeout=50;return server;};
  const serverA=makeServer('A'),serverB=makeServer('B');const port=await listen(serverA,'127.0.0.1');await listen(serverB,'127.0.0.2',port);
  async function get(path='/'){const start=performance.now();let peer;try{peer=await discover('inventory.fixture.test');}catch(error){return {status:0,error:error.code,latencyMs:performance.now()-start};}
    return new Promise(done=>{const req=http.get({host:peer,port,path,agent:false},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>done({status:res.statusCode,body:Buffer.concat(chunks).toString(),peer,latencyMs:performance.now()-start}));});req.setTimeout(schedule.httpDeadlineMs,()=>req.destroy(Object.assign(new Error('Read deadline'),{code:'READ_TIMEOUT'})));req.on('error',error=>done({status:0,error:error.code,peer,latencyMs:performance.now()-start}));});}
  let aClosed=false;
  try{
    let resolutionFailure='';try{await discover('absent.fixture.test');}catch(error){resolutionFailure=error.code;}assert(resolutionFailure==='ENOTFOUND','NXDOMAIN not rejected');const afterFirst=queries;try{await discover('absent.fixture.test');}catch{}assert(queries===afterFirst,'negative application cache not used');await sleep(90);try{await discover('absent.fixture.test');}catch{}assert(queries>afterFirst,'negative cache never refreshed');log({kind:'dns-failure',resolutionFailure,queries});
    const initial=await get();assert(initial.status===200&&initial.body==='A','initial endpoint did not route');log({kind:'initial-endpoint',...initial});
    cache.delete('inventory.fixture.test');await discover('inventory.fixture.test');const switched=performance.now();await stop(serverA);aClosed=true;address='127.0.0.2';const stale=await get();log({kind:'stale-endpoint',...stale});assert(stale.status===0&&stale.peer==='127.0.0.1','stale cached endpoint failure not observed');await sleep(510);const replacement=await get();const discoveryToUseMs=performance.now()-switched;log({kind:'replacement-endpoint',discoveryToUseMs,...replacement});assert(replacement.status===200&&replacement.body==='B','replacement endpoint was not discovered');
    cache.delete('inventory.fixture.test');dropDns=true;const dnsTimeout=await get();dropDns=false;cache.delete('inventory.fixture.test');log({kind:'dns-timeout',...dnsTimeout});assert(dnsTimeout.status===0&&dnsTimeout.error==='ETIMEOUT','DNS timeout not bounded');
    const slow=await get('/slow');log({kind:'slow-peer',...slow});assert(slow.status===0&&slow.error==='READ_TIMEOUT','read deadline not enforced');
    for(let i=0;i<schedule.churnRequests;i++){const response=await get();log({kind:'churn',index:i,...response});assert(response.status===200,'TCP churn request failed');}
    await sleep(50);assert(sockets.size===0,'TCP sockets leaked after churn');const results={status:'PASS',recordedAt:new Date().toISOString(),machine:machine(),source:sourceHash(),runDirectory:directory,schedule,resolutionFailure,negativeCache:{dnsQueriesFirst:afterFirst,refreshed:true,policy:'Application configured negative-cache80ms; NXDOMAIN response has no SOA, so no RFC2308 resolver negative caching claim'},staleEndpoint:stale,replacement,discoveryToUseMs,dnsTimeout,slowPeer:slow,churn:{requests:schedule.churnRequests,activeSocketsAfter:sockets.size,maxActiveSockets:maxSockets},limits:['Controlled authoritative UDP DNS server and Node dns.Resolver on loopback; no public/recursive DNS resolver, DNSSEC or production routing claim.','IPv4 loopback only. QUIC/IPv6, NAT pressure, OS descriptor exhaustion and half-open blackhole simulation are UNVERIFIED.','HTTP timeout covers a slow responding peer; stale closed listener establishes refused-connect behavior.']};writeFileSync(join(directory,'network-results.json'),JSON.stringify(results,null,2));writeFileSync(join(base,'network-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({status:'PASS',discoveryToUseMs,churnRequests:schedule.churnRequests,activeSocketsAfter:sockets.size}));
  }finally{resolver.cancel();udp.close();if(!aClosed)await stop(serverA);for(const socket of sockets)socket.destroy();await stop(serverB);}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
