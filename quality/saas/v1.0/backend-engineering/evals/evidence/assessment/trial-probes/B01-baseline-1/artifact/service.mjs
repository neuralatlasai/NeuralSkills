import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
export function openStore(file=':memory:') {
 const db=new DatabaseSync(file); db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS tickets(tenant TEXT NOT NULL,id TEXT NOT NULL,title TEXT NOT NULL,note TEXT,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(tenant,id));`);
 const insert=db.prepare('INSERT OR IGNORE INTO tickets(tenant,id,title,note) VALUES(?,?,?,?)');
 insert.run('north','t1','Printer jam','Call support'); insert.run('south','t1','Private account',null); return db;
}
const identities=new Map([['north-reader',{tenant:'north',write:false}],['north-editor',{tenant:'north',write:true}],['south-editor',{tenant:'south',write:true}]]);
const MAX_BODY_BYTES=2048;
class RequestError extends Error {constructor(status,code){super(code);this.status=status;this.code=code;}}
function readJson(req) {
 return new Promise((resolve,reject)=>{
  let size=0, chunks=[], done=false;
  const fail=(error)=>{if(done)return;done=true;chunks=[];reject(error);};
  req.on('data',chunk=>{
   if(done)return;
   size+=chunk.length;
   if(size>MAX_BODY_BYTES)return fail(new RequestError(413,'body_too_large'));
   chunks.push(chunk);
  });
  req.on('end',()=>{
   if(done)return;done=true;
   try {resolve(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))));}
   catch {reject(new RequestError(400,'invalid_json'));}
  });
  req.on('aborted',()=>fail(new RequestError(400,'invalid_body')));
  req.on('error',()=>fail(new RequestError(400,'invalid_body')));
 });
}
function validatePatch(body) {
 if(!body||typeof body!=='object'||Array.isArray(body))throw new RequestError(400,'invalid_patch');
 if(Object.keys(body).some(key=>!['version','title','note'].includes(key)))throw new RequestError(400,'invalid_patch');
 if(!Number.isSafeInteger(body.version)||body.version<=0)throw new RequestError(400,'invalid_patch');
 const hasTitle=Object.hasOwn(body,'title'),hasNote=Object.hasOwn(body,'note');
 if(hasTitle) {
  if(typeof body.title!=='string')throw new RequestError(400,'invalid_patch');
  body.title=body.title.trim();
  if(!body.title||Array.from(body.title).length>120)throw new RequestError(400,'invalid_patch');
 }
 if(hasNote&&body.note!==null&&(typeof body.note!=='string'||Array.from(body.note).length>500))throw new RequestError(400,'invalid_patch');
 return {body,hasTitle,hasNote};
}
export function createService(db) {
 const get=db.prepare('SELECT id,title,note,version FROM tickets WHERE tenant=? AND id=?');
 const patch=db.prepare('UPDATE tickets SET title=CASE WHEN ? THEN ? ELSE title END,note=CASE WHEN ? THEN ? ELSE note END,version=version+1 WHERE tenant=? AND id=? AND version=? RETURNING id,title,note,version');
 return http.createServer(async(req,res)=>{
  const send=(status,value)=>{
   if(res.destroyed||res.writableEnded)return;
   res.writeHead(status,{'content-type':'application/json',...(status===413?{'connection':'close'}:{})});res.end(JSON.stringify(value));
  };
  const identity=identities.get((req.headers.authorization??'').replace(/^Bearer /,''));
  if(!identity)return send(401,{code:'unauthenticated'});
  const match=/^\/tickets\/([a-z0-9-]+)$/.exec(req.url??''); if(!match)return send(404,{code:'not_found'});
  if(req.method==='GET') {const row=get.get(identity.tenant,match[1]);return send(row?200:404,row??{code:'not_found'});}
  if(req.method==='PATCH') {
   if(!identity.write)return send(403,{code:'forbidden'});
   if((req.headers['content-type']??'').split(';',1)[0].trim().toLowerCase()!=='application/json')return send(415,{code:'unsupported_media_type'});
   if(Number(req.headers['content-length'])>MAX_BODY_BYTES)return send(413,{code:'body_too_large'});
   try {
    const {body,hasTitle,hasNote}=validatePatch(await readJson(req));
    const row=patch.get(Number(hasTitle),hasTitle?body.title:null,Number(hasNote),hasNote?body.note:null,identity.tenant,match[1],body.version);
    if(row)return send(200,row);
    return get.get(identity.tenant,match[1])?send(409,{code:'version_conflict'}):send(404,{code:'not_found'});
   } catch(error) {return send(error.status??500,{code:error.code??'internal_error'});}
  }
  return send(405,{code:'method_not_allowed'});
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const db=openStore(process.env.DB_FILE??'tickets.sqlite');const server=createService(db);server.listen(Number(process.env.PORT??0),'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));}

