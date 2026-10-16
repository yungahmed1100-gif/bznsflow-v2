// Deterministic social artwork matching the current homepage, without changing its UI.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const logo = readFileSync(new URL('../public/logo.png', import.meta.url)).toString('base64');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8">
    <style>
      *{box-sizing:border-box}body{margin:0;background:#f5efdf;color:#1c1c1a;font-family:Arial,sans-serif}
      main{height:630px;padding:48px 68px;border-top:12px solid #51a47b}
      header{display:flex;align-items:center;gap:20px;font-size:34px;font-weight:700}
      img{width:76px;height:76px;object-fit:contain}
      h1{font-size:76px;line-height:1.08;letter-spacing:-3px;margin:34px 0 26px;font-weight:750}
      p{font-size:29px;line-height:1.5;margin:0;color:#4e5c69}
      footer{margin-top:40px;border-top:1px solid #d4ccb7;padding-top:24px;display:flex;justify-content:space-between;font-size:22px}
    </style><main><header><img src="data:image/png;base64,${logo}" alt="">BznsFlow</header>
    <h1>Qualified inquiries.<br>A clear next step.</h1>
    <p>Layla on WhatsApp &amp; Instagram<br>Arabic &amp; English · Oman &amp; the GCC</p>
    <footer><span>Catalyst · Available now</span><span>bznsflowai.com</span></footer></main></html>`);
  await page.locator('img').evaluate(img => img.decode());
  await page.screenshot({ path: fileURLToPath(new URL('../public/og-image.jpg', import.meta.url)), type: 'jpeg', quality: 90 });
} finally {
  await browser.close();
}
