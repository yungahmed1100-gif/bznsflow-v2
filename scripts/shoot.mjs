// Screenshot the homepage across the breakpoint scale, in both languages.
//
//   node scripts/shoot.mjs <label>       -> work/shots/<label>/<lang>-<width>.png
//
// Used to compare a design change against the state before it. Arabic is the
// canonical route at `/` and English mirrors under `/en`, so both are shot from
// their real URLs rather than by flipping a class -- RTL bugs only show up on
// the route that actually sets dir="rtl".
//
// Assumes a dev server is already listening on BASE (default http://localhost:5173).

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE || 'http://localhost:5173';
const label = process.argv[2];

if (!label) {
  console.error('usage: node scripts/shoot.mjs <label>');
  process.exit(1);
}

// The five-step scale from DESIGN.md, plus 320 to catch the narrowest phones
// the site actually sees.
const WIDTHS = [320, 480, 768, 1024, 1440];
const LANGS = [
  { code: 'ar', path: '/' },
  { code: 'en', path: '/en' },
];

const outDir = `work/shots/${label}`;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
let shot = 0;

for (const lang of LANGS) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });

    await page.goto(`${BASE}${lang.path}`, { waitUntil: 'networkidle' });

    // Reveal animations are IntersectionObserver-driven and gate content to
    // opacity 0 until seen. Force them all visible so a full-page shot is not
    // half empty, and kill the marquee so successive runs are comparable.
    await page.addStyleTag({
      content: `
        [data-reveal] { opacity: 1 !important; transform: none !important; }
        *, *::before, *::after { animation-play-state: paused !important; }
      `,
    });
    await page.waitForTimeout(400);

    await page.screenshot({
      path: `${outDir}/${lang.code}-${width}.png`,
      fullPage: true,
    });
    await page.close();
    shot += 1;
  }
}

await browser.close();
console.log(`${shot} screenshots -> ${outDir}/`);
