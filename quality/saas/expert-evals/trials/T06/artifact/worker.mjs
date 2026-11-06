import {claim,complete,readJobs} from './service.ts';
import {isMainThread,parentPort,workerData} from 'node:worker_threads';
if(!isMainThread){
  parentPort.once('message',async()=>{try{parentPort.postMessage({value:await claim(workerData.path,workerData.options)});}catch(e){parentPort.postMessage({error:String(e)});}});
  parentPort.postMessage({ready:true});
}else{
  const [action,path,encoded]=process.argv.slice(2); const data=JSON.parse(encoded||'{}');
  const value=action==='claim'?await claim(path,data):action==='complete'?complete(path,data.claim,data.result,data.options):readJobs(path);
  console.log(JSON.stringify(value));
}
