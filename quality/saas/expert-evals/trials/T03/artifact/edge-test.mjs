import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {init,reserve,readState} from './service.ts';
const dir=fileURLToPath(new URL('./evidence/',import.meta.url));mkdirSync(dir,{recursive:true});
const c={tenant:'red',key:'edge',sku:'widget',qty:6};
const p=join(dir,`edges-${process.pid}.sqlite`);init(p);
await assert.rejects(reserve(p,c,{failBeforeCommit:true}));assert.equal(readState(p).receipts.length,0);
await assert.rejects(reserve(p,c,{failAfterCommit:true}));assert.deepEqual(await reserve(p,c),{status:'sold_out'});assert.equal(readState(p).receipts.length,1);assert.equal(readState(p).events.length,0);
const absent=join(dir,`invalid-${process.pid}.sqlite`);await assert.rejects(reserve(absent,{...c,qty:0}));assert.equal(existsSync(absent),false);
assert.deepEqual(await reserve(p,{...c,key:'missing',sku:'absent',qty:1}),{status:'sold_out'});
const accepted=await reserve(p,{...c,key:'ok',qty:1});assert.equal(accepted.status,'reserved');
const before=readState(p);const db=new DatabaseSync(p);try {db.exec('PRAGMA foreign_keys=ON');assert.throws(()=>db.prepare('INSERT INTO events(tenant,operation,key,reservationId) VALUES(?,?,?,?)').run('blue','reserve','ok',accepted.reservationId));assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');}finally {db.close()}
assert.deepEqual(readState(p),before);console.log('PASS extra edge checks: sold_out fault boundaries, validation before open, missing SKU, cross-tenant event FK and integrity_check');
