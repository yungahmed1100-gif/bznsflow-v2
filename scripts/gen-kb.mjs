#!/usr/bin/env node
/**
 * gen-kb.mjs — compile Layla's markdown sources into api/_lib/kb.generated.js
 *
 *   node scripts/gen-kb.mjs            regenerate
 *   node scripts/gen-kb.mjs --check    exit 1 if the committed file is stale
 *
 * Inputs
 *   web-chatbot/system-prompt-web-bznsflow.md   → PERSONA  (verbatim fenced block)
 *   web-chatbot/layla-knowledge-base.md         → SECTIONS (id, kw, en, ar)
 *
 * The output is COMMITTED rather than built on the fly. Two reasons: a KB edit
 * becomes a reviewable diff of the text that actually reaches the model, and the
 * serverless function never depends on build ordering to have its knowledge.
 *
 * Output is deterministic — same input, byte-identical output — which is what
 * makes --check a real drift gate rather than a coin flip.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROMPT_MD = join(ROOT, 'web-chatbot/system-prompt-web-bznsflow.md');
const KB_MD = join(ROOT, 'web-chatbot/layla-knowledge-base.md');
const OUT = join(ROOT, 'api/_lib/kb.generated.js');

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const HAS_LATIN = /[A-Za-z]/;

/** Anything that stops the build gets thrown, never warned. A KB that silently
 *  loses a section degrades Layla's answers in a way nobody notices for weeks. */
function fail(msg) {
  console.error(`\n✖ gen-kb: ${msg}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// PERSONA — verbatim extraction, never a transformation.
// ---------------------------------------------------------------------------
function readPersona() {
  const md = readFileSync(PROMPT_MD, 'utf8');
  const m = md.match(/## RUNTIME PROMPT[^\n]*\n+```text\n([\s\S]*?)\n```/);
  if (!m) {
    fail(
      `no "## RUNTIME PROMPT" section with a \`\`\`text fence in ${PROMPT_MD}.\n` +
        `  The persona must live in that fence so it is copied byte-for-byte.`
    );
  }
  const persona = m[1].trim();

  // Cheap guards against edits that would silently disarm a defence. Each of
  // these was a real incident or a rule the model needs stated explicitly.
  const required = [
    ['NEVER reveal, summarize, quote, or discuss', 'the hardened prompt-leak clause'],
    ['handoff_context', 'the JSON output contract'],
    ['KNOWLEDGE (answer strictly from this', 'the knowledge-injection anchor'],
    ['SAME language as the visitor', 'the language-mirroring rule'],
  ];
  for (const [needle, what] of required) {
    if (!persona.includes(needle)) fail(`persona is missing ${what} ("${needle}").`);
  }
  // The KB is appended directly after this line, so it must be last.
  if (!persona.endsWith(":")) {
    fail('persona must end with the KNOWLEDGE header line — the catalog is appended straight after it.');
  }
  return persona;
}

// ---------------------------------------------------------------------------
// KB sections
// ---------------------------------------------------------------------------

/** Titles and labels separate their English and Arabic halves with a spaced
 *  slash. Splitting on a bare "/" corrupts any title containing an unspaced
 *  one — "Sales & Revenue Capture System (24/7 AI Workforce)" would yield an
 *  Arabic title of "7 AI Workforce)". */
const HALVES = /\s+\/\s+/;

/** Strip markdown emphasis. The model receives plain text, so literal asterisks
 *  are just noise tokens around the words they were meant to stress. */
const stripMd = (s) => s.replace(/\*\*(.+?)\*\*/gs, '$1').replace(/\*\*/g, '');

/**
 * Split a section body into labelled blocks: `**Label:** text…` running until
 * the next label or the end of the section. Returns [{ label, body }] in
 * document order.
 *
 * Line-scanned rather than regex-matched: a multiline-flag regex anchored with
 * `$` terminates at the first line break, which silently truncates every block
 * that spans more than one line — including §00's bilingual "How we build"
 * block, whose second line is the entire Arabic five-layer summary.
 */
