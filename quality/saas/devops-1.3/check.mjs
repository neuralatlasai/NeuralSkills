import fs from 'node:fs';
import path from 'node:path';
const [id,dir]=process.argv.slice(2),checks=[];
const check=(name,fn)=>{try{if(!fn())throw Error('Invariant not satisfied');checks.push({name,status:'PASS'});}catch(e){checks.push({name,status:'FAIL',reason:e.message});}};
const read=n=>JSON.parse(fs.readFileSync(path.resolve(dir,n),'utf8').replace(/^\uFEFF/,''));
const cpu=x=>typeof x==='string'&&x.endsWith('m')?Number(x.slice(0,-1)):Number(x)*1000;
const bytes=x=>{const m=/^(\d+(?:\.\d+)?)(Ki|Mi|Gi)?$/.exec(String(x));return m?Number(m[1])*({Ki:1024,Mi:1048576,Gi:1073741824}[m[2]]??1):NaN;};
const integer=x=>Number.isSafeInteger(x)&&x>=0;
check('Invocation',()=>['D01','D02'].includes(id)&&typeof dir==='string');
if(checks[0].status==='PASS'){
 check('Artifact parses',()=>{read(id==='D01'?'runtime.json':'decision.json');return true;});
 if(checks.at(-1).status==='PASS'&&id==='D01'){
  const b=read('runtime.json'),items=b.items??[],d=items.find(x=>x.kind==='Deployment'),h=items.find(x=>x.kind==='HorizontalPodAutoscaler'),p=items.find(x=>x.kind==='PodDisruptionBudget');
  const s=d?.spec, pod=s?.template?.spec,c=pod?.containers?.[0],min=h?.spec?.minReplicas,max=h?.spec?.maxReplicas;
  check('Kinds and target',()=>b.kind==='List'&&d?.metadata?.name==='orders'&&h?.spec?.scaleTargetRef?.name==='orders'&&p);
  check('Failure capacity',()=>integer(min)&&integer(s?.replicas)&&Math.min(min,s.replicas)>0&&(Math.min(min,s.replicas)-1)*50>=90&&max===6);
  check('Rollout capacity',()=>s?.strategy?.type==='RollingUpdate'&&s.strategy.rollingUpdate.maxUnavailable===0&&s.strategy.rollingUpdate.maxSurge===1);
  check('Connection envelope',()=>{const pool=Number(c?.env?.find(x=>x.name==='DB_POOL_MAX')?.value);return integer(pool)&&pool>0&&(6+1+1)*pool+4+2<=40;});
  check('Probe semantics',()=>c?.livenessProbe?.httpGet?.path==='/live'&&c?.readinessProbe?.httpGet?.path==='/ready'&&c?.startupProbe?.httpGet?.path==='/started');
  check('Startup and drain windows',()=>c?.startupProbe?.periodSeconds*c?.startupProbe?.failureThreshold>=120&&pod?.terminationGracePeriodSeconds>=25);
  check('Resource bounds',()=>cpu(c?.resources?.requests?.cpu)>=250&&cpu(c?.resources?.limits?.cpu)>=cpu(c?.resources?.requests?.cpu)&&bytes(c?.resources?.requests?.memory)>=96*1048576&&bytes(c?.resources?.limits?.memory)>=128*1048576&&bytes(c?.resources?.limits?.memory)<=256*1048576&&bytes(c?.resources?.limits?.memory)>=bytes(c?.resources?.requests?.memory)&&bytes(c?.resources?.limits?.['ephemeral-storage'])>0);
  check('Privilege bounds',()=>pod?.automountServiceAccountToken===false&&(pod?.securityContext?.runAsNonRoot===true||c?.securityContext?.runAsNonRoot===true)&&c?.securityContext?.readOnlyRootFilesystem===true&&c?.securityContext?.allowPrivilegeEscalation===false&&c?.securityContext?.capabilities?.drop?.includes('ALL'));
  check('Eviction capacity and selectors',()=>p?.spec?.minAvailable>=2&&p?.spec?.minAvailable<=min-1&&p?.spec?.selector?.matchLabels?.app==='orders'&&s?.selector?.matchLabels?.app==='orders'&&s?.template?.metadata?.labels?.app==='orders');
  check('Image preserved',()=>c?.image==='ghcr.io/example/fixture@sha256:'+ '1'.repeat(64));
 }
 if(checks.at(1)?.status==='PASS'&&id==='D02'){
  const b=read('decision.json'),c=b.capacity;
  check('Input counts preserved',()=>c?.activeMax===6&&c?.surge===2&&c?.terminating===1&&c?.workers===4&&c?.maintenance===2&&c?.allocated===40);
  check('Connection arithmetic',()=>integer(c?.poolPerProcess)&&c.poolPerProcess>0&&c.totalConnections===(c.activeMax+c.surge+c.terminating)*c.poolPerProcess+c.workers+c.maintenance&&c.totalConnections<=c.allocated);
  check('Admission independent',()=>b.admission?.hardBoundary===true&&b.admission?.mechanism?.length>15);
  check('KV authority rejected',()=>b.state?.kvAuthoritativeForImmediateRevocation===false&&b.state?.kvAuthoritativeForInventory===false&&b.state?.authority?.length>10&&b.state?.writeOwnership?.length>10);
  check('Recovery claims bounded',()=>b.recovery?.targetRtoSeconds===900&&b.recovery?.targetRpoSeconds===60&&b.recovery?.measuredRtoSeconds===null&&b.recovery?.measuredRpoSeconds===null);
  check('Decision evidence complete',()=>b.checks?.length>=3&&b.checks.every(x=>['requirement','mechanism','limit','failure','verification'].every(k=>typeof x[k]==='string'&&x[k].length>0)&&['PASS','FAIL','UNVERIFIED','NOT_APPLICABLE'].includes(x.status)));
 }
}
const result={case:id??null,status:checks.some(x=>x.status==='FAIL')?'FAIL':'PASS',checks,scope:'Bounded artifact invariants; not API admission, live infrastructure or qualitative correctness'};
console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='PASS'?0:1;
