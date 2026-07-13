// Generates Sintra-style 3D character avatars for the 12 BznsFlow agents via
// the Gemini image API (gemini-2.5-flash-image). Two-phase for consistency:
// Layla is generated first as the style anchor, then every other agent is
// generated WITH Layla's image attached as a style reference.
//
// Usage:
//   node scripts/generate-agent-avatars.mjs layla        # generate the style anchor
//   node scripts/generate-agent-avatars.mjs --all        # anchor + remaining 11
//   node scripts/generate-agent-avatars.mjs saqr hasib   # regenerate specific agents
//
// Requires GEMINI_API_KEY in the environment or in ./.env (never committed).
// Output: src/assets/agents/<name>.png (1024x1024, 1:1)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'src', 'assets', 'agents');
const MODEL = 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const ANCHOR = 'layla';

// Shared art direction — matches the site's warm cream palette and gives the
// glossy, friendly 3D mascot look (Sintra-style) across all 12 characters.
const STYLE = [
  'Premium 3D rendered character mascot for a SaaS brand, Pixar-style,',
  'soft glossy materials, rounded friendly proportions, chest-up portrait,',
  'body angled slightly, face toward viewer, warm confident expression.',
  'Soft studio lighting with a gentle rim light.',
  'Plain solid warm cream background, hex #F6EFDF, no props on the background,',
  'no text, no watermark, no logo. Square 1:1 composition, character centered',
  'with comfortable margin. Consistent art style suitable for a matched set',
  'of team avatars.',
].join(' ');

// Brand accents: blue #5C95C6, orange #F28C54, green #51A47B
const AGENTS = [
  {
    name: 'layla',
    prompt:
      'A young Arab woman AI receptionist named Layla. Modern elegant hijab in soft blue (#5C95C6), sleek wireless headset with microphone, warm welcoming smile, professional blazer. Radiates "I answer instantly, day or night."',
  },
  {
    name: 'hatif',
    prompt:
      'An Arab man AI voice agent named Hatif. Neat short beard, friendly mid-conversation expression, modern telephone operator headset in orange (#F28C54), smart casual shirt. Radiates a clear, reassuring voice on the line.',
  },
  {
    name: 'samira',
    prompt:
      'A creative young Arab woman AI social media manager named Samira. Stylish modern look, holding a smartphone, small glossy 3D heart and like icons floating near her shoulder, energetic bright smile, orange (#F28C54) accent in her outfit.',
  },
  {
    name: 'wisal',
    prompt:
      'A warm Arab woman AI outreach specialist named Wisal. Kind reconnecting expression, one hand extended in a welcoming gesture, a glossy 3D envelope with a thread of light floating beside her, green (#51A47B) accent in her outfit.',
  },
  {
    name: 'saqr',
    prompt:
      'A noble falcon character — an actual falcon as an AI sales closer named Saqr. Sleek desert-gold and brown feathers, sharp intelligent amber eyes, subtle business collar and tie in blue (#5C95C6), poised and confident like a hunter about to strike. Dignified, not cartoonish-silly.',
  },
  {
    name: 'hasib',
    prompt:
      'An Arab man AI data analyst named Hasib. Rectangular glasses, precise focused expression with a slight smile, holding a glossy 3D tablet showing a simple rising bar chart, blue (#5C95C6) accent in his shirt.',
  },
  {
    name: 'rashid',
    prompt:
      'A wise older Arab man AI business strategist named Rashid. Grey-flecked well-groomed beard, calm knowing expression of a majlis counselor, traditional-modern blend attire in deep blue (#5C95C6), a small glossy 3D chess knight floating beside him.',
  },
  {
    name: 'adiba',
    prompt:
      'An elegant Arab woman AI copywriter named Adiba. Literary and refined, holding a glossy 3D fountain pen, a few floating calligraphic letter shapes near her, subtle green (#51A47B) accent in her attire, composed artistic smile.',
  },
  {
    name: 'dalil',
    prompt:
      'An Arab man AI SEO guide named Dalil. Explorer energy, friendly grin, holding a glossy 3D magnifying glass with a tiny location pin inside it, orange (#F28C54) accent in his outfit.',
  },
  {
    name: 'rasil',
    prompt:
      'An Arab man AI email correspondent named Rasil. Neat and punctual look, a glossy 3D paper plane taking off from his open palm, blue (#5C95C6) accent in his outfit, dependable friendly expression.',
  },
  {
    name: 'raqib',
    prompt:
      'An Arab man AI operations overseer named Raqib. Calm and alert night-watch energy, arms crossed, a subtle glossy 3D radar ring floating beside his shoulder, green (#51A47B) accent in his outfit, quietly vigilant expression.',
  },
  {
    name: 'haris',
    prompt:
      'A broad-shouldered Arab man AI security guardian named Haris. Steady protective presence, holding a glossy 3D shield with a subtle padlock emblem, deep blue (#5C95C6) tones in his attire, trustworthy calm expression.',
  },
];

function loadApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const envPath = join(ROOT, '.env');
  if (existsSync(envPath)) {
    const match = readFileSync(envPath, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  }
  console.error('GEMINI_API_KEY not found. Get a key at https://aistudio.google.com/apikey');
  console.error('then add GEMINI_API_KEY=... to .env (gitignored) or export it.');
  process.exit(1);
}

async function generate(apiKey, agent, anchorImageB64) {
  const parts = [];
  if (anchorImageB64) {
    parts.push({ inline_data: { mime_type: 'image/png', data: anchorImageB64 } });
    parts.push({
      text: `The attached image is the style anchor for a matched avatar set. Create a NEW character in the EXACT same 3D rendering style, lighting, background color, framing, and level of detail — but a completely different person as described. ${STYLE} Character: ${agent.prompt}`,
    });
  } else {
    parts.push({ text: `${STYLE} Character: ${agent.prompt}` });
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
    }),
  });

  if (!res.ok) {
    throw new Error(`${agent.name}: HTTP ${res.status} — ${(await res.text()).slice(0, 500)}`);
  }

  const json = await res.json();
  const imagePart = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!imagePart) {
    throw new Error(`${agent.name}: no image in response — ${JSON.stringify(json).slice(0, 500)}`);
  }
  return imagePart.inlineData.data;
}

async function main() {
  const apiKey = loadApiKey();
  const args = process.argv.slice(2);
  const requested = args.includes('--all')
    ? AGENTS.map((a) => a.name)
    : args.filter((a) => !a.startsWith('--'));

  if (requested.length === 0) {
    console.log(`Usage: node scripts/generate-agent-avatars.mjs [--all | ${AGENTS.map((a) => a.name).join(' | ')}]`);
    process.exit(0);
  }

  const unknown = requested.filter((n) => !AGENTS.some((a) => a.name === n));
  if (unknown.length) {
    console.error(`Unknown agent(s): ${unknown.join(', ')}`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const anchorPath = join(OUT_DIR, `${ANCHOR}.png`);

  // Ensure the anchor exists first — everything else derives its style from it.
  let queue = [...requested];
  if (!existsSync(anchorPath) && !queue.includes(ANCHOR)) queue.unshift(ANCHOR);
  if (queue.includes(ANCHOR)) queue = [ANCHOR, ...queue.filter((n) => n !== ANCHOR)];

  for (const name of queue) {
    const agent = AGENTS.find((a) => a.name === name);
    const isAnchor = name === ANCHOR;
    const anchorB64 = isAnchor ? null : readFileSync(anchorPath).toString('base64');
    process.stdout.write(`Generating ${name}${isAnchor ? ' (style anchor)' : ''}... `);
    const b64 = await generate(apiKey, agent, anchorB64);
    writeFileSync(join(OUT_DIR, `${name}.png`), Buffer.from(b64, 'base64'));
    console.log(`saved src/assets/agents/${name}.png`);
  }

  console.log('\nDone. Review the anchor first; if the style is off, regenerate it');
  console.log('before running --all, since all other avatars inherit its style.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
