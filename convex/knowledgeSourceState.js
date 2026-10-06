import { planFor } from './hasib/plans.js';
import { hmacSha256Hex } from './hash.js';
const ok = value => ({ ok: true, value });
const fail = reason => ({ ok: false, reason });
const key = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const clean = (value, max) => typeof value === 'string' && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
const hashText = text => hmacSha256Hex('knowledge-content-v1', text);
export async function approvedKnowledge(ctx, accountId) {
  const sources = await ctx.db.query('knowledgeSources').withIndex('by_account', q => q.eq('accountId', accountId)).take(101);
  const result = [];
  for (const source of sources.filter(row => row.status === 'published').slice(0, 100)) {
    for (const answer of source.approvedAnswers || []) result.push({ sourceKey:source.sourceKey, title:answer.question, revision:source.revision, text:answer.answer, reference:answer.label });
  }
  return result;
}
const draftSummary = d => ({ requestId: d.requestId, sourceKey: d.sourceKey, title: d.title, kind: d.kind, partial: !!d.partial, version: d.version, baseRevision: d.baseRevision, updatedAt: d.updatedAt, referenceCount: (d.references || []).length, textLength: (d.text || '').length });
// Session validity and grants are checked here, inside the actual mutation entry.
export async function executeKnowledge(ctx, a, now = Date.now()) {
  const session = await ctx.db.query('sessions').withIndex('by_token_hash', q => q.eq('tokenHash', a.tokenHash)).unique();
  if (!session || session.expiresAt <= now) return fail('sign_in_required');
  const account = await ctx.db.get(session.accountId);
  if (!account) return fail('sign_in_required');
  const membership = await ctx.db.query('ascendWorkspaceMembers').withIndex('by_account', q => q.eq('accountId', account._id)).unique();
  if (membership?.status === 'active') return fail('manager_required');
  const plan = await planFor(ctx, account._id);
  if (!['catalyst', 'ascend'].includes(plan) && account.email !== 'ahmed@bznsflowai.com') return fail('access_required');
  const accountId = account._id;
  // Publishing or withdrawing evidence fences already-computed automatic replies.
  const invalidate = async () => {
    if (!account.draftHash) return;
    const row = await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', account.draftHash)).unique();
    if (row?.accountId === accountId) await ctx.db.patch(row._id, { profileVersion:(row.profileVersion || 1)+1, updatedAt:now });
  };
  const sources = await ctx.db.query('knowledgeSources').withIndex('by_account', q => q.eq('accountId', accountId)).take(101);
  if (a.operation === 'list') {
    const drafts = await ctx.db.query('knowledgeImportDrafts').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'draft')).take(11);
    return ok({ sources: sources.map(({ approvedAnswers, ...row }) => ({ ...row, answerCount: (approvedAnswers || []).length })), drafts: drafts.map(draftSummary) });
  }
  if (a.operation === 'answers') return ok({ answers: await approvedKnowledge(ctx, accountId) });
  if (a.operation === 'open_draft') {
    if (!key(a.requestId)) return fail('invalid_import');
    const found = await ctx.db.query('knowledgeImportDrafts').withIndex('by_account_request', q => q.eq('accountId', accountId).eq('requestId', a.requestId)).unique();
    return found && found.status === 'draft' ? ok({ draft: found }) : fail('draft_not_found');
  }
  if (['open','archive'].includes(a.operation)) {
    const source = sources.find(row => row.sourceKey === a.sourceKey);
    if (!source) return fail('source_not_found');
    if (a.operation === 'open') {
      const revision = await ctx.db.query('knowledgeRevisions').withIndex('by_account_key_revision', q => q.eq('accountId', accountId).eq('sourceKey', source.sourceKey).eq('revision', source.revision)).unique();
      return revision ? ok({ source, revision }) : fail('source_not_found');
    }
    if (a.expectedRevision !== source.revision) return fail('source_changed');
    if (source.status === 'archived') return ok({ archived:true, replay:true });
    await ctx.db.patch(source._id, { status:'archived', updatedAt:now });
    await ctx.db.insert('knowledgeAudit', { accountId, sourceKey:source.sourceKey, action:'archived', revision:source.revision, at:now });
    await invalidate();
    return ok({ archived:true });
  }
  if (!key(a.requestId)) return fail('invalid_import');
  const draft = await ctx.db.query('knowledgeImportDrafts').withIndex('by_account_request', q => q.eq('accountId', accountId).eq('requestId', a.requestId)).unique();
  if (a.operation === 'save') {
    if (!key(a.sourceKey) || !clean(a.title, 200) || !a.title.trim() || !clean(a.text, 100000) || !a.text.trim() || !['paste','guided','website','file'].includes(a.kind) || !Array.isArray(a.references) || a.references.length > 500 || !a.references.every(ref => clean(ref.label, 200) && clean(ref.text, 100000) && (ref.question === undefined || clean(ref.question, 200)) && (ref.answer === undefined || clean(ref.answer, 2000))) || a.references.reduce((n, ref) => n + ref.text.length, 0) > 100000) return fail('invalid_import');
    if (draft && draft.sourceKey !== a.sourceKey) return fail('draft_changed');
    // A lost response must not turn the retry into a second draft or revision.
    const sameSave = draft && draft.status === 'draft' && draft.sourceKey === a.sourceKey && draft.title === a.title.trim() && draft.text === a.text && draft.kind === a.kind && draft.partial === !!a.partial && JSON.stringify(draft.references) === JSON.stringify(a.references);
    if (sameSave && draft.version === (a.version || 0) + 1) return ok({ draft, replay:true });
    if (draft && (draft.status !== 'draft' || draft.version !== a.version)) return fail('draft_changed');
    if (!draft && (await ctx.db.query('knowledgeImportDrafts').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'draft')).take(11)).length >= 10) return fail('knowledge_limit');
    const contentHash = hashText(a.text), duplicate = sources.find(row => row.contentHash === contentHash && row.status === 'published');
    const value = { baseRevision:draft?.baseRevision ?? sources.find(row => row.sourceKey === a.sourceKey)?.revision ?? 0, accountId, requestId: a.requestId, sourceKey: a.sourceKey, title: a.title.trim(), kind: a.kind, text: a.text, references: a.references, contentHash, partial: !!a.partial, status: 'draft', version: (draft?.version || 0) + 1, updatedAt: now };
    if (draft) await ctx.db.patch(draft._id, value); else await ctx.db.insert('knowledgeImportDrafts', value);
    return ok({ draft: value, duplicate: duplicate ? { title: duplicate.title, sourceKey: duplicate.sourceKey } : null });
  }
  if (!draft) return fail('draft_not_found');
  if (a.operation === 'cancel') {
    if (draft.status === 'published') return fail('draft_changed');
    await ctx.db.patch(draft._id, { status: 'cancelled', updatedAt: now }); return ok({ cancelled: true });
  }
  const source = sources.find(row => row.sourceKey === draft.sourceKey);
  if (a.operation === 'publish') {
    if (draft.status === 'published') return ok({ published: true, revision: source?.revision, replay: true });
    if (draft.status !== 'draft' || a.version !== draft.version) return fail('draft_changed');
    if (!a.confirmed || (draft.partial && !a.acceptPartial)) return fail('review_required');
    if (sources.some(row => row.sourceKey !== draft.sourceKey && row.status === 'published' && row.title.trim().toLocaleLowerCase() === draft.title.trim().toLocaleLowerCase())) return fail('conflicting_source');
    const duplicate = sources.find(row => row.contentHash === draft.contentHash && row.status === 'published' && row.sourceKey !== draft.sourceKey);
    if (duplicate) return fail('duplicate_source');
    if ((source?.revision || 0) !== (draft.baseRevision || 0) || (source && a.expectedRevision !== draft.baseRevision)) return fail('source_changed');
    if (!source && sources.length >= 100) return fail('knowledge_limit');
    const mapped = draft.references.filter(ref => ref.question?.trim() || ref.answer?.trim());
    if (mapped.length > 20 || mapped.some(ref => !ref.question?.trim() || !ref.answer?.trim())) return fail('invalid_question_mapping');
    const approvedAnswers = mapped.length ? mapped.map(ref => ({question:ref.question.trim(),answer:ref.answer.trim(),label:ref.label})) : draft.text.length <= 2000 ? [{question:draft.title,answer:draft.text,label:draft.title}] : [];
    if (!approvedAnswers.length) return fail('question_mapping_required');
    const normalizeQuestion = text => text.normalize('NFKC').toLocaleLowerCase().replace(/[؟?!.،,]/g, '').replace(/\s+/g, ' ').trim();
    const existingAnswers = sources.filter(row => row.sourceKey !== draft.sourceKey && row.status === 'published').flatMap(row => row.approvedAnswers || []);
    if (approvedAnswers.length + existingAnswers.length > 200) return fail('knowledge_question_limit');
    const questions = [...existingAnswers,...approvedAnswers].map(ref => normalizeQuestion(ref.question));
    if (new Set(questions).size !== questions.length) return fail('conflicting_question');
    if (approvedAnswers.some(ref => /(?:\b(?:prices?|costs?|charges?|fees?|rates?)\b|\bOMR\b|\bRO\b|\bAED\b|\bSAR\b|\bUSD\b|\b(?:dollars?|riyals?|rials?)\b|درهم|ريال|دولار|سعر|أسعار|اسعار|تكلف|رسوم|ثمن|بكم|ر\.?\s?ع\.?|[$€£])/i.test(ref.question+' '+ref.answer))) return fail('prices_require_catalog_review');
    const revision = (source?.revision || 0) + 1;
    const value = { accountId, sourceKey: draft.sourceKey, title: draft.title, kind: draft.kind, contentHash: draft.contentHash, status: 'published', revision, approvedAnswers, updatedAt: now };
    if (source) await ctx.db.patch(source._id, value); else await ctx.db.insert('knowledgeSources', { ...value, createdAt: now });
    await ctx.db.insert('knowledgeRevisions', { accountId, sourceKey: draft.sourceKey, revision, text: draft.text, references: draft.references, contentHash: draft.contentHash, createdAt: now });
    await ctx.db.patch(draft._id, { status: 'published', updatedAt: now });
    await ctx.db.insert('knowledgeAudit', { accountId, sourceKey: draft.sourceKey, action: 'published', revision, at: now });
    await invalidate();
    return ok({ published: true, revision });
  }
  return fail('invalid_action');
}
