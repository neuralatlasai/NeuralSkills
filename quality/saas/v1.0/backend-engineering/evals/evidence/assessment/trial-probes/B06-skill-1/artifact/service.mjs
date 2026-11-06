import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export const secret = 'local-fixture-signing-key';
export const limits = Object.freeze({ bodyBytes:8192, skewSeconds:300, bodyMs:5000, active:16 });
const utf8 = new TextDecoder('utf-8', {fatal:true});
export function openStore(file=':memory:') {
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS orders(tenant TEXT NOT NULL,id TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('created','shipped')),PRIMARY KEY(tenant,id));
    CREATE TABLE IF NOT EXISTS receipts(event_id TEXT PRIMARY KEY NOT NULL,payload BLOB NOT NULL);
    INSERT OR IGNORE INTO orders VALUES('north','o1','created'),('south','o2','created');`);
  return db;
}
function header(req,name) {
  const values=[];
  for(let i=0;i<req.rawHeaders.length;i+=2) if(req.rawHeaders[i].toLowerCase()===name) values.push(req.rawHeaders[i+1]);
  return values.length===1 ? values[0] : null;
}
export function createService(db,{now=()=>Date.now(),beforeCommit=()=>{}}={}) {
  let active=0;
  const server=http.createServer({maxHeaderSize:8192},(req,res)=>{
    let done=false, timer;
    const send=(status,code,extra={})=>{
      if(done) return; done=true; clearTimeout(timer);
      res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','connection':'close'});
      res.end(JSON.stringify(code ? {code,...extra} : extra));
      if(!req.complete) { req.removeAllListeners('data'); req.pause(); res.once('finish',()=>req.destroy()); }
    };
    if(req.method!=='POST'||req.url!=='/webhooks/carrier') return send(404,'not_found');
    if(active>=limits.active) return send(503,'unavailable');
    active++; res.once('close',()=>{active--; clearTimeout(timer);});
    if(req.headers['content-encoding'] && req.headers['content-encoding']!=='identity') return send(415,'unsupported_encoding');
    if(req.headers['content-type'] && !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'])) return send(415,'unsupported_media');
    if(req.headers['content-length'] && Number(req.headers['content-length'])>limits.bodyBytes) return send(413,'too_large');
    const timestamp=header(req,'x-carrier-time'), supplied=header(req,'x-carrier-signature');
    if(!timestamp || !/^(0|[1-9][0-9]{0,9})$/.test(timestamp) || !supplied || !/^[a-fA-F0-9]{64}$/.test(supplied)) return send(401,'signature');
    const chunks=[]; let size=0;
    timer=setTimeout(()=>send(408,'timeout'),limits.bodyMs); timer.unref();
    req.on('error',()=>send(400,'invalid'));
    req.on('aborted',()=>{clearTimeout(timer);});
    req.on('data',chunk=>{
      size+=chunk.length;
      if(size>limits.bodyBytes) return send(413,'too_large');
      if(!done) chunks.push(chunk);
    });
    req.on('end',()=>{
      if(done) return;
      const raw=Buffer.concat(chunks,size);
      if(Math.abs(Math.floor(now()/1000)-Number(timestamp))>limits.skewSeconds) return send(401,'signature');
      const expected=createHmac('sha256',secret).update(timestamp,'ascii').update('.','ascii').update(raw).digest();
      if(!timingSafeEqual(expected,Buffer.from(supplied,'hex'))) return send(401,'signature');
      let event;
      try {event=JSON.parse(utf8.decode(raw));} catch {return send(400,'invalid');}
      if(!event || Array.isArray(event) || typeof event!=='object' || Object.keys(event).length!==3 ||
        Object.keys(event).some(key=>!['id','type','orderId'].includes(key)) || event.type!=='order.shipped' ||
        !['id','orderId'].every(key=>typeof event[key]==='string' && event[key].trim().length>0 && event[key].length<=80)) return send(400,'invalid');
      let transaction=false;
      try {
        db.exec('BEGIN IMMEDIATE'); transaction=true;
        const order=db.prepare('SELECT state FROM orders WHERE tenant=? AND id=?').get('north',event.orderId);
        if(!order) {db.exec('ROLLBACK');transaction=false;return send(404,'not_found');}
        const existing=db.prepare('SELECT payload FROM receipts WHERE event_id=?').get(event.id);
        if(existing) {
          const equal=Buffer.from(existing.payload).equals(raw);
          db.exec('ROLLBACK');transaction=false;
          return equal ? send(200,null,{accepted:true,replay:true}) : send(409,'event_conflict');
        }
        if(!['created','shipped'].includes(order.state)) {db.exec('ROLLBACK');transaction=false;return send(409,'state_conflict');}
        db.prepare('INSERT INTO receipts(event_id,payload) VALUES(?,?)').run(event.id,raw);
        db.prepare("UPDATE orders SET state='shipped' WHERE tenant=? AND id=? AND state='created'").run('north',event.orderId);
        beforeCommit(event);
        db.exec('COMMIT'); transaction=false;
        return send(200,null,{accepted:true,replay:false});
      } catch {
        if(transaction) {try {db.exec('ROLLBACK');} catch {}}
        return send(503,'unavailable');
      }
    });
  });
  server.maxConnections=32;
  server.maxHeadersCount=32;
  server.headersTimeout=5000;
  server.requestTimeout=6000;
  server.keepAliveTimeout=1000;
  server.maxRequestsPerSocket=100;
  return server;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const db=openStore(process.env.DB_FILE??'webhook.sqlite');
  const server=createService(db);
  server.listen(Number(process.env.PORT??0),'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));
  const stop=()=>{server.close(()=>{db.close();process.exit(0);});setTimeout(()=>{server.closeAllConnections();},6000).unref();};
  process.once('SIGTERM',stop); process.once('SIGINT',stop);
}
