// Catalyst BznsBrain: the owner's review queue, Layla's behaviour settings, and Test Layla's context.
//
// Contract: sources → proposals (Qwen, checked here) → the owner accepts into a DRAFT → publishing
// (bzns.md or the catalog) makes it live. Customer conversations add review suggestions only; nothing
// here edits published knowledge. Every operation resolves the setup from the caller's session and
// refuses a proposal that belongs to another one.
import { BZNS_MAX_CHARS, sectionText, upsertSection, parseBzns } from '../src/lib/bzns-doc.js';
import { askableFields, effectiveBehaviour, validateBehaviour } from '../config/layla-behaviour.js';
import { foldText, verifyProposals, SECTION_KEYS } from '../config/brain-extract.js';
import { isClinical } from '../config/layla-overrides.js';
import { sectorIdFor } from '../config/layla-qualification.js';
import { hmacSha256Hex } from './hash.js';
import { approvedKnowledge } from './knowledgeSourceState.js';
import { catalogOwnerKey, composeTurnContext, loadTurnSources } from './laylaTurn.js';
import { planInbound } from './blueContacts.js';
import { executeCatalog } from './blueCatalogState.js';

export const MAX_OPEN = 300, MAX_GAPS = 50, LIST_LIMIT = 100;
const ok = value => ({ ok: true, value });
const fail = reason => ({ ok: false, reason });
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const digest = text => hmacSha256Hex('brain-proposal-v1', text).slice(0, 24);
const MONEY = /(\d[\d.,]*)\s*(omr|r\.?o\.?|rial|riyal|aed|sar|usd|\$|ر\.?\s?ع|ريال|درهم)|(omr|aed|sar|usd|\$|ريال)\s*\d/i;
const INSTRUCTION = /\b(ignore|disregard|forget)\b[^.\n]{0,30}\b(instructions?|rules?|prompt)\b|\bsystem prompt\b|\byou are now\b|\bact as\b|تجاهل\s*(التعليمات|القواعد)/i;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

/** The setup's sector: from its published profile, else from its draft's front matter. */
export const sectorOf = row => sectorIdFor(row?.profile?.sector || parseBzns(row?.bznsDraft?.markdown || '').meta.sector || '');
const workingMarkdown = row => row.bznsDraft?.markdown ?? row.bznsPublished?.markdown ?? '';
const fence = async (ctx, row, now) => ctx.db.patch(row._id, { profileVersion: (row.profileVersion || 1) + 1, updatedAt: now });
const openRows = (ctx, reviewId, status) => ctx.db.query('brainProposals').withIndex('by_review_status', q => q.eq('reviewId', reviewId).eq('status', status)).take(MAX_OPEN + 1);
const byDedupe = (ctx, reviewId, dedupeKey) => ctx.db.query('brainProposals').withIndex('by_review_dedupe', q => q.eq('reviewId', reviewId).eq('dedupeKey', dedupeKey)).first();
const publicProposal = ({ _id, reviewId, dedupeKey, ...p }) => ({ id: _id, ...p });

/** Insert a proposal unless the same one is already queued or was decided. */
async function propose(ctx, row, proposal, now) {
  if (await byDedupe(ctx, row._id, proposal.dedupeKey)) return 'duplicate';
  const open = (await openRows(ctx, row._id, 'open')).length + (await openRows(ctx, row._id, 'quarantined')).length;
  if (open >= MAX_OPEN) return 'limit';
  await ctx.db.insert('brainProposals', { reviewId: row._id, ...proposal, createdAt: now, updatedAt: now });
  return 'added';
}

/**
 * Lazy, idempotent: an account's published Q&A answers become one-time proposals to merge into
 * bzns.md. Layla keeps reading them until the owner merges (and publishes) or dismisses each one.
 */
