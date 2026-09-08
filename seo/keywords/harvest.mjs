// Harvests Google autocomplete suggestions for a seed set, expanded by alphabet
// and question/commercial modifiers. This is the mechanism AnswerThePublic and
// Ubersuggest's "keyword ideas" are built on — we hit the source directly.
//
// Output: suggestions.json (seed -> deduped suggestion list) + all-keywords.txt
// Usage: node harvest.mjs [--hl en] [--gl us]

import { writeFileSync } from 'node:fs';

const HL = 'en';
const GL = 'us';
const DELAY_MS = 120;

const SEEDS = [
  'ai receptionist',
  'ai answering service',
  'ai voice agent',
  'ai phone answering',
  'virtual receptionist',
  'whatsapp automation',
  'whatsapp business api',
  'ai chatbot for business',
  'ai appointment booking',
  'ai lead response',
  'ai order taking',
  'ai front office',
];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const MODIFIERS = [
  '', 'how', 'what', 'why', 'when', 'which', 'who', 'can', 'do', 'does', 'is', 'are',
  'best', 'top', 'cheap', 'cheapest', 'cost', 'price', 'pricing', 'free',
  'vs', 'alternative', 'alternatives', 'for', 'near me', 'software', 'setup', 'review',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function suggest(query) {
  const url =
    `https://suggestqueries.google.com/complete/search?client=firefox` +
    `&hl=${HL}&gl=${GL}&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    });
    if (!res.ok) return { ok: false, status: res.status, items: [] };
    const body = await res.json();
    return { ok: true, status: 200, items: Array.isArray(body[1]) ? body[1] : [] };
  } catch (err) {
    return { ok: false, status: String(err.message || err), items: [] };
  }
}

const results = {};
const all = new Set();
let requests = 0;
let failures = 0;

for (const seed of SEEDS) {
  const found = new Set();
  const probes = [
    seed,
    ...MODIFIERS.filter(Boolean).map((m) => `${m} ${seed}`),
    ...MODIFIERS.filter(Boolean).map((m) => `${seed} ${m}`),
    ...ALPHABET.map((c) => `${seed} ${c}`),
  ];
  for (const probe of probes) {
    const { ok, items } = await suggest(probe);
    requests += 1;
    if (!ok) failures += 1;
    for (const item of items) {
      found.add(item.toLowerCase());
      all.add(item.toLowerCase());
    }
    await sleep(DELAY_MS);
  }
  results[seed] = [...found].sort();
  console.log(`[harvest] ${seed} → ${found.size} suggestions`);
}

writeFileSync('suggestions.json', JSON.stringify(results, null, 2));
writeFileSync('all-keywords.txt', [...all].sort().join('\n') + '\n');
console.log(`\n[harvest] ${requests} requests, ${failures} failures`);
console.log(`[harvest] ${all.size} unique keywords → all-keywords.txt`);
