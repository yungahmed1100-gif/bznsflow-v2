// Classifies harvested keywords by search intent and maps each cluster to the
// page type that should own it. Intent, not volume, drives the build order:
// we have no volume data, but intent is readable from the query itself.

import { readFileSync, writeFileSync } from 'node:fs';

const keywords = readFileSync('all-keywords.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);

// Wrong-intent queries — job seekers and hobbyists, not buyers.
const NOISE = /\b(job|jobs|salary|salaries|hiring|career|resume|intern|course|tutorial|github|reddit quiz|meme)\b/;

const VERTICALS = [
  'dental','dentist','medical','doctor','clinic','healthcare','veterinary','vet',
  'law firm','lawyer','legal','attorney','real estate','realtor','property',
  'restaurant','cafe','salon','spa','barber','gym','fitness',
  'hvac','plumber','plumbing','electrician','roofing','contractor','construction',
  'hotel','dealership','automotive','insurance','accounting','recruitment','ecommerce',
];

const RULES = [
  { intent: 'comparison', page: '/vs/* and /alternatives/*',
    re: /\b(vs|versus|alternative|alternatives|compare|comparison|better than|instead of)\b/ },
  { intent: 'cost',       page: '/pricing',
    re: /\b(cost|costs|price|prices|pricing|how much|cheap|cheapest|free|fee|budget|affordable)\b/ },
  { intent: 'vertical',   page: '/ai-receptionist/<industry>',
    re: new RegExp(`\\b(${VERTICALS.join('|')})\\b`) },
  { intent: 'commercial', page: 'service page',
    re: /\b(best|top|software|service|services|platform|tool|tools|company|companies|provider|for small business|for business)\b/ },
  { intent: 'question',   page: '/blog/*',
    re: /^(how|what|why|when|which|who|can|do|does|is|are|should|will)\b/ },
];

const buckets = new Map(RULES.map(r => [r.intent, []]));
buckets.set('other', []);
const noise = [];

for (const kw of keywords) {
  if (NOISE.test(kw)) { noise.push(kw); continue; }
  const rule = RULES.find(r => r.re.test(kw));
  buckets.get(rule ? rule.intent : 'other').push(kw);
}

const pageFor = Object.fromEntries(RULES.map(r => [r.intent, r.page]));
const lines = [];
lines.push('# Keyword clusters by intent\n');
lines.push(`Harvested ${keywords.length} unique suggestions from Google autocomplete.`);
lines.push(`Excluded ${noise.length} wrong-intent queries (jobs, courses, salaries).\n`);

const order = ['comparison','cost','vertical','commercial','question','other'];
for (const intent of order) {
  const list = buckets.get(intent);
  lines.push(`\n## ${intent} — ${list.length} queries`);
  if (pageFor[intent]) lines.push(`Target page: \`${pageFor[intent]}\`\n`);
  for (const kw of list.slice(0, 60)) lines.push(`- ${kw}`);
  if (list.length > 60) lines.push(`- …and ${list.length - 60} more`);
}

writeFileSync('clusters.md', lines.join('\n') + '\n');
writeFileSync('clusters.json', JSON.stringify(Object.fromEntries(buckets), null, 2));

console.log('intent'.padEnd(12), 'count');
for (const intent of order) console.log(intent.padEnd(12), buckets.get(intent).length);
console.log('noise'.padEnd(12), noise.length);

// Which verticals actually show demand?
const verticalHits = {};
for (const v of VERTICALS) {
  const n = keywords.filter(k => !NOISE.test(k) && new RegExp(`\\b${v}\\b`).test(k)).length;
  if (n) verticalHits[v] = n;
}
console.log('\ntop verticals by query count:');
Object.entries(verticalHits).sort((a,b)=>b[1]-a[1]).slice(0,20)
  .forEach(([v,n]) => console.log(`  ${String(n).padStart(3)}  ${v}`));
