import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inside, skillRoot } from './validate.mjs';

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
export async function startServer({ root = path.join(skillRoot, 'evals/fixtures/lab'), port = 4173 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('port must be an integer from 0 through 65535');
  const base = await realpath(root);
  const server = http.createServer(async (request, response) => {
    const send = (status, body) => { response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(body); };
    if (!['GET', 'HEAD'].includes(request.method)) return send(405, 'Method not allowed');
    try {
      const raw = decodeURIComponent(request.url.split('?')[0]);
      if (raw.includes('\0') || raw.includes('\\') || raw.split('/').includes('..')) return send(400, 'Invalid path');
      let target = path.resolve(base, `.${raw === '/' ? '/index.html' : raw}`);
      if (!inside(base, target)) return send(403, 'Forbidden');
      target = await realpath(target);
      if (!inside(base, target)) return send(403, 'Forbidden');
      if (!(await stat(target)).isFile()) return send(404, 'Not found');
      const body = await readFile(target);
      response.writeHead(200, { 'Content-Type': mime[path.extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) { send(error instanceof URIError ? 400 : 404, error instanceof URIError ? 'Invalid path' : 'Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
      console.log('usage: node scripts/serve.mjs [--port NUMBER]\nServe the bundled fixture on 127.0.0.1 only; Ctrl+C stops it.');
      process.exit(0);
    }
    if (!(args.length === 0 || (args.length === 2 && args[0] === '--port'))) throw new Error('usage: node scripts/serve.mjs [--port NUMBER]');
    const { url } = await startServer(args.length ? { port: Number(args[1]) } : {});
    console.log(`Serving local fixture at ${url}; Ctrl+C stops the server.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