export async function migrateAnswers(ctx, row, now) {
  if (!row.accountId || row.brainMigratedAt) return 0;
  let added = 0;
  for (const answer of await approvedKnowledge(ctx, row.accountId)) {
    const text = `${clip(answer.title, 200)}: ${clip(answer.text, 800)}`;
    const result = await propose(ctx, row, { kind: 'qa_migration', status: 'open', target: { section: 'policies', sourceKey: answer.sourceKey, question: clip(answer.title, 200) },
      proposedText: text, evidence: { sourceKind: 'knowledge', sourceLabel: clip(answer.reference || answer.title, 200), quote: clip(answer.text, 300) },
      dedupeKey: `qa:${answer.sourceKey}:${digest(foldText(answer.title))}` }, now);
    if (result === 'added') added++;
  }
  await ctx.db.patch(row._id, { brainMigratedAt: now });
  return added;
}

/** Retire one old Q&A answer: kept for the record, never read by Layla again. */
async function retireAnswer(ctx, row, target, now) {
  if (!row.accountId || !target?.sourceKey) return false;
  const source = await ctx.db.query('knowledgeSources').withIndex('by_account_key', q => q.eq('accountId', row.accountId).eq('sourceKey', target.sourceKey)).unique();
  if (!source) return false;
  const answers = (source.approvedAnswers || []).map(a => (clip(a.question, 200) === target.question && !a.retiredAt ? { ...a, retiredAt: now } : a));
  await ctx.db.patch(source._id, { approvedAnswers: answers, updatedAt: now });
  return true;
}

/**
 * A question customers asked that the business data did not cover becomes one review suggestion,
 * counted, never duplicated. Health questions are never stored; contact details are stripped.
 */
export async function recordGap(ctx, row, { question, sectorId, now }) {
  if (!row?._id || isClinical(question) && ['dental', 'clinic'].includes(sectorId)) return null;
  const topic = clip(String(question).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '').replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/\+?\d[\d\s-]{5,}\d/g, ''), 160);
  if (topic.length < 6) return null;
  const dedupeKey = `gap:${digest(foldText(topic).slice(0, 80))}`;
  const existing = await byDedupe(ctx, row._id, dedupeKey);
  if (existing) {
    if (existing.status === 'open') await ctx.db.patch(existing._id, { count: (existing.count || 1) + 1, updatedAt: now });
    return 'counted';
  }
  if ((await ctx.db.query('brainProposals').withIndex('by_review_status', q => q.eq('reviewId', row._id).eq('status', 'open')).take(MAX_OPEN)).filter(p => p.kind === 'customer_gap').length >= MAX_GAPS) return 'limit';
  return propose(ctx, row, { kind: 'customer_gap', status: 'open', target: { section: 'policies', question: topic }, count: 1,
    evidence: { sourceKind: 'conversation', sourceLabel: 'Customer question', quote: topic }, dedupeKey }, now);
}

/** The catalog entry an accepted proposal writes, in the catalog's own shape. */
function catalogEntry(proposed, { entryKey, sortOrder, source }) {
  const ar = /[؀-ۿ]/.test(proposed.descriptionAr || '') || (!proposed.nameEn && !!proposed.nameAr);
  return { entryKey: entryKey || globalThis.crypto.randomUUID(), kind: proposed.kind === 'product' ? 'product' : 'service', nameEn: clip(proposed.nameEn, 160), nameAr: clip(proposed.nameAr, 160),
    category: clip(proposed.category, 700), benefitEn: '', benefitAr: '', descriptionEn: ar ? '' : clip(proposed.descriptionEn, 700), descriptionAr: ar ? clip(proposed.descriptionAr || proposed.descriptionEn, 700) : clip(proposed.descriptionAr, 700),
    availability: '', prices: (proposed.prices || []).slice(0, 20).map(p => ({ type: p.type, currency: clip(p.currency, 8), unit: clip(p.unit, 80), label: clip(p.label, 160), ...(p.amount !== undefined ? { amount: p.amount } : {}), ...(p.minimum !== undefined ? { minimum: p.minimum } : {}), ...(p.maximum !== undefined ? { maximum: p.maximum } : {}) })),
    source: clip(source, 700), confidence: 0.8, laylaUseEn: 'Answer customer questions about this service and its approved price.', laylaUseAr: 'الإجابة عن أسئلة العملاء حول هذه الخدمة وسعرها المعتمد.', sortOrder };
}
const sectionProblem = text => (!text ? 'empty_text' : text.length > 1500 ? 'text_too_long' : CONTROL.test(text) || /<[a-z/!]/i.test(text) ? 'invalid_text' : MONEY.test(text) ? 'price_in_section' : INSTRUCTION.test(text) ? 'instruction_like' : null);