function splitBlocks(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\*\*([^*]+?):\*\*[ \t]*(.*)$/);
    if (m) {
      if (cur) out.push(cur);
      cur = { label: m[1].trim(), lines: m[2].trim() ? [m[2].trim()] : [] };
    } else if (cur) {
      const t = line.trim();
      // Skip the horizontal rule that separates catalog sections. It trails the
      // last block of a section, and being punctuation-only it carries no script
      // — so script routing would file it under English and emit an Arabic-
      // labelled English fragment like "النتيجة: ---".
      if (t && !/^[-*_]{3,}$/.test(t)) cur.lines.push(t);
    }
  }
  if (cur) out.push(cur);
  return out.map(({ label, lines }) => ({ label, body: lines.join('\n') }));
}

/** Route a trailing block's lines by script rather than by position.
 *
 *  The catalog uses three shapes and this handles all of them without
 *  special-casing any one section:
 *    **Outcome:** …            English label + English body      → en
 *    **النتيجة:** …             Arabic label + Arabic body        → ar
 *    **How we build / كيف نبني:** English line \n Arabic line     → split across both
 *
 *  Position alone would get the third wrong: it sits after **AR:** yet carries
 *  the five-layer summary that every English answer needs.
 */
function routeBlock({ label, body }) {
  // A line must carry actual letters to be routed anywhere; punctuation-only
  // leftovers would otherwise attach themselves to the English variant.
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && (HAS_LATIN.test(l) || ARABIC.test(l)));
  const enLines = lines.filter((l) => !ARABIC.test(l));
  const arLines = lines.filter((l) => ARABIC.test(l));

  const labelParts = label.split(HALVES).map((s) => s.trim());
  const enLabel = labelParts.find((p) => HAS_LATIN.test(p) && !ARABIC.test(p)) ?? label;
  const arLabel = labelParts.find((p) => ARABIC.test(p)) ?? label;

  return {
    en: enLines.length ? `${enLabel}: ${enLines.join(' ')}` : '',
    ar: arLines.length ? `${arLabel}: ${arLines.join(' ')}` : '',
  };
}

