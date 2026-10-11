// Usage: node scripts/workspace-snapshot.mjs <tree-root> <out-dir> <port-base>
// Starts each six-tab sector's manager demo from <tree-root> with a frozen clock, saves the JSON of
// every read operation and screenshots of the key screens (EN/AR, 1440/320) for a before/after diff.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const [root, out, base = '5500'] = process.argv.slice(2);
const FIXED = Date.UTC(2026, 9, 11, 8, 0, 0);
const SECTORS = {
  'real-estate': { reads: ['real_estate_overview', 'opportunities', 'real_estate_followups', 'real_estate_insights', 'viewings', 'real_estate_tasks', 'commissions', 'drafts', 'properties'],
    screens: ['tab=work&view=board', 'tab=work&view=viewings', 'tab=work&view=properties', 'tab=work&view=followups', 'tab=insights', 'tab=settings&view=rules'] },
  media: { reads: ['media_overview', 'media_productions', 'media_followups', 'media_insights', 'media_resources', 'media_calendar'],
    screens: ['tab=work&view=board', 'tab=work&view=calendar', 'tab=work&view=resources', 'tab=work&view=followups', 'tab=insights', 'tab=settings&view=rules'] },
  fitness: { reads: ['fitness_overview', 'fitness_members', 'fitness_followups', 'fitness_insights', 'fitness_plans', 'fitness_classes'],
    screens: ['tab=work&view=members', 'tab=work&view=classes', 'tab=work&view=plans', 'tab=work&view=followups&filter=decision', 'tab=insights', 'tab=settings&view=rules'] },
  dental: { reads: ['dental_overview', 'dental_visits', 'dental_followups', 'dental_insights', 'dental_resources'],
    screens: ['tab=work&view=schedule', 'tab=work&view=visits', 'tab=work&view=services', 'tab=work&view=followups&filter=decision', 'tab=insights', 'tab=settings&view=rules'] },
};
const FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'approval', 'blocked', 'completed'];
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
let port = Number(base);
for (const [pack, { reads, screens }] of Object.entries(SECTORS)) {
  const p = port++;
  const child = spawn(process.execPath, ['--import', new URL('./workspace-fixed-clock.mjs', import.meta.url).pathname, 'scripts/hasib-demo.mjs', String(p), `--pack=${pack}`], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res, rej) => { child.stdout.on('data', c => String(c).includes('Hasib demo') && res()); child.on('exit', c => rej(Error(`${pack} demo exited ${c}`))); });
  const url = `http://127.0.0.1:${p}`;
  const call = async (action, body = {}) => (await fetch(`${url}/api/layla-meta?surface=hasib`, { method: 'POST', headers: { 'content-type': 'application/json', origin: url }, body: JSON.stringify({ action, ...body }) })).json();
  const json = {};
  for (const op of reads) json[op] = await call(op, op === 'dental_visits' ? {} : {});
  for (const f of FILTERS) { const op = reads.find(r => r.endsWith('_followups')); json[`${op}:${f}`] = await call(op, { filter: f }); }
  const ins = reads.find(r => r.endsWith('_insights'));
  for (const period of ['7d', '30d', 'month']) json[`${ins}:${period}`] = await call(ins, { period });
  for (const m of [...(json[ins].headline || []), ...(json[ins].diagnostics || [])]) json[`${pack}:records:${m.id}`] = await call(ins.replace('_insights', '_metric_records'), { metric: m.id, period: '30d' });
  json.overview = await (await fetch(`${url}/api/layla-meta?surface=hasib`, { headers: { origin: url } })).json();
  await writeFile(`${out}/${pack}.json`, JSON.stringify(json, null, 1));
  for (const lang of ['en', 'ar']) for (const width of [1440, 320]) for (const q of screens) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(FIXED);
    await page.goto(`${url}${lang === 'ar' ? '' : '/en'}/layla/dashboard?${q}`);
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${pack}-${q.replace(/[^a-z]+/g, '_')}-${lang}-${width}.png`, fullPage: true });
    await ctx.close();
  }
  child.kill();
  console.log(`${pack}: ${Object.keys(json).length} reads, ${screens.length * 4} screens`);
}
await browser.close();
