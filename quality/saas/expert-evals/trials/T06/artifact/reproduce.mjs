import {init,enqueue,claim,complete,readJobs} from './service.ts';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const path=join(mkdtempSync(join(tmpdir(),'lease-repro-')),'queue.db');
init(path); enqueue(path,{id:'job',payload:'payload',dueAt:0});
const [a,b]=await Promise.all([claim(path,{now:0,worker:'a',leaseMs:10}),claim(path,{now:0,worker:'b',leaseMs:10})]);
console.log(JSON.stringify({symptom:'simultaneous claims',a,b,state:readJobs(path)}));
const fresh=await claim(path,{now:10,worker:'new',leaseMs:10});
const staleCompleted=complete(path,a,'STALE',{now:11});
console.log(JSON.stringify({symptom:'old owner overwrites after reclaim',fresh,staleCompleted,state:readJobs(path)}));
try {const invalid=await claim(path,{now:20,worker:'bad',leaseMs:0}); console.log(JSON.stringify({invalidLeaseAccepted:true,invalid}));} catch(e){console.log(JSON.stringify({invalidLeaseRejected:String(e)}));}
console.log(JSON.stringify({node:process.version,sqlite:(await import('node:sqlite')).DatabaseSync? 'native node:sqlite':'missing'}));
