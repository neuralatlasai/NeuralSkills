import http from 'node:http';
import https from 'node:https';
import { DatabaseSync, backup } from 'node:sqlite';
import { randomUUID, randomBytes, createHash, createHmac, timingSafeEqual, X509Certificate } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCerts } from './cert-gen.mjs';

export const BOUNDS = Object.freeze({ bodyBytes: 2048, active: 2, queued: 4, queueAgeMs: 90, requestDeadlineMs: 180, cacheEntries: 8, telemetryEntries: 16, ingressConnections:32, applicationConnections:32, headerBytes:8192, streamHighWaterBytes:2048, handshakeDeadlineMs:500 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const digest = value => createHash('sha256').update(value).digest('hex');
const stable = object => JSON.stringify(Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b))));
export class Fault extends Error { constructor(status, detail, code = 'request-rejected') { super(detail); this.status = status; this.code = code; } }
function listen(server) { return new Promise((ok, fail) => { server.once('error', fail); server.listen({port:0,host:'127.0.0.1',backlog:32}, () => ok(server.address().port)); }); }
function close(server) { return new Promise(resolveClose => server.close(resolveClose)); }
function migrate(db) {
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=100;
    CREATE TABLE IF NOT EXISTS schema_meta(version INTEGER NOT NULL);
    INSERT INTO schema_meta SELECT 1 WHERE NOT EXISTS(SELECT 1 FROM schema_meta);
    CREATE TABLE IF NOT EXISTS credentials(token_hash TEXT PRIMARY KEY, tenant TEXT NOT NULL, subject TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('editor','limited','admin')), active INTEGER NOT NULL CHECK(active IN (0,1)));
    CREATE TABLE IF NOT EXISTS items(tenant TEXT NOT NULL, id TEXT NOT NULL, owner TEXT NOT NULL, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 0 AND 100000), version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1), PRIMARY KEY(tenant,id));
    CREATE INDEX IF NOT EXISTS items_owner ON items(tenant,owner,id);
    CREATE TABLE IF NOT EXISTS idempotency(tenant TEXT NOT NULL, key TEXT NOT NULL, actor TEXT NOT NULL, params_hash TEXT NOT NULL, status INTEGER NOT NULL, response TEXT NOT NULL, PRIMARY KEY(tenant,key));
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, item_id TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('pending','acked')), attempts INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(tenant,item_id) REFERENCES items(tenant,id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS effects(job_id TEXT PRIMARY KEY, tenant TEXT NOT NULL, effect TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deletions(tenant TEXT NOT NULL, item_id TEXT NOT NULL, deleted_at TEXT NOT NULL, PRIMARY KEY(tenant,item_id));`);
  const columns = db.prepare('PRAGMA table_info(items)').all();
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!columns.some(column => column.name === 'description')) db.exec("ALTER TABLE items ADD COLUMN description TEXT NOT NULL DEFAULT ''");
    const invalid=db.prepare("SELECT count(*) n FROM items WHERE typeof(quantity)<>'integer' OR quantity NOT BETWEEN 0 AND 100000 OR typeof(version)<>'integer' OR version NOT BETWEEN 1 AND 9007199254740991").get().n;
    if(invalid)throw new Error('Schema v3 migration refused existing inventory outside the integer domain');
    db.exec(`CREATE TRIGGER IF NOT EXISTS items_v3_integer_insert BEFORE INSERT ON items
      WHEN typeof(NEW.quantity)<>'integer' OR NEW.quantity NOT BETWEEN 0 AND 100000 OR typeof(NEW.version)<>'integer' OR NEW.version NOT BETWEEN 1 AND 9007199254740991
      BEGIN SELECT RAISE(ABORT,'inventory integer-domain constraint'); END;
      CREATE TRIGGER IF NOT EXISTS items_v3_integer_update BEFORE UPDATE ON items
      WHEN typeof(NEW.quantity)<>'integer' OR NEW.quantity NOT BETWEEN 0 AND 100000 OR typeof(NEW.version)<>'integer' OR NEW.version NOT BETWEEN 1 AND 9007199254740991
      BEGIN SELECT RAISE(ABORT,'inventory integer-domain constraint'); END;
      UPDATE schema_meta SET version=3; COMMIT;`);
  } catch(error) { db.exec('ROLLBACK');throw error; }
}

class Gate {
  constructor() { this.active = 0; this.queue = []; this.rejected = 0; this.highWater = 0; }
  async enter() {
    if (this.active < BOUNDS.active) { this.active++; return; }
    if (this.queue.length >= BOUNDS.queued) { this.rejected++; throw new Fault(503, 'Application admission queue is full', 'capacity'); }
    await new Promise((ok, fail) => {
      const entry = { ok, fail, timer: null };
      entry.timer = setTimeout(() => { this.queue = this.queue.filter(x => x !== entry); this.rejected++; fail(new Fault(503, 'Application queue age exceeded', 'queue-timeout')); }, BOUNDS.queueAgeMs);
      this.queue.push(entry); this.highWater = Math.max(this.highWater, this.queue.length);
    });
  }
  leave() {
    const next = this.queue.shift();
    if (next) { clearTimeout(next.timer); next.ok(); } else this.active--;
  }
}
async function body(req) {
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') throw new Fault(415, 'Compressed request bodies are unsupported');
  if (!/^application\/json(?:\s*;.*)?$/i.test(String(req.headers['content-type'] || ''))) throw new Fault(415, 'Use application/json');
  if (Number(req.headers['content-length'] || 0) > BOUNDS.bodyBytes) { req.resume(); throw new Fault(413, 'Request body exceeds byte limit'); }
  const chunks = []; let size = 0;
  const timer = setTimeout(() => req.emit('error', new Fault(408, 'Body deadline exceeded', 'request-timeout')), Math.max(1,req.fixtureDeadline-performance.now()));
  try {
    for await (const chunk of req) { size += chunk.length; if (size > BOUNDS.bodyBytes) throw new Fault(413, 'Request body exceeds byte limit'); chunks.push(chunk); }
    let value;
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Fault(400, 'Malformed JSON'); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Fault(422, 'JSON body must be an object');
    const stack = [{value,depth:1}]; while(stack.length){const entry=stack.pop(); if(entry.depth>4)throw new Fault(422,'JSON nesting exceeds depth limit4');if(entry.value&&typeof entry.value==='object')for(const child of Object.values(entry.value))if(child&&typeof child==='object')stack.push({value:child,depth:entry.depth+1});}
    return value;
  } finally { clearTimeout(timer); }
}
function fields(input, required, allowed, actor) {
  for (const key of Object.keys(input)) {
    if (['tenant', 'version', 'id'].includes(key)) throw new Fault(403, `Field ${key} is server controlled`, 'field-authorization');
    if (key === 'owner' && actor.role !== 'admin') throw new Fault(403, 'Changing owner requires administrator role', 'field-authorization');
    if (!allowed.includes(key)) throw new Fault(422, `Unknown field ${key}`);
  }
  for (const key of required) if (!(key in input)) throw new Fault(422, `Missing field ${key}`);
  if ('name' in input && (typeof input.name !== 'string' || input.name.length < 1 || input.name.length > 80)) throw new Fault(422, 'name length must be 1..80');
  if ('quantity' in input && (!Number.isSafeInteger(input.quantity) || input.quantity < 0 || input.quantity > 100000)) throw new Fault(422, 'quantity must be an integer in 0..100000');
  if ('owner' in input && (typeof input.owner !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(input.owner))) throw new Fault(422, 'Invalid owner');
  if ('description' in input && (typeof input.description !== 'string' || input.description.length > 200)) throw new Fault(422, 'description length must be 0..200');
}

export async function startFixture({ directory, certs, databasePath, controls: initialControls = {} } = {}) {
  if (!directory || !certs) throw new Error('directory and certs are required');
  mkdirSync(directory, { recursive: true });
  const dbPath = databasePath || join(directory, 'fixture.sqlite');
  const db = new DatabaseSync(dbPath); try { migrate(db); } catch(error) { db.close();throw error; }
  const credential = db.prepare('INSERT OR REPLACE INTO credentials VALUES(?,?,?,?,1)');
  const seedCredential = db.prepare('INSERT OR IGNORE INTO credentials VALUES(?,?,?,?,1)');
  seedCredential.run(digest('fixture-token-a'), 'tenant-a', 'alice', 'editor');
  seedCredential.run(digest('fixture-token-b'), 'tenant-b', 'bob', 'editor');
  seedCredential.run(digest('fixture-token-limited'), 'tenant-a', 'limited', 'limited');
  seedCredential.run(digest('fixture-token-admin'), 'tenant-a', 'admin', 'admin');
  const controls = { costMs: 0, dependencyDown: false, cacheDown: false, telemetryDown: false, loseResponse: false, ...initialControls };
  const secret = randomBytes(32); const internalSecret = randomBytes(24).toString('hex');
  const gate = new Gate(); const cache = new Map(); const telemetry = []; let telemetryDropped = 0; let draining = false;
  const metrics = { received: 0, admitted: 0, useful: 0, errors: 0, cacheHits: 0, cacheBypass: 0, transportLost: 0 };
  function emit(event) {
    if (telemetry.length >= BOUNDS.telemetryEntries) { telemetry.shift(); telemetryDropped++; }
    telemetry.push(event);
    if (!controls.telemetryDown) telemetry.length = 0;
  }
  function invalidate(tenant) { for (const key of cache.keys()) if (key.startsWith(`${tenant}:`)) cache.delete(key); }
  function transaction(action) { db.exec('BEGIN IMMEDIATE'); try { const result = action(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } }
  function authenticate(req) {
    const match=/^Bearer[ \t]+([A-Za-z0-9._~-]+)$/i.exec(String(req.headers.authorization||''));
    if(!match)throw new Fault(401,'A Bearer fixture credential is required','authentication');
    const actor=db.prepare('SELECT tenant,subject,role FROM credentials WHERE token_hash=? AND active=1').get(digest(match[1]));
    if(!actor)throw new Fault(401,'Valid fixture bearer credential required','authentication');
    return actor;
  }
  function authorizedTransaction(req,action) {
    return transaction(()=>{ const actor=authenticate(req);return {...action(actor),tenant:actor.tenant}; });
  }
  function redactDeletedRepresentations(tenant,id) {
    // Keep logical-operation identity while discarding the historical resource fields.
    db.prepare("UPDATE idempotency SET response=? WHERE tenant=? AND json_extract(response,'$.id')=?").run(JSON.stringify({id,deleted:true}),tenant,id);
  }
  function find(actor, id) {
    const row = db.prepare('SELECT * FROM items WHERE tenant=? AND id=?').get(actor.tenant, id);
    if (!row) throw new Fault(404, 'Resource not found', 'not-found');
    if (actor.role === 'limited' && row.owner !== actor.subject) throw new Fault(403, 'Resource is outside caller object scope', 'object-authorization');
    return row;
  }
  function version(req) {
    const value = String(req.headers['if-match'] || '');
    if (!/^[1-9][0-9]{0,15}$/.test(value)||!Number.isSafeInteger(Number(value))) throw new Fault(428, 'A safe positive integer If-Match resource version is required');
    return Number(value);
  }
  function idem(req, input, validate, action) {
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(key)) throw new Fault(400, 'Idempotency-Key of 1..64 safe characters is required');
    const hash = digest(`${req.method}\n${new URL(req.url, 'http://app').pathname}\n${stable(input)}`);
    return authorizedTransaction(req,actor => {
      validate(actor);
      const prior = db.prepare('SELECT * FROM idempotency WHERE tenant=? AND key=?').get(actor.tenant, key);
      if (prior) {
        if (prior.params_hash !== hash || prior.actor !== actor.subject) throw new Fault(409, 'Idempotency key was used with different parameters or caller', 'idempotency-conflict');
        const stored=JSON.parse(prior.response);
        if(stored.deleted)throw new Fault(410,'The committed operation resource has been deleted','operation-resource-deleted');
        let current;
        try { current=find(actor,stored.id); } catch(error) {
          if(error instanceof Fault&&error.status===404)throw new Fault(410,'The committed operation resource has been deleted','operation-resource-deleted');
          throw error;
        }
        // Replays preserve the logical effect but project only currently authorized state.
        return { status: prior.status, value: current, replay: true };
      }
      const result = action(actor);
      db.prepare('INSERT INTO idempotency VALUES(?,?,?,?,?,?)').run(actor.tenant, key, actor.subject, hash, result.status, JSON.stringify(result.value));
      return result;
    });
  }
  function cursorEncode(value) { const text = Buffer.from(JSON.stringify(value)).toString('base64url'); return `${text}.${createHmac('sha256', secret).update(text).digest('base64url')}`; }
  function cursorDecode(raw, actor) {
    try {
      if(typeof raw!=='string'||raw.length>1024)throw new Error();
      const parts=raw.split('.');if(parts.length!==2||parts.some(part=>!/^[A-Za-z0-9_-]+$/.test(part)))throw new Error();
      const [text, signature] = parts;
      if(Buffer.from(text,'base64url').toString('base64url')!==text||Buffer.from(signature,'base64url').toString('base64url')!==signature)throw new Error();
      const actual = createHmac('sha256', secret).update(text).digest(); const supplied = Buffer.from(signature, 'base64url');
      if (actual.length !== supplied.length || !timingSafeEqual(actual, supplied)) throw new Error();
      const value = JSON.parse(Buffer.from(text, 'base64url').toString());
      if (!value||Object.keys(value).sort().join(',')!=='id,role,subject,tenant'||value.tenant !== actor.tenant || value.subject !== actor.subject || value.role !== actor.role||typeof value.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.id)) throw new Error();
      return value.id;
    } catch { throw new Fault(400, 'Cursor is invalid for caller scope'); }
  }
  async function route(req, actor) {
    actor=authenticate(req);
    const url = new URL(req.url, 'http://app');
    if (url.pathname === '/health') return { status: 200, value: { ready: !draining, schema: db.prepare('SELECT version FROM schema_meta').get().version } };
    const jobMatch=/^\/v1\/jobs\/([a-f0-9-]{36})$/.exec(url.pathname);
    if(jobMatch&&req.method==='GET'){
      const job=db.prepare('SELECT * FROM jobs WHERE tenant=? AND id=?').get(actor.tenant,jobMatch[1]);if(!job)throw new Fault(404,'Job not found','not-found');find(actor,job.item_id);
      const effect=db.prepare('SELECT effect FROM effects WHERE tenant=? AND job_id=?').get(actor.tenant,job.id);return {status:200,value:{id:job.id,state:job.state,result:effect?.effect||null}};
    }
    const match = /^\/v1\/items(?:\/([a-f0-9-]{36}))?(\/adjust)?$/.exec(url.pathname);
    if (!match) throw new Fault(404, 'Route not found');
    const [, id, adjustment] = match;
    if (controls.dependencyDown) throw new Fault(503, 'Database dependency unavailable', 'dependency-unavailable');
    if (controls.costMs) { const remaining=Math.max(0,req.fixtureDeadline-performance.now());await sleep(Math.min(controls.costMs,remaining)); if (controls.costMs >= remaining) throw new Fault(504, 'Application deadline exceeded', 'request-timeout'); }
    actor=authenticate(req);
    if (req.method === 'POST' && !id) {
      const input = await body(req);
      const result = idem(req,input,current=>fields(input, ['name', 'quantity'], ['name', 'quantity', 'description', 'owner'], current),actor => {
        const itemId = randomUUID();
        db.prepare('INSERT INTO items(tenant,id,owner,name,quantity,version,description) VALUES(?,?,?,?,?,1,?)').run(actor.tenant, itemId, input.owner || actor.subject, input.name, input.quantity, input.description || '');
        const jobId = randomUUID(); db.prepare("INSERT INTO jobs(id,tenant,item_id,state) VALUES(?,?,?,'pending')").run(jobId, actor.tenant, itemId);
        return { status: 201, value: find(actor, itemId) };
      }); invalidate(result.tenant); return result;
    }
    if (req.method === 'GET' && !id) {
      for (const key of url.searchParams.keys()) if (!['limit','cursor'].includes(key)) throw new Fault(422, `Unsupported query parameter ${key}`);
      const limit = Number(url.searchParams.get('limit') || 3); if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Fault(422, 'limit must be 1..10');
      const after = url.searchParams.has('cursor') ? cursorDecode(url.searchParams.get('cursor'), actor) : '';
      const rows = actor.role === 'limited' ? db.prepare('SELECT * FROM items WHERE tenant=? AND owner=? AND id>? ORDER BY id LIMIT ?').all(actor.tenant, actor.subject, after, limit+1) : db.prepare('SELECT * FROM items WHERE tenant=? AND id>? ORDER BY id LIMIT ?').all(actor.tenant, after, limit+1);
      const items = rows.slice(0,limit); return { status: 200, value: { items, nextCursor: rows.length > limit ? cursorEncode({tenant:actor.tenant, subject:actor.subject, role:actor.role, id:items.at(-1).id}) : null } };
    }
    if (!id) throw new Fault(405, 'Method not allowed');
    if (req.method === 'GET' && !adjustment) {
      const row=find(actor,id);
      const key = `${actor.tenant}:${actor.subject}:${id}:${row.version}`;
      if (controls.cacheDown) metrics.cacheBypass++; else if (cache.has(key)) { metrics.cacheHits++; return {status:200,value:cache.get(key)}; }
      if (!controls.cacheDown) { if (cache.size >= BOUNDS.cacheEntries) cache.delete(cache.keys().next().value); cache.set(key,row); }
      return {status:200,value:row};
    }
    if (req.method === 'POST' && adjustment) {
      const input = await body(req);
      const expected = version(req);
      const result=idem(req,{...input,expected},actor=>{
        fields(input,['delta'],['delta'],actor);
        if (!Number.isSafeInteger(input.delta) || input.delta === 0 || Math.abs(input.delta)>100000) throw new Fault(422,'delta must be a nonzero bounded integer');
      },actor=>{
        find(actor,id);
        const change=db.prepare("UPDATE items SET quantity=quantity+?,version=version+1 WHERE tenant=? AND id=? AND version=? AND quantity+? BETWEEN 0 AND 100000 AND (?<>'limited' OR owner=?)").run(input.delta,actor.tenant,id,expected,input.delta,actor.role,actor.subject);
        if (change.changes!==1) throw new Fault(409,'Version conflict or inventory bound violation','write-conflict');
        return {status:200,value:find(actor,id)};
      }); invalidate(result.tenant); return result;
    }
    if (['PUT','PATCH'].includes(req.method) && !adjustment) {
      const input=await body(req);
      const result=authorizedTransaction(req,actor=>{
        const current=find(actor,id);
        fields(input,req.method==='PUT'?['name','quantity']:[],['name','quantity','description','owner'],actor);
        if (!Object.keys(input).length) throw new Fault(422,'At least one field is required');
        const expected=version(req); const replacement=req.method==='PUT'?{name:input.name,quantity:input.quantity,description:input.description||'',owner:input.owner||current.owner}:{...current,...input};
        const change=db.prepare("UPDATE items SET name=?,quantity=?,description=?,owner=?,version=version+1 WHERE tenant=? AND id=? AND version=? AND (?<>'limited' OR owner=?)").run(replacement.name,replacement.quantity,replacement.description,replacement.owner,actor.tenant,id,expected,actor.role,actor.subject);
        if(change.changes!==1) throw new Fault(409,'Resource version is stale','write-conflict');return {status:200,value:find(actor,id)};
      });invalidate(result.tenant);return result;
    }
    if(req.method==='DELETE'&&!adjustment){ const expected=version(req);const result=authorizedTransaction(req,actor=>{
      find(actor,id);
      if(db.prepare("DELETE FROM items WHERE tenant=? AND id=? AND version=? AND (?<>'limited' OR owner=?)").run(actor.tenant,id,expected,actor.role,actor.subject).changes!==1)throw new Fault(409,'Resource version is stale','write-conflict');
      db.prepare('INSERT OR REPLACE INTO deletions VALUES(?,?,?)').run(actor.tenant,id,new Date().toISOString());
      redactDeletedRepresentations(actor.tenant,id);return{status:204,value:null};
    });invalidate(result.tenant);return result;}
    throw new Fault(405,'Method not allowed');
  }
  const app = http.createServer({maxHeaderSize:BOUNDS.headerBytes,highWaterMark:BOUNDS.streamHighWaterBytes},async (req,res)=>{
    const started=performance.now();const traceId=randomUUID();req.fixtureDeadline=started+BOUNDS.requestDeadlineMs;let entered=false;metrics.received++;
    res.setHeader('x-trace-id',traceId);res.setHeader('cache-control','no-store');
    try{
      if(req.headers['x-ingress-secret']!==internalSecret||req.headers['x-forwarded-proto']!=='https')throw new Fault(400,'Request must pass the trusted local ingress');
      if(draining)throw new Fault(503,'Service is draining','draining');
      let actor=authenticate(req);
      await gate.enter();entered=true;metrics.admitted++;
      if(performance.now()>=req.fixtureDeadline)throw new Fault(504,'Application deadline exceeded','request-timeout');
      actor=authenticate(req);
      const result=await route(req,actor);metrics.useful++;
      if(controls.loseResponse&&req.method==='POST'){controls.loseResponse=false;metrics.transportLost++;req.socket.destroy();return;}
      res.statusCode=result.status;if(result.replay)res.setHeader('idempotency-replayed','true');
      if(result.value?.version)res.setHeader('etag',String(result.value.version));
      if(result.status===201&&result.value?.id)res.setHeader('location',`/v1/items/${result.value.id}`);
      res.setHeader('content-type','application/json');res.end(result.value===null?'':JSON.stringify(result.value));
      emit({traceId,status:result.status,tenant:result.tenant||actor.tenant,method:req.method,path:new URL(req.url,'http://app').pathname,durationMs:performance.now()-started});
    }catch(error){metrics.errors++;const status=error instanceof Fault?error.status:500;
      if(!res.destroyed){res.statusCode=status;res.setHeader('content-type','application/problem+json');res.end(JSON.stringify({type:`urn:fixture:problem:${error.code||'internal'}`,title:http.STATUS_CODES[status]||'Error',status,detail:status===500?'Internal error':error.message,instance:new URL(req.url,'http://app').pathname,traceId}));}
      emit({traceId,status,durationMs:performance.now()-started});
    }finally{if(entered)gate.leave();}
  });
  app.maxConnections=BOUNDS.applicationConnections;app.requestTimeout=BOUNDS.requestDeadlineMs+500;app.headersTimeout=500;app.keepAliveTimeout=100;
  const appPort=await listen(app);
  const ingress=https.createServer({...certs.server,minVersion:'TLSv1.2',ALPNProtocols:['http/1.1'],maxHeaderSize:BOUNDS.headerBytes,highWaterMark:BOUNDS.streamHighWaterBytes,handshakeTimeout:BOUNDS.handshakeDeadlineMs},(req,res)=>{
    const headers={...req.headers,host:`127.0.0.1:${appPort}`,'x-forwarded-for':req.socket.remoteAddress,'x-forwarded-proto':'https','x-forwarded-host':'localhost','x-ingress-secret':internalSecret};
    delete headers.forwarded;delete headers['x-original-url'];
    const upstream=http.request({host:'127.0.0.1',port:appPort,path:req.url,method:req.method,headers,agent:false,highWaterMark:BOUNDS.streamHighWaterBytes},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res);});
    upstream.on('error',()=>{if(!res.headersSent){res.writeHead(502,{'content-type':'application/problem+json'});res.end(JSON.stringify({type:'urn:fixture:problem:upstream-transport',title:'Bad Gateway',status:502,detail:'Upstream connection failed',instance:req.url,traceId:randomUUID()}));}else res.destroy();});
    req.on('error',()=>upstream.destroy());req.pipe(upstream);
  });
  ingress.maxConnections=BOUNDS.ingressConnections;ingress.requestTimeout=800;ingress.headersTimeout=500;ingress.keepAliveTimeout=100;
  const port=await listen(ingress);
  return {
    url:`https://localhost:${port}`,port,appPort,dbPath,db,controls,metrics,gate,
    state:()=>({active:gate.active,queued:gate.queue.length,queueHighWater:gate.highWater,rejected:gate.rejected,cacheEntries:cache.size,telemetryEntries:telemetry.length,telemetryDropped,...metrics}),
    certificateFingerprint:()=>new X509Certificate(certs.server.cert).fingerprint256,
    rotateCertificate:context=>ingress.setSecureContext(context),
    rotateCredential:(oldToken,newToken)=>transaction(()=>{const actor=db.prepare('SELECT * FROM credentials WHERE token_hash=? AND active=1').get(digest(oldToken));if(!actor)throw new Error('Old fixture credential is inactive');db.prepare('UPDATE credentials SET active=0 WHERE token_hash=?').run(digest(oldToken));credential.run(digest(newToken),actor.tenant,actor.subject,actor.role);}),
    backup:destination=>backup(db,destination),
    reconcileDeletion:(tenant,id)=>transaction(()=>{const result=db.prepare('DELETE FROM items WHERE tenant=? AND id=?').run(tenant,id);redactDeletedRepresentations(tenant,id);invalidate(tenant);return result;}),
    async runWorker({crashAfterEffect=false}={}){
      const job=db.prepare("SELECT * FROM jobs WHERE state='pending' ORDER BY id LIMIT 1").get();if(!job)return null;
      transaction(()=>{db.prepare('UPDATE jobs SET attempts=attempts+1 WHERE id=?').run(job.id);db.prepare('INSERT OR IGNORE INTO effects(job_id,tenant,effect) VALUES(?,?,?)').run(job.id,job.tenant,`created:${job.item_id}`);});
      if(crashAfterEffect)throw new Error(`Injected worker crash after durable local effect:${job.id}`);
      db.prepare("UPDATE jobs SET state='acked' WHERE id=?").run(job.id);return job.id;
    },
    async stop(){draining=true;await Promise.all([close(ingress),close(app)]);db.close();},
    beginDrain(){draining=true;},
    dependencyPath:'HTTPS/TLS -> trusted loopback HTTP ingress -> application -> SQLite WAL on disk'
  };
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.includes('--invalid'))throw new Error('Invalid fixture option');
    const directory=resolve(process.argv[2]||'evals/evidence/integrated/manual');const certs=generateCerts(join(directory,'certs'));const fixture=await startFixture({directory,certs});
    console.log(JSON.stringify({status:'PASS',url:fixture.url,database:fixture.dbPath,bounds:BOUNDS,syntheticCredentials:true}));
    if(process.argv.includes('--smoke')){await fixture.stop();process.exit(0);}
    const done=async()=>{await fixture.stop();process.exit(0);};process.once('SIGINT',done);process.once('SIGTERM',done);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
