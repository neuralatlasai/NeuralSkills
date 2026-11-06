import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
export function openStore(file=':memory:') {
 const db=new DatabaseSync(file); db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS tickets(tenant TEXT NOT NULL,id TEXT NOT NULL,title TEXT NOT NULL,note TEXT,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(tenant,id));`);
 const insert=db.prepare('INSERT OR IGNORE INTO tickets(tenant,id,title,note) VALUES(?,?,?,?)');
 insert.run('north','t1','Printer jam','Call support'); insert.run('south','t1','Private account',null); return db;
}
const identities=new Map([['north-reader',{tenant:'north',write:false}],['north-editor',{tenant:'north',write:true}],['south-editor',{tenant:'south',write:true}]]);
const BODY_LIMIT=2048;
function readBody(req) {
 return new Promise((resolve,reject)=>{
  const chunks=[]; let bytes=0;
  const cleanup=()=>{clearTimeout(timer);req.off('data',data);req.off('end',end);req.off('error',error);req.off('aborted',aborted);};
  const fail=(status,code)=>{cleanup();req.once('error',()=>{});req.resume();reject({status,code});};
  const data=chunk=>{bytes+=chunk.length;if(bytes>BODY_LIMIT)return fail(413,'payload_too_large');chunks.push(chunk);};
  const end=()=>{cleanup();try{resolve(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{reject({status:400,code:'invalid_json'});}};
  const error=()=>fail(400,'invalid_body');
  const aborted=()=>fail(400,'invalid_body');
  const timer=setTimeout(()=>fail(400,'body_timeout'),5000);
  req.on('data',data);req.on('end',end);req.on('error',error);req.on('aborted',aborted);
 });
}
export function createService(db) {
 const select=db.prepare('SELECT id,title,note,version FROM tickets WHERE tenant=? AND id=?');
 // Fixed identifiers; every value and tenant predicate is bound. RETURNING is the public projection.
 const update=db.prepare('UPDATE tickets SET title=CASE WHEN ? THEN ? ELSE title END,note=CASE WHEN ? THEN ? ELSE note END,version=version+1 WHERE tenant=? AND id=? AND version=? RETURNING id,title,note,version');
 return http.createServer(async(req,res)=>{
  const send=(status,value)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
  const identity=identities.get((req.headers.authorization??'').replace(/^Bearer /,''));
  if(!identity)return send(401,{code:'unauthenticated'});
  const match=/^\/tickets\/([a-z0-9-]+)$/.exec(req.url??''); if(!match)return send(404,{code:'not_found'});
  if(req.method==='GET') {const row=select.get(identity.tenant,match[1]);return send(row?200:404,row??{code:'not_found'});}
  if(req.method==='PATCH') {
   if(!identity.write)return send(403,{code:'forbidden'});
   if((req.headers['content-type']??'').split(';')[0].trim().toLowerCase()!=='application/json'||!['identity',''].includes(req.headers['content-encoding']??''))return send(415,{code:'unsupported_media_type'});
   if(Number(req.headers['content-length'])>BODY_LIMIT){req.resume();return send(413,{code:'payload_too_large'});}
   let body;
   try {body=JSON.parse(await readBody(req));}catch(error){return send(error.status??400,{code:error.code??'invalid_json'});}
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['version','title','note'].includes(key))||!Number.isSafeInteger(body.version)||body.version<1)return send(400,{code:'invalid_patch'});
   const hasTitle=Object.hasOwn(body,'title'),hasNote=Object.hasOwn(body,'note');
   if(hasTitle&&(typeof body.title!=='string'||!body.title.trim()||body.title.trim().length>120))return send(400,{code:'invalid_patch'});
   if(hasNote&&body.note!==null&&(typeof body.note!=='string'||body.note.length>500))return send(400,{code:'invalid_patch'});
   try {
    const row=update.get(Number(hasTitle),hasTitle?body.title.trim():null,Number(hasNote),hasNote?body.note:null,identity.tenant,match[1],body.version);
    if(row)return send(200,row);
    return select.get(identity.tenant,match[1])?send(409,{code:'version_conflict'}):send(404,{code:'not_found'});
   }catch {return send(500,{code:'internal_error'});}
  }
  return send(405,{code:'method_not_allowed'});
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const db=openStore(process.env.DB_FILE??'tickets.sqlite');const server=createService(db);server.listen(Number(process.env.PORT??0),'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));}

