import {parentPort,workerData} from 'node:worker_threads';
import {reserve} from './service.ts';
const gate=new Int32Array(workerData.gate);parentPort.postMessage({ready:true});Atomics.wait(gate,0,0);
try{parentPort.postMessage({result:await reserve(workerData.path,workerData.command)});}catch(error){parentPort.postMessage({error:{message:error.message,code:error.code}});}
