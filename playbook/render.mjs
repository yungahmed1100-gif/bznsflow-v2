import { chromium } from 'playwright';
const S = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(`file://${S}/playbook.html`, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: `${S}/out.pdf`, format: 'A4', printBackground: true,
              margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await b.close();
console.log('rendered');
