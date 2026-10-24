// Ahmed's queue of free websites to deliver (Ahmed, 2026-10-23): every Ascend brief, soonest due first,
// and the moves that the owner's tracker shows. Only the BznsFlow admin can read or change it.
import { WEBSITE_STAGES } from '../config/website-brief.js';
import { publicProject } from './websiteBriefState.js';

const ok = value => ({ ok: true, value }), fail = reason => ({ ok: false, reason });
const ADMIN = 'ahmed@bznsflowai.com';
const DAY = 86400000;
const OPEN = WEBSITE_STAGES.filter(stage => stage !== 'live');
const URL_RE = /^https:\/\/[^\s<>"']+$/i;
const clip = (value, n) => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n) : '');

async function admin(ctx, sessionHash, now) {
  if (!/^[a-f0-9]{64}$/.test(sessionHash || '')) return 'sign_in_required';
  const session = await ctx.db.query('sessions').withIndex('by_token_hash', q => q.eq('tokenHash', sessionHash)).unique();
  if (!session || session.expiresAt <= now) return 'sign_in_required';
  const account = await ctx.db.get(session.accountId);
  return String(account?.email || '').toLowerCase().trim() === ADMIN ? null : 'admin_required';
}

async function row(ctx, project) {
  const [account, brief] = [await ctx.db.get(project.accountId), await ctx.db.query('websiteBriefs').withIndex('by_account', q => q.eq('accountId', project.accountId)).unique()];
  return { id: project._id, ...publicProject(project), note: project.note || '', createdAt: project.createdAt,
    email: account?.email || '', business: brief?.fields?.nameEn || brief?.fields?.nameAr || account?.email || '', briefVersion: brief?.version || 0,
    alternates: brief?.fields?.domainAlternates || [], phone: brief?.fields?.phone || '' };
}

export async function executeWebsiteAdmin(ctx, a, now = Date.now()) {
  const refused = await admin(ctx, a.sessionHash, now);
  if (refused) return fail(refused);

  if (a.operation === 'projects') {
    const open = [];
    for (const stage of OPEN) open.push(...await ctx.db.query('websiteProjects').withIndex('by_stage_due', q => q.eq('stage', stage)).take(200));
    open.sort((x, y) => x.dueAt - y.dueAt);
    const live = await ctx.db.query('websiteProjects').withIndex('by_stage_due', q => q.eq('stage', 'live')).order('desc').take(20);
    return ok({ open: await Promise.all(open.map(p => row(ctx, p))), live: await Promise.all(live.map(p => row(ctx, p))) });
  }

  if (a.operation === 'project_update') {
    const id = typeof a.projectId === 'string' ? ctx.db.normalizeId('websiteProjects', a.projectId) : null;
    const project = id ? await ctx.db.get(id) : null;
    if (!project) return fail('project_not_found');
    let patch;
    if (a.action === 'advance') {
      const next = WEBSITE_STAGES[WEBSITE_STAGES.indexOf(project.stage) + 1];
      if (!next) return fail('invalid_state');
      if (next === 'live' && !URL_RE.test(a.liveUrl || '')) return fail('live_url_required');
      // A delay explained to the owner ends when the website goes live.
      patch = { stage: next, stageAt: { ...project.stageAt, [next]: now }, ...(next === 'live' ? { liveUrl: a.liveUrl.slice(0, 300), delayReason: undefined } : {}) };
    } else if (a.action === 'set_due') {
      const dueAt = Number(a.dueAt), reason = clip(a.reason, 200);
      if (!Number.isSafeInteger(dueAt) || dueAt < now - DAY || dueAt > now + 60 * DAY) return fail('invalid_due');
      if (!reason) return fail('reason_required');
      patch = { dueAt, delayReason: reason };
    } else if (a.action === 'note') {
      patch = { note: clip(a.note, 500) || undefined };
    } else return fail('invalid_action');
    await ctx.db.patch(project._id, { ...patch, updatedAt: now });
    return ok({ project: await row(ctx, await ctx.db.get(project._id)) });
  }
  return fail('invalid_action');
}
