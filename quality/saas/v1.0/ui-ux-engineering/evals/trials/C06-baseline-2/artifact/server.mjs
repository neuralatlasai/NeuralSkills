import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const allowed = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/styles.css', 'styles.css'], ['/app.js', 'app.js'], ['/fake-api.js', 'fake-api.js']]);
const mime = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8' };
const port = Number(process.env.PORT || 4186);
const server = createServer(async (req, res) => { const file = allowed.get(new URL(req.url, 'http://localhost').pathname); if (!file) { res.writeHead(404).end('Not found'); return; } try { const data = await readFile(new URL('./dist/' + file, import.meta.url)); res.writeHead(200, { 'Content-Type': mime[file.split('.').pop()] }); res.end(data); } catch { res.writeHead(500).end('Run npm run build first.'); } });
server.listen(port, '127.0.0.1', () => console.log(`Field guide: http://127.0.0.1:${port}`));
