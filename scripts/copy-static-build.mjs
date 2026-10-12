import { cp, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { normalizeStaticHtml } from './static-html.mjs';
await rm('dist', { recursive: true, force: true });
await cp('build/client', 'dist', { recursive: true });

async function validateHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await validateHtml(path);
    else if (entry.isFile() && entry.name.endsWith('.html')) {
      const bytes = await readFile(path);
      const clean = normalizeStaticHtml(bytes);
      if (bytes.includes(0)) await writeFile(path, clean);
    }
  }
}
await validateHtml('dist');
