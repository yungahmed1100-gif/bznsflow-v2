import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { checkSite } from '../scripts/seo/checks.mjs';
import { checkSocialImages } from '../scripts/seo/social-images.mjs';

const production = 'https://www.bznsflowai.com';
const local = 'http://127.0.0.1:5207';
const pages = () => ['/', '/en'].map((path, i) => ({
  finalUrl: local + path, title: `Title ${i}`, description: `Description ${i}`, links: [],
  hreflang: [{ lang: 'ar', href: production + '/' }, { lang: 'en', href: production + '/en' }, { lang: 'x-default', href: production + '/en' }],
}));
const options = { sitemapUrls: new Set([local + '/', local + '/en']), canonicalOrigin: production };

test('local hreflang respects the expected production origin and reciprocal paths', () => {
  assert.deepEqual(checkSite(pages(), options).filter(f => f.severity === 'error'), []);
  const wrongDomain = pages();
  wrongDomain[0].hreflang[0].href = 'https://wrong.example/';
  assert.ok(checkSite(wrongDomain, options).some(f => f.code === 'hreflang-no-self'));
  const brokenReturn = pages();
  brokenReturn[1].hreflang[0].href = production + '/missing';
  assert.ok(checkSite(brokenReturn, options).some(f => f.code === 'hreflang-not-reciprocal'));
});

test('social image checks detect missing files and HTML fallbacks', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/good.jpg') { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end(Buffer.from([255, 216, 255, 217])); }
    else if (req.url === '/fake.jpg') { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end('<html>Fallback</html>'); }
    else { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('Missing'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const [path, errors] of [['/good.jpg', 0], ['/fake.jpg', 1], ['/missing.jpg', 1]]) {
      const result = await checkSocialImages([{ og: { 'og:image': production + path } }], base, production);
      assert.equal(result.length, errors);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
