import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import os from 'node:os';

export function sourceHash(root=resolve('.')) {
  const paths=['package.json',...readdirSync(join(root,'scripts')).filter(x=>x.endsWith('.mjs')).map(x=>`scripts/${x}`),...readdirSync(join(root,'evals/fixtures')).filter(x=>/\.(mjs|ts|json)$/.test(x)).map(x=>`evals/fixtures/${x}`)].sort();
  const hash=createHash('sha256');for(const path of paths)hash.update(path).update(readFileSync(join(root,path)));return {sha256:hash.digest('hex'),files:paths};
}
export function recorder(directory,name){mkdirSync(directory,{recursive:true});const raw=join(directory,`${name}.raw.jsonl`);writeFileSync(raw,'');return event=>appendFileSync(raw,JSON.stringify({...event,recordedAt:new Date().toISOString()})+'\n');}
export function machine(){return {runtime:process.version,platform:process.platform,architecture:process.arch,osRelease:os.release(),cpu:os.cpus()[0]?.model,cpuLogicalCount:os.cpus().length,totalMemoryBytes:os.totalmem(),network:'127.0.0.1 TCP and native TLS only',runtimeDependencies:'Node built-ins; node:sqlite is experimental in this runtime'};}
export function assert(condition,message){if(!condition)throw new Error(message);}
