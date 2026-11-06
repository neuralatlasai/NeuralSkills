import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
export async function startServer(port=0){
 const server=http.createServer(async(req,res)=>{
  try { const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname); const file=path.resolve(root,`./${name==='/'?'index.html':name.slice(1)}`); if(!file.startsWith(root+path.sep))throw Error('Forbidden'); const body=await readFile(file);const type={'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(body);}
  catch{res.writeHead(404);res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));return{server,url:`http://127.0.0.1:${server.address().port}`};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const{url}=await startServer(Number(process.env.PORT||4176));console.log(url);}
