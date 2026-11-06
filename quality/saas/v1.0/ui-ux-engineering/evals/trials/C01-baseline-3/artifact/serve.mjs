import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
export async function startServer(port = 4173) {
  build();
  const allowed = new Set(['index.html', 'styles.css', 'invitation-copy.js', 'demo.js']);
  const server = http.createServer(async (request, response) => {
    const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (!allowed.has(name)) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const contents = await readFile(new URL(name, import.meta.url));
      response.setHeader('Content-Type', name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
      response.end(contents);
    } catch { response.writeHead(500); response.end('Could not read example file'); }
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  return server;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = await startServer(Number(process.env.PORT || 4173));
  console.log(`Example running at http://127.0.0.1:${server.address().port}`);
}
