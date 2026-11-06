import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const routes = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'], '/styles.css': ['styles.css', 'text/css; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'] };
const server = createServer(async (request, response) => {
  const route = routes[new URL(request.url, 'http://localhost').pathname];
  if (!route) { response.writeHead(404); response.end('Not found'); return; }
  try { response.writeHead(200, { 'Content-Type': route[1] }); response.end(await readFile(new URL(route[0], import.meta.url))); }
  catch (error) { response.writeHead(500); response.end('Run node build.mjs first.'); }
});
server.listen(4308, '127.0.0.1', () => console.log('http://127.0.0.1:4308'));