export async function executeBrain(ctx, a, now = Date.now()) {
  if (!hash(a.sessionHash)) return fail('invalid_state');
  const row = await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', a.sessionHash)).unique();
  if (!row || row.expiresAt <= now) return fail('session_expired');
  const sectorId = sectorOf(row);
  const owned = async id => {
    const proposalId = typeof id === 'string' ? ctx.db.normalizeId('brainProposals', id) : null;
    const proposal = proposalId ? await ctx.db.get(proposalId) : null;
    return proposal && String(proposal.reviewId) === String(row._id) ? proposal : null;
  };

  if (a.operation === 'state') {
    await migrateAnswers(ctx, row, now);
    const [open, quarantined] = await Promise.all([openRows(ctx, row._id, 'open'), openRows(ctx, row._id, 'quarantined')]);
    const proposals = [...open, ...quarantined].sort((x, y) => y.createdAt - x.createdAt);
    const markdown = workingMarkdown(row);
    return ok({ behaviour: effectiveBehaviour(row, sectorId), askable: askableFields(sectorId), sectorId, brainStep: row.brainStep || 0,
      proposals: proposals.slice(0, LIST_LIMIT).map(p => publicProposal({ ...p, existing: p.kind === 'catalog_entry' ? p.existing : sectionText(markdown, p.target.section || 'policies') || p.existing })),
      counts: Object.fromEntries(['bzns_section', 'catalog_entry', 'qa_migration', 'customer_gap'].map(k => [k, proposals.filter(p => p.kind === k).length])), total: proposals.length });
  }

  if (a.operation === 'test_context') {
    // Test Layla: the live context builder and the live question planner, on a simulated customer. No writes.
    const variant = a.variant === 'draft' ? 'draft' : 'published';
    const history = (Array.isArray(a.history) ? a.history : []).slice(-12).filter(h => h && ['customer', 'layla'].includes(h.role) && typeof h.text === 'string' && h.text.trim()).map(h => ({ role: h.role, text: h.text.slice(0, 1000) }));
    const latest = history.filter(h => h.role === 'customer').at(-1);
    if (!latest) return fail('invalid_text');
    const sources = await loadTurnSources(ctx, row, { variant, sectorId, mode: 'brain' });
    const sim = a.sim && typeof a.sim === 'object' ? a.sim : {};
    const contact = { _id: 'preview', fields: Array.isArray(sim.fields) ? sim.fields.slice(0, 20) : [], customerName: clip(sim.customerName, 40) || undefined, asked: Array.isArray(sim.asked) ? sim.asked.slice(0, 5) : [],
      askCounts: Array.isArray(sim.askCounts) ? sim.askCounts.slice(0, 20) : [], lastAskedAt: Number(sim.lastAskedAt) || 0, nameDeclined: !!sim.nameDeclined, appointmentInterestAt: Number(sim.appointmentInterestAt) || undefined, optout: false };
    const planned = planInbound(contact, { text: latest.text, intent: 'ai', handoff: false, at: now, now, sectorId, catalog: sources.catalog, tone: sources.behaviour.tone, mode: 'brain', behaviour: sources.behaviour });
    const pending = { firstReply: !history.some(h => h.role === 'layla'), askKey: planned.plan.keys[0] || null, facts: [], acks: [], notes: {}, ...(planned.override ? { override: planned.override } : {}), ...(planned.reception ? { reception: true } : {}) };
    const context = composeTurnContext({ row, sectorId, sources, history, contact: planned.contact, pending });
    const nextSim = { fields: planned.contact.fields, customerName: planned.contact.customerName || '', asked: contact.asked, askCounts: contact.askCounts, lastAskedAt: contact.lastAskedAt,
      nameDeclined: !!planned.contact.nameDeclined, appointmentInterestAt: planned.contact.appointmentInterestAt || 0 };
    return ok({ context, sim: nextSim, variant, sectorId, override: planned.override || null, reception: !!planned.reception });
  }

  if (a.operation === 'record_extraction') {
    // Defence in depth: the proposals are verified again here, against the exact text the model read.
    if (typeof a.chunk !== 'string' || !a.chunk.trim() || a.chunk.length > 8000 || !['file', 'website', 'paste'].includes(a.sourceKind)) return fail('invalid_extraction');
    const verified = verifyProposals(a.raw, a.chunk);
    const label = clip(a.sourceLabel, 200) || a.sourceKind;
    const markdown = workingMarkdown(row);
    const owner = catalogOwnerKey(row);
    const existing = (await executeCatalog(ctx, { operation: 'list', ownerKey: owner, all: true, limit: 1000 }, now)).value?.entries || [];
    const counts = { added: 0, duplicate: 0, limit: 0, rejected: verified.rejected.length };
    for (const item of verified.catalog) {
      const match = existing.find(e => [e.nameEn, e.nameAr].some(n => n && foldText(n) === foldText(item.nameEn || item.nameAr)));
      const label0 = item.prices[0]?.label || '';
      if (match && (match.prices || []).some(p => foldText(p.label) === foldText(label0))) { counts.duplicate++; continue; }
      const result = await propose(ctx, row, { kind: 'catalog_entry', status: item.flags.length ? 'quarantined' : 'open', target: { ...(match ? { entryKey: match.entryKey } : {}) },
        ...(match ? { existing: (match.prices || []).map(p => p.label).join('; ') || '—' } : {}),
        proposedEntry: { kind: item.kind, nameEn: item.nameEn, nameAr: item.nameAr, category: item.category, descriptionEn: /[؀-ۿ]/.test(item.description) ? '' : item.description, descriptionAr: /[؀-ۿ]/.test(item.description) ? item.description : '', prices: item.prices },
        evidence: { sourceKind: a.sourceKind, sourceLabel: label, quote: item.evidence }, ...(item.flags.length ? { flags: item.flags } : {}),
        dedupeKey: `catalog:${digest(foldText(item.nameEn || item.nameAr))}:${digest(foldText(label0))}` }, now);
      counts[result]++;
    }
    for (const part of verified.sections) {
      const current = sectionText(markdown, part.key);
      if (current && foldText(current).includes(foldText(part.text))) { counts.duplicate++; continue; }
      const result = await propose(ctx, row, { kind: 'bzns_section', status: part.flags.length ? 'quarantined' : 'open', target: { section: part.key }, ...(current ? { existing: current.slice(0, 2000) } : {}),
        proposedText: part.text, evidence: { sourceKind: a.sourceKind, sourceLabel: label, quote: part.evidence }, ...(part.flags.length ? { flags: part.flags } : {}),
        dedupeKey: `section:${part.key}:${digest(foldText(part.text))}` }, now);
      counts[result]++;
    }
    return ok(counts);
  }

  if (a.operation === 'accept') {
    const proposal = await owned(a.proposalId);
    if (!proposal || !['open', 'quarantined'].includes(proposal.status)) return fail('proposal_not_found');
    if (proposal.kind === 'catalog_entry') {
      const entry = a.entry && typeof a.entry === 'object' ? { ...proposal.proposedEntry, ...a.entry } : proposal.proposedEntry;
      if (proposal.status === 'quarantined' && !a.entry) return fail('proposal_needs_edit');
      if (INSTRUCTION.test(`${entry.nameEn} ${entry.nameAr} ${entry.descriptionEn} ${entry.descriptionAr}`)) return fail('instruction_like');
      const list = (await executeCatalog(ctx, { operation: 'list', ownerKey: catalogOwnerKey(row), all: true, limit: 1000 }, now)).value;
      const saved = await executeCatalog(ctx, { operation: 'save', ownerKey: catalogOwnerKey(row), entry: catalogEntry(entry, { entryKey: proposal.target.entryKey, sortOrder: list?.total || 0, source: `BznsBrain: ${proposal.evidence.sourceLabel}` }) }, now);
      if (!saved.ok) return saved;
    } else {
      const text = typeof a.text === 'string' ? a.text.trim() : proposal.proposedText || '';
      if (proposal.kind === 'customer_gap' && typeof a.text !== 'string') return fail('answer_required');
      if (proposal.status === 'quarantined' && typeof a.text !== 'string') return fail('proposal_needs_edit');
      const problem = sectionProblem(text);
      if (problem) return fail(problem);
      const section = SECTION_KEYS.includes(a.section) ? a.section : SECTION_KEYS.includes(proposal.target.section) ? proposal.target.section : 'policies';
      const body = proposal.kind === 'customer_gap' ? `${proposal.target.question}: ${text}` : text;
      const markdown = upsertSection(workingMarkdown(row), section, body, { replace: !!a.replace, lang: /[؀-ۿ]/.test(body) ? 'ar' : 'en' });
      if (markdown.length > BZNS_MAX_CHARS) return fail('bzns_too_long');
      await ctx.db.patch(row._id, { bznsDraft: { markdown, version: (row.bznsDraft?.version || 0) + 1, savedAt: now }, updatedAt: now });
    }
    await ctx.db.patch(proposal._id, { status: 'accepted', resolvedAt: now, updatedAt: now, ...(proposal.kind === 'qa_migration' ? { flags: [...(proposal.flags || []), 'retire_on_publish'] } : {}) });
    return ok({ accepted: proposal.kind });
  }

  if (a.operation === 'dismiss') {
    const proposal = await owned(a.proposalId);
    if (!proposal || !['open', 'quarantined'].includes(proposal.status)) return fail('proposal_not_found');
    await ctx.db.patch(proposal._id, { status: 'dismissed', resolvedAt: now, updatedAt: now });
    // A dismissed old answer stops being one of Layla's sources now, so queued replies built on it are fenced.
    if (proposal.kind === 'qa_migration' && await retireAnswer(ctx, row, proposal.target, now)) await fence(ctx, row, now);
    return ok({ dismissed: proposal.kind });
  }

  if (a.operation === 'settle_publish') {
    // After bzns.md is published: merged old answers are retired, so Layla reads each fact from one place.
    const accepted = await ctx.db.query('brainProposals').withIndex('by_review_status', q => q.eq('reviewId', row._id).eq('status', 'accepted')).take(MAX_OPEN);
    let retired = 0;
    for (const p of accepted.filter(p => p.kind === 'qa_migration' && (p.flags || []).includes('retire_on_publish'))) {
      if (await retireAnswer(ctx, row, p.target, now)) retired++;
      await ctx.db.patch(p._id, { flags: (p.flags || []).filter(f => f !== 'retire_on_publish').concat('retired'), updatedAt: now });
    }
    if (retired) await fence(ctx, row, now);
    return ok({ retired });
  }

  if (a.operation === 'behaviour_save') {
    const checked = validateBehaviour(a.behaviour, sectorId);
    if (!checked.ok) return checked;
    if ((row.behaviour?.version || 0) !== a.version) return fail('behaviour_conflict');
    // Behaviour is live as soon as it is saved: replies already queued under the old settings are fenced.
    await ctx.db.patch(row._id, { behaviour: { ...checked.value, version: (row.behaviour?.version || 0) + 1, savedAt: now }, profileVersion: (row.profileVersion || 1) + 1, updatedAt: now });
    return ok({ behaviour: effectiveBehaviour({ ...row, behaviour: { ...checked.value, version: (row.behaviour?.version || 0) + 1, savedAt: now } }, sectorId) });
  }

  if (a.operation === 'step') {
    if (!Number.isInteger(a.brainStep) || a.brainStep < 0 || a.brainStep > 6) return fail('invalid_state');
    await ctx.db.patch(row._id, { brainStep: Math.max(row.brainStep || 0, a.brainStep), updatedAt: now });
    return ok({ brainStep: Math.max(row.brainStep || 0, a.brainStep) });
  }
  return fail('invalid_operation');
}

