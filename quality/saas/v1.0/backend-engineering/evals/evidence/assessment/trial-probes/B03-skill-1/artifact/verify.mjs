import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {SQL, bindings, listReady} from './query.mjs';
const db = new DatabaseSync(process.argv[2] ?? 'parcels.sqlite');
const checks = [];
const expected = [];
const hash = createHash('sha256');
try {
  let count=0, whale=0;
  for (const row of db.prepare('SELECT id,tenant,status,created_at,payload FROM parcels ORDER BY id').iterate()) {
    count++;
    const tenant=count<=48000?'whale':'tenant-'+(count%80);
    const status=count%37===0?'ready':'stored';
    assert.deepEqual({...row}, {id:count,tenant,status,created_at:Math.floor(count/4),payload:'x'.repeat(256)});
    if (tenant==='whale') whale++;
    if (status==='ready') expected.push({id:count,tenant,created_at:Math.floor(count/4)});
    hash.update(JSON.stringify(row)+'\n');
  }
  assert.equal(count,60000); assert.equal(whale,48000);
  checks.push({name:'unchanged full supplied dataset including payload/status/skew',status:'PASS',rows:count,whaleRows:whale,sha256:hash.digest('hex')});
  const tenants=['whale',...Array.from({length:80},(_,i)=>'tenant-'+i), 'missing', "' OR 1=1 --"];
  for (const tenant of tenants) for (const limit of [1,20,100]) {
    const oracle=expected.filter(r=>r.tenant===tenant).sort((a,b)=>b.created_at-a.created_at||b.id-a.id).slice(0,limit).map(({id,created_at})=>({id,created_at}));
    const rows=listReady(db,tenant,limit);
    assert.deepEqual(rows.map(r=>({...r})),oracle);
    assert.ok(rows.length<=limit);
    for(const row of rows) assert.deepEqual(Object.keys(row).sort(),['created_at','id']);
  }
  assert.deepEqual(listReady(db,'whale'),listReady(db,'whale',20));
  checks.push({name:'independent seeded oracle: all tenants, missing/injection-shaped tenant, limits 1/20/100 and projection',status:'PASS',combinations:tenants.length*3});
  for (const limit of [0,-1,101,1.5,NaN,Infinity,-Infinity,'20',null,{},[],true,2n]) {
    let prepared=false;
    assert.throws(()=>listReady({prepare(){prepared=true; throw Error('SQL called');}},'whale',limit),RangeError);
    assert.equal(prepared,false);
    assert.throws(()=>bindings('whale',limit),RangeError);
  }
  checks.push({name:'13 invalid limits rejected before SQL execution',status:'PASS'});
  db.exec('BEGIN');
  try {
    const add=db.prepare('INSERT INTO parcels VALUES(?,?,?,?,?)');
    add.run(60001,'tie-tenant','ready',999999,'sensitive payload');
    add.run(60002,'tie-tenant','ready',999999,'sensitive payload');
    add.run(60003,'other-tenant','ready',999999,'sensitive payload');
    add.run(60004,'tie-tenant','stored',1000000,'sensitive payload');
    assert.deepEqual(listReady(db,'tie-tenant',100).map(r=>({...r})),[{id:60002,created_at:999999},{id:60001,created_at:999999}]);
    assert.equal(listReady(db,'tie-tenant',1)[0].id,60002);
  } finally {db.exec('ROLLBACK');}
  checks.push({name:'same-timestamp descending id, status/tenant exclusion and limit; transient rows rolled back',status:'PASS'});
  assert.equal(db.prepare('SELECT count(*) n FROM parcels').get().n,60000);
  const integrity=db.prepare('PRAGMA integrity_check').all();
  assert.equal(integrity[0].integrity_check,'ok');
  checks.push({name:'real SQLite integrity and post-rollback cardinality',status:'PASS'});
  const plan=db.prepare('EXPLAIN QUERY PLAN '+SQL).all(...bindings('whale',100));
  assert.ok(plan.some(r=>r.detail.includes('COVERING INDEX parcels_ready_tenant_order')));
  assert.ok(!plan.some(r=>/TEMP B-TREE|SCAN parcels/.test(r.detail)));
  checks.push({name:'executed production SQL uses covering index without temp sort',status:'PASS',plan});
  console.log(JSON.stringify({checks,sqlite:db.prepare('SELECT sqlite_version() v').get().v},null,2));
} finally {db.close();}
