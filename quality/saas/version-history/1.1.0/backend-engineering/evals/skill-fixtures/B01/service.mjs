import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
export function openStore(file=':memory:') {
 const db=new DatabaseSync(file); db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS tickets(tenant TEXT NOT NULL,id TEXT NOT NULL,title TEXT NOT NULL,note TEXT,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(tenant,id));`);
 const insert=db.prepare('INSERT OR IGNORE INTO tickets(tenant,id,title,note) VALUES(?,?,?,?)');
 insert.run('north','t1','Printer jam','Call support'); insert.run('south','t1','Private account',null); return db;
}
const identities=new Map([['north-reader',{tenant:'north',write:false}],['north-editor',{tenant:'north',write:true}],['south-editor',{tenant:'south',write:true}]]);
export function createService(db) {
 return http.createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
  const identity=identities.get((req.headers.authorization??'').replace(/^Bearer /,''));
  if(!identity)return send(401,{code:'unauthenticated'});
  const match=/^\/tickets\/([a-z0-9-]+)$/.exec(req.url??''); if(!match)return send(404,{code:'not_found'});
  if(req.method==='GET') {const row=db.prepare('SELECT id,title,note,version FROM tickets WHERE tenant=? AND id=?').get(identity.tenant,match[1]);return send(row?200:404,row??{code:'not_found'});}
  if(req.method==='PATCH')return send(501,{code:'not_implemented'});
  return send(405,{code:'method_not_allowed'});
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const db=openStore(process.env.DB_FILE??'tickets.sqlite');const server=createService(db);server.listen(Number(process.env.PORT??0),'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));}
