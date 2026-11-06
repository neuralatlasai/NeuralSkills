import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
export function openStore(file=':memory:') {
 const db=new DatabaseSync(file); db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000; CREATE TABLE IF NOT EXISTS tickets(tenant TEXT NOT NULL,id TEXT NOT NULL,title TEXT NOT NULL,note TEXT,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(tenant,id));`);
 const insert=db.prepare('INSERT OR IGNORE INTO tickets(tenant,id,title,note) VALUES(?,?,?,?)');
 insert.run('north','t1','Printer jam','Call support'); insert.run('south','t1','Private account',null); return db;
}
const identities=new Map([['north-reader',{tenant:'north',write:false}],['north-editor',{tenant:'north',write:true}],['south-editor',{tenant:'south',write:true}]]);
const BODY_LIMIT=2048;
function readBody(req) {
 return new Promise((resolve,reject)=>{
  let size=0, chunks=[], settled=false;
  const finish=value=>{if(!settled){settled=true;resolve(value);}};
  req.on('data',chunk=>{
   if(settled)return;
   size+=chunk.length;
   if(size>BODY_LIMIT){chunks=[];finish({status:413,code:'payload_too_large'});return;}
   chunks.push(chunk);
  });
  req.on('end',()=>{
   if(settled)return;
   try {finish({body:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)))});}
   catch {finish({status:400,code:'invalid_json'});}
  });
  req.on('error',reject);
  req.on('aborted',()=>reject(new Error('request aborted')));
 });
}
function validPatch(body) {
 if(!body||typeof body!=='object'||Array.isArray(body))return false;
 if(Object.keys(body).some(key=>!['title','note','version'].includes(key)))return false;
 if(!Number.isSafeInteger(body.version)||body.version<1)return false;
 if(Object.hasOwn(body,'title')&&(typeof body.title!=='string'||body.title.trim().length===0||body.title.trim().length>120))return false;
 if(Object.hasOwn(body,'note')&&body.note!==null&&(typeof body.note!=='string'||body.note.length>500))return false;
 return true;
}
export function createService(db) {
 const get=db.prepare('SELECT id,title,note,version FROM tickets WHERE tenant=? AND id=?');
 const update=db.prepare('UPDATE tickets SET title=CASE WHEN ? THEN ? ELSE title END,note=CASE WHEN ? THEN ? ELSE note END,version=version+1 WHERE tenant=? AND id=? AND version=? RETURNING id,title,note,version');
 const server=http.createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json',...(status===413?{'connection':'close'}:{})});res.end(JSON.stringify(value));};
  try {
   const identity=identities.get((req.headers.authorization??'').replace(/^Bearer /,''));
   if(!identity)return send(401,{code:'unauthenticated'});
   const match=/^\/tickets\/([a-z0-9-]+)$/.exec(req.url??''); if(!match)return send(404,{code:'not_found'});
   if(req.method==='GET') {const row=get.get(identity.tenant,match[1]);return send(row?200:404,row??{code:'not_found'});}
   if(req.method!=='PATCH')return send(405,{code:'method_not_allowed'});
   if(!identity.write)return send(403,{code:'forbidden'});
   if(!/^application\/json\s*(?:;|$)/i.test(req.headers['content-type']??''))return send(415,{code:'unsupported_media_type'});
   if(Number(req.headers['content-length'])>BODY_LIMIT)return send(413,{code:'payload_too_large'});
   const parsed=await readBody(req);
   if(parsed.status)return send(parsed.status,{code:parsed.code});
   const body=parsed.body;
   if(!validPatch(body))return send(400,{code:'invalid_patch'});
   const row=update.get(Number(Object.hasOwn(body,'title')),body.title?.trim()??null,Number(Object.hasOwn(body,'note')),body.note??null,identity.tenant,match[1],body.version);
   if(row)return send(200,row);
   const exists=get.get(identity.tenant,match[1]);
   return send(exists?409:404,{code:exists?'version_conflict':'not_found'});
  } catch(error) {
   if(!res.headersSent&&!res.destroyed)send(500,{code:'internal_error'});
  }
 });
 server.requestTimeout=10000;
 server.headersTimeout=5000;
 server.keepAliveTimeout=5000;
 server.setTimeout(15000,socket=>socket.destroy());
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const db=openStore(process.env.DB_FILE??'tickets.sqlite');const server=createService(db);server.listen(Number(process.env.PORT??0),'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));}
