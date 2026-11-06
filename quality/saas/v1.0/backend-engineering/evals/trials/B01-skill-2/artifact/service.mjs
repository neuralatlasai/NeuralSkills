import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
export function openStore(file=':memory:') {
 const db=new DatabaseSync(file); db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000; CREATE TABLE IF NOT EXISTS tickets(tenant TEXT NOT NULL,id TEXT NOT NULL,title TEXT NOT NULL,note TEXT,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(tenant,id));`);
 const insert=db.prepare('INSERT OR IGNORE INTO tickets(tenant,id,title,note) VALUES(?,?,?,?)');
 insert.run('north','t1','Printer jam','Call support'); insert.run('south','t1','Private account',null); return db;
}
const identities=new Map([['north-reader',{tenant:'north',write:false}],['north-editor',{tenant:'north',write:true}],['south-editor',{tenant:'south',write:true}]]);
const fault=(status,code)=>Object.assign(new Error(code),{status,code});
function readJson(req) {
 return new Promise((resolve,reject)=>{
  let bytes=0; const chunks=[];
  const finish=(error,value)=>{clearTimeout(timer);req.off('data',data);req.off('end',end);req.off('aborted',aborted);req.off('error',aborted);if(error){req.pause();reject(error);}else resolve(value);};
  const data=chunk=>{bytes+=chunk.length;if(bytes>2048)return finish(fault(413,'body_too_large'));chunks.push(chunk);};
  const end=()=>{try{const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));finish(null,JSON.parse(text));}catch{finish(fault(400,'invalid_json'));}};
  const aborted=()=>finish(fault(400,'incomplete_body'));
  const timer=setTimeout(()=>finish(fault(400,'request_timeout')),5000);
  req.on('data',data);req.once('end',end);req.once('aborted',aborted);req.once('error',aborted);
 });
}
function validate(body) {
 if(!body||typeof body!=='object'||Array.isArray(body))throw fault(400,'invalid_patch');
 if(Object.keys(body).some(key=>!['version','title','note'].includes(key)))throw fault(400,'invalid_patch');
 if(!Number.isSafeInteger(body.version)||body.version<=0)throw fault(400,'invalid_version');
 if(Object.hasOwn(body,'title')){if(typeof body.title!=='string'||!body.title.trim()||body.title.trim().length>120)throw fault(400,'invalid_title');body.title=body.title.trim();}
 if(Object.hasOwn(body,'note')&&body.note!==null&&(typeof body.note!=='string'||body.note.length>500))throw fault(400,'invalid_note');
 return body;
}
export function createService(db) {
 const get=db.prepare('SELECT id,title,note,version FROM tickets WHERE tenant=? AND id=?');
 const update=db.prepare(`UPDATE tickets SET title=CASE WHEN ? THEN ? ELSE title END,note=CASE WHEN ? THEN ? ELSE note END,version=version+1 WHERE tenant=? AND id=? AND version=? RETURNING id,title,note,version`);
 const server=http.createServer(async(req,res)=>{
  const send=(status,value)=>{if(res.destroyed)return;res.writeHead(status,{'content-type':'application/json','connection':'close'});res.end(JSON.stringify(value),()=>req.destroy());};
  try {
   const identity=identities.get((req.headers.authorization??'').replace(/^Bearer /,''));
   if(!identity)return send(401,{code:'unauthenticated'});
   const match=/^\/tickets\/([a-z0-9-]+)$/.exec(req.url??'');if(!match)return send(404,{code:'not_found'});
   if(req.method==='GET'){const row=get.get(identity.tenant,match[1]);return send(row?200:404,row??{code:'not_found'});}
   if(req.method!=='PATCH')return send(405,{code:'method_not_allowed'});
   if(!identity.write)return send(403,{code:'forbidden'});
   if(!/^application\/json(?:\s*;.*)?$/i.test(req.headers['content-type']??'')||!['identity',undefined].includes(req.headers['content-encoding']))return send(415,{code:'unsupported_media_type'});
   const length=req.headers['content-length'];if(length!==undefined&&Number(length)>2048)return send(413,{code:'body_too_large'});
   const body=validate(await readJson(req));
   const row=update.get(Number(Object.hasOwn(body,'title')),body.title??null,Number(Object.hasOwn(body,'note')),body.note??null,identity.tenant,match[1],body.version);
   if(row)return send(200,row);
   const exists=get.get(identity.tenant,match[1]);return send(exists?409:404,{code:exists?'stale_version':'not_found'});
  } catch(error){return send(error.status??500,{code:error.code&&error.status?error.code:'internal_error'});}
 });
 server.requestTimeout=6000;server.headersTimeout=6000;server.keepAliveTimeout=1000;server.maxHeadersCount=64;
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const db=openStore(process.env.DB_FILE??'tickets.sqlite');const server=createService(db);server.listen(Number(process.env.PORT??0),'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));}
