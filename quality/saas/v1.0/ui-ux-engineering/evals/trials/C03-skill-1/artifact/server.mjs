import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
http.createServer(async(req,res)=>{
 const file=req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0].slice(1);
 if(!['index.html','styles.css','app.js'].includes(file)){res.writeHead(404);res.end('Not found');return;}
 try {const data=await readFile(path.join(root,file));res.writeHead(200,{'Content-Type':types[path.extname(file)]});res.end(data);}catch{res.writeHead(500);res.end('Unable to read file');}
}).listen(43031,'127.0.0.1',()=>console.log('FIELDNOTES: http://127.0.0.1:43031'));
