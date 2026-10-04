// Static preview with the same extensionless directory routes deployed to Vercel.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 5199;
const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const base = resolve(root, '.' + pathname);
    if (base !== root && !base.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    for (const file of [base, base + '.html', resolve(base, 'index.html')]) {
      if (!(await stat(file).catch(() => null))?.isFile()) continue;
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
      return res.end(await readFile(file));
    }
    res.writeHead(404); res.end('Not found');
  } catch { res.writeHead(400); res.end('Bad request'); }
}).listen(port, '127.0.0.1', () => console.log(`Static preview: http://127.0.0.1:${port}`));
