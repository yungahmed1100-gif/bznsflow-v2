// Live evaluation of Layla's AI turn against real Qwen. Costs real API calls, so it never runs
// in the release gate and refuses to start without --yes.
//
//   node --env-file=.env.local scripts/eval-layla-ai.mjs --yes [--tones=informative,sharp,sweet] [--limit=60]
//
// For each question in config/eval-questions.js (sector, language) it builds the same TurnContext
// the live action builds, from a filled sample bzns.md and catalog, runs aiTurn with qwen-plus, and
// grades deterministically: no fallback, language matches, length, at most one question, the team
// contact on anything the model flags for the team, and no price outside the catalog (the
// validator would have rejected it, so a price failure shows up as a fallback). Writes a report
// to work/eval/. Never prints the key, and sends no customer data: only the sample questions.
import { mkdirSync, writeFileSync } from 'node:fs';
import { QUESTIONS } from '../config/eval-questions.js';
import { aiTurn } from '../config/layla-ai.js';
import { qwenConfig, qwenGenerator } from '../config/qwen-client.js';
import { parseBzns } from '../src/lib/bzns-doc.js';
import { langOf } from '../config/layla-tones.js';
import { sectorIdFor } from '../config/layla-qualification.js';
import { realEstateDoc, retailDoc, dentalDoc } from '../tests/helpers/layla-conversation.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
if (!args.yes) { console.error('This calls the real Qwen API and costs money. Re-run with --yes.'); process.exit(2); }
const config = qwenConfig(process.env);
if (!config) { console.error('QWEN_API_KEY and QWEN_BASE_URL are not set (use --env-file=.env.local).'); process.exit(2); }
const tones = String(args.tones || 'informative').split(',');
const limit = Number(args.limit) || 60;
const CONTACT = 'WhatsApp +968 9100 2000 (Sara)';
// The contact counts when its number is there, however the model worded it (the validator's rule).
const digits = t => String(t).replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/\D/g, '');
const hasContact = reply => reply.includes(CONTACT) || digits(reply).includes(digits(CONTACT).slice(-8));
const DOCS = { 'real-estate': realEstateDoc, retail: retailDoc, dental: dentalDoc };
const CATALOG = {
  'real-estate': [{ nameEn: 'Property management', category: 'Services', benefitEn: 'Tenants, maintenance and rent collection', prices: [{ label: '8% of annual rent' }] }, { nameEn: 'Valuation', prices: [{ label: 'Free' }] }],
  retail: [{ nameEn: 'Black abaya', nameAr: 'عباية سوداء', prices: [{ label: '25.000 OMR' }] }, { nameEn: 'Silk shayla', prices: [{ label: '8.500 OMR' }] }],
  dental: [{ nameEn: 'Cleaning', nameAr: 'تنظيف', prices: [{ label: 'From 15 OMR' }] }, { nameEn: 'Whitening', nameAr: 'تبييض', prices: [{ label: '60 OMR' }] }],
};
const generate = qwenGenerator(process.env);
const rows = QUESTIONS.filter(q => !q.sector || DOCS[q.sector]).slice(0, limit);
const results = [];
for (const tone of tones) for (const q of rows) {
  const sector = q.sector || 'real-estate';
  const parsed = parseBzns(DOCS[sector](tone));
  const ctx = { business: { name: parsed.meta.name, sector, sectorId: sectorIdFor(sector) }, tone, channel: 'whatsapp', teamContact: CONTACT,
    sections: parsed.sections.map(({ key, heading, body }) => ({ key, heading, body })), catalog: CATALOG[sector], knowledge: [], facts: [], acks: [],
    customer: {}, ask: null, firstReply: false, history: [{ role: 'customer', text: q.text }], fieldKeys: [], lang: langOf(q.text) };
  const turn = await aiTurn(ctx, generate);
  const problems = [];
  if (turn.ai.fallback) problems.push(`fallback:${turn.ai.fallback}`);
  if (langOf(q.text) === 'ar' && turn.reply && !/[؀-ۿ]/.test(turn.reply)) problems.push('language');
  if (turn.reply.length > 700) problems.push('length');
  if ((turn.reply.match(/[?؟]/g) || []).length > 1) problems.push('questions');
  if (turn.needsTeam && !hasContact(turn.reply) && !/get back to you|سيتواصل/.test(turn.reply)) problems.push('no_contact');
  results.push({ tone, sector, lang: q.lang, intent: q.intent, question: q.text, reply: turn.reply, needsTeam: turn.needsTeam, ms: turn.ai.ms, tokensIn: turn.ai.tokensIn, tokensOut: turn.ai.tokensOut, problems });
  process.stdout.write(problems.length ? 'x' : '.');
}
const passed = results.filter(r => !r.problems.length).length;
const tokens = results.reduce((a, r) => [a[0] + r.tokensIn, a[1] + r.tokensOut], [0, 0]);
const ms = results.map(r => r.ms).sort((a, b) => a - b);
const summary = { model: config.model, runs: results.length, passed, passRate: `${(100 * passed / Math.max(1, results.length)).toFixed(1)}%`,
  fallbacks: results.filter(r => r.problems.some(p => p.startsWith('fallback'))).length, p50ms: ms[Math.floor(ms.length / 2)] || 0, p95ms: ms[Math.floor(ms.length * 0.95)] || 0,
  tokensPerReply: { input: Math.round(tokens[0] / Math.max(1, results.length)), output: Math.round(tokens[1] / Math.max(1, results.length)) } };
mkdirSync('work/eval', { recursive: true });
const file = `work/eval/layla-ai-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(file, JSON.stringify({ summary, results }, null, 2));
console.log(`\n${JSON.stringify(summary)}\nreport ${file}`);