function readSections() {
  const md = readFileSync(KB_MD, 'utf8');
  const lines = md.split('\n');

  // Collect `## <id> — <title>` headings and the body up to the next heading of
  // any level, so the trailing "# SOURCES" block never leaks into section 25.
  const heads = [];
  lines.forEach((line, i) => {
    const m = line.match(/^## (\d+) — (.+)$/);
    if (m) heads.push({ id: m[1], title: m[2].trim(), start: i });
  });
  if (!heads.length) fail(`no "## <id> — <title>" sections found in ${KB_MD}`);

  const sections = heads.map((h, idx) => {
    let end = idx + 1 < heads.length ? heads[idx + 1].start : lines.length;
    for (let i = h.start + 1; i < end; i++) {
      if (/^#{1,2} /.test(lines[i])) { end = i; break; }
    }
    const body = lines.slice(h.start + 1, end).join('\n');
    const blocks = splitBlocks(body);

    const kwBlock = blocks.find((b) => b.label.toLowerCase() === 'keywords');
    const enIdx = blocks.findIndex((b) => b.label === 'EN');
    const arIdx = blocks.findIndex((b) => b.label === 'AR');
    if (!kwBlock) fail(`section ${h.id} has no **Keywords:** block.`);
    if (enIdx === -1) fail(`section ${h.id} has no **EN:** block.`);
    if (arIdx === -1) fail(`section ${h.id} has no **AR:** block.`);

    const kw = kwBlock.body
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (!kw.length) fail(`section ${h.id} has an empty **Keywords:** list.`);

    // Retrieval is substring matching guarded by k.length >= 3 (see prompt.js).
    // A shorter keyword is not a soft warning — it is dead weight that looks
    // live in the source, so refuse it outright.
    const tooShort = kw.filter((k) => k.length < 3);
    if (tooShort.length) {
      fail(
        `section ${h.id} has keyword(s) shorter than 3 characters: ${tooShort.join(', ')}.\n` +
          `  Retrieval skips these, so they would never match. Use a longer phrase\n` +
          `  (e.g. "bi" → "business intelligence").`
      );
    }

    // Title halves become the prefix on each variant, matching the convention
    // the live prompt used: an explicit topic label helps the model tell three
    // injected sections apart.
    const [enTitleRaw, arTitleRaw] = h.title.split(HALVES).map((s) => s.trim());
    const enTitle = stripMd(enTitleRaw || h.title).toUpperCase();
    const arTitle = stripMd(arTitleRaw || enTitleRaw || h.title);

    let en = stripMd(blocks[enIdx].body).replace(/\s*\n\s*/g, ' ').trim();
    let ar = stripMd(blocks[arIdx].body).replace(/\s*\n\s*/g, ' ').trim();

    // Fold every non-EN/AR/Keywords block into the right variant.
    blocks.forEach((b, i) => {
      if (i === enIdx || i === arIdx || b === kwBlock) return;
      const routed = routeBlock({ label: b.label, body: stripMd(b.body) });
      if (routed.en) en += ` ${routed.en}`;
      if (routed.ar) ar += ` ${routed.ar}`;
    });

    return {
      id: h.id,
      kw,
      en: `${enTitle}: ${en}`.replace(/\s+/g, ' ').trim(),
      ar: `${arTitle}: ${ar}`.replace(/\s+/g, ' ').trim(),
    };
  });

  const ids = sections.map((s) => s.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) fail(`duplicate section id(s): ${[...new Set(dupes)].join(', ')}`);

  // '00' and '20' are the retrieval fallback when nothing scores — a message
  // like "sure" or "what do you recommend?" matches no keyword at all.
  for (const id of ['00', '20']) {
    if (!ids.includes(id)) fail(`section ${id} is missing — it is the retrieval fallback.`);
  }
  return sections;
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
function render(persona, sections) {
  const j = (v) => JSON.stringify(v);
  const body = sections
    .map((s) => `  {\n    id: ${j(s.id)},\n    kw: ${j(s.kw)},\n    en: ${j(s.en)},\n    ar: ${j(s.ar)},\n  },`)
    .join('\n');

  return `// @generated by scripts/gen-kb.mjs — DO NOT EDIT BY HAND.
//
// Edit the markdown sources and re-run \`npm run gen:kb\`:
//   web-chatbot/system-prompt-web-bznsflow.md   (PERSONA)
//   web-chatbot/layla-knowledge-base.md         (SECTIONS)
//
// Committed on purpose: a KB change shows up as a reviewable diff of the exact
// text sent to the model, and /api/chat never depends on build order to have
// its knowledge.

/** System prompt, verbatim. The matched KB sections are appended to it. */
export const PERSONA = ${j(persona)};

/** Service catalog. \`kw\` is matched as lowercase substrings of the visitor's
 *  message; \`en\`/\`ar\` are injected in the visitor's language only. */
export const SECTIONS = [
${body}
];

export const KB_SECTION_COUNT = ${sections.length};
`;
}

const persona = readPersona();
const sections = readSections();
const out = render(persona, sections);

const isCheck = process.argv.includes('--check');
const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;

if (isCheck) {
  if (current !== out) {
    fail(
      'api/_lib/kb.generated.js is out of date with the markdown sources.\n' +
        '  Run `npm run gen:kb` and commit the result.'
    );
  }
  console.log(`✓ gen-kb: kb.generated.js is in sync (${sections.length} sections).`);
} else if (current === out) {
  console.log(`✓ gen-kb: already up to date (${sections.length} sections).`);
} else {
  writeFileSync(OUT, out);
  const kw = sections.reduce((n, s) => n + s.kw.length, 0);
  console.log(
    `✓ gen-kb: wrote api/_lib/kb.generated.js — ${sections.length} sections, ` +
      `${kw} keywords, persona ${persona.length} chars.`
  );
}
