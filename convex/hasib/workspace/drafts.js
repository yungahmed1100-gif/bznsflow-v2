// Sends a manager-approved follow-up draft. Free text inside WhatsApp's 24-hour window, an
// approved no-variable utility template outside it; an opted-out customer is never messaged.
// Sector tables are named by the caller, so every workspace shares one send path.
import { owned } from '../../blueTenant.js';
import { openTaskOnce } from './tasks.js';
import { audit } from '../workspaceState.js';

const DAY = 86400000;

/**
 * @param {object} o
 * @param {object} o.draft the draft row (status 'draft')
 * @param {string} o.keyPrefix message and campaign key prefix, e.g. 'real-estate-draft'
 * @param {object} o.messageLinks fields written on the outbound blueMessages row (sector record + draft ids)
 * @param {object} o.recipientLinks fields written on the blueCampaignRecipients row
 * @param {string|null} o.contactId the customer the template goes to
 * @param {string} o.taskTable where a "template needed" task is opened
 * @param {string} o.handoffReason recorded when the manager takes the conversation over
 * @returns {Promise<string>} the draft's new send status
 */
export async function sendApprovedDraft(ctx, tenant, { draft, keyPrefix, messageLinks, recipientLinks, contactId, taskTable, handoffReason }, now) {
  const conversation = draft.conversationId ? await owned(ctx, draft.conversationId, tenant.accountId, 'blueConversations') : null;
  const windowOpen = !!conversation?.lastInbound && conversation.lastInbound + DAY > now;
  let status = 'template_required';
  if (conversation?.optout) status = 'blocked';
  else if (windowOpen && tenant.row?.integration?.id === conversation.integrationId) {
    const pending = await ctx.db.query('blueMessages').withIndex('by_integration_status', q => q.eq('integrationId', conversation.integrationId).eq('status', 'queued')).take(100);
    for (const job of pending) if (job.conversationId === conversation._id) await ctx.db.patch(job._id, { status: 'blocked', reason: 'manager_approved_follow_up' });
    const version = (conversation.version || 0) + 1;
    await ctx.db.patch(conversation._id, { takeover: true, handoffState: 'handling', handoffReason: conversation.handoffReason || handoffReason, handoffOpenedAt: conversation.handoffOpenedAt || now, version, updatedAt: now });
    const messageId = await ctx.db.insert('blueMessages', { key: `${keyPrefix}:${draft._id}`, integrationId: conversation.integrationId, accountId: tenant.accountId,
      conversationId: conversation._id, conversationVersion: version, profileVersion: tenant.row.profileVersion || 1, ...messageLinks,
      direction: 'out', text: draft.text, at: now, expiresAt: now + 30 * DAY, textExpiresAt: now + 30 * DAY,
      status: pending.length >= 100 ? 'blocked' : 'queued', manual: true, handoff: false, ...(pending.length >= 100 ? { reason: 'queue_limit' } : {}) });
    if (pending.length < 100 && tenant.workerFunction) await ctx.scheduler.runAfter(0, tenant.workerFunction, { jobId: messageId });
    status = pending.length >= 100 ? 'blocked' : 'queued';
  } else if (draft.templateId && conversation && contactId) {
    const template = await ctx.db.query('blueTemplates').withIndex('by_account_template', q => q.eq('accountId', tenant.accountId).eq('templateId', draft.templateId)).unique();
    const contact = await owned(ctx, contactId, tenant.accountId, 'blueContacts');
    if (template?.integrationId === conversation.integrationId && template.status === 'APPROVED' && template.category === 'UTILITY' && template.sendable && template.variables.length === 0
      && contact?.state === 'active' && !contact.optout && contact.waId && contact.numberHash && tenant.row?.integration?.id === conversation.integrationId) {
      const campaignId = await ctx.db.insert('blueCampaigns', { accountId: tenant.accountId, integrationId: conversation.integrationId, requestId: `${keyPrefix}:${draft._id}`,
        name: template.name, origin: 'chat', template: { templateId: template.templateId, name: template.name, language: template.language, category: template.category,
          parameterFormat: template.parameterFormat, body: template.body, ...(template.header ? { header: template.header } : {}), ...(template.footer ? { footer: template.footer } : {}) },
        mapping: [], status: 'processing', scheduledAt: now, timezone: 'Asia/Muscat', recipientCount: 1, createdAt: now, updatedAt: now, startedAt: now });
      const recipientId = await ctx.db.insert('blueCampaignRecipients', { campaignId, accountId: tenant.accountId, integrationId: conversation.integrationId,
        contactId: contact._id, ...recipientLinks, numberHash: contact.numberHash, waId: contact.waId, name: contact.ownerName || contact.profileName || '', parameters: [],
        status: 'queued', attempts: 0, nextAttemptAt: now, at: now, updatedAt: now, expiresAt: now + 30 * DAY });
      if (tenant.workerFunction) await ctx.scheduler.runAfter(0, tenant.workerFunction, { campaignJobId: recipientId });
      status = 'queued_template';
    }
  }
  if (status === 'template_required') await openTaskOnce(ctx, taskTable, { accountId: tenant.accountId, kind: 'template_required', entityType: 'draft', entityId: draft._id,
    reason: 'An approved utility template is needed outside the WhatsApp 24-hour window' }, now);
  return status;
}

/**
 * Draft-mode rules: one draft per firing. An unsent draft whose cause is gone is cancelled; a firing
 * with no draft yet gets one from `insert(item)`.
 * @param {{ rules: Array<{rule:{mode:string}, key:string}>, drafts: Array<object>, insert: (item:object) => Promise<unknown> }} o
 */
export async function reconcileRuleDrafts(ctx, { rules, drafts, insert, now }) {
  const draftKeys = new Set(rules.filter(i => i.rule.mode === 'draft').map(i => i.key));
  const existing = new Map(drafts.filter(d => d.ruleKey).map(d => [d.ruleKey, d]));
  for (const d of existing.values()) if (d.status === 'draft' && !draftKeys.has(d.ruleKey)) await ctx.db.patch(d._id, { status: 'cancelled', version: d.version + 1, updatedAt: now });
  for (const item of rules) if (item.rule.mode === 'draft' && !existing.has(item.key)) await insert(item);
}

/**
 * A manager approves a draft: it goes through the shared send path and records who approved it.
 * `edit` may replace the text or name a template (Fitness and Dental let the manager edit first).
 * @param {object} o
 * @param {object} o.row the draft row
 * @param {object} [o.edit] { text?, templateId? } already bounded by the caller
 * @param {(row:object) => Promise<{ messageLinks:object, recipientLinks:object, contactId:string|null }>} o.links the sector's message links
 * @returns {Promise<object>} the patched row
 */
export async function approveDraft(ctx, tenant, actor, { row, edit = {}, keyPrefix, handoffReason, taskTable, links }, now) {
  const draft = { ...row, ...(edit.text ? { text: edit.text } : {}), ...(edit.templateId ? { templateId: edit.templateId } : {}) };
  const status = await sendApprovedDraft(ctx, tenant, { draft, keyPrefix, handoffReason, taskTable, ...(await links(row)) }, now);
  await ctx.db.patch(row._id, { ...(edit.text ? { text: draft.text } : {}), ...(edit.templateId ? { templateId: draft.templateId } : {}), status, approvedBy: actor.actorAccountId, approvedAt: now, version: row.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, 'draft_approved', 'draft', row._id, now, status);
  return ctx.db.get(row._id);
}

/** The refusal for a draft that is not waiting, or whose screen is stale; null when it may be approved. */
export const draftRefusal = (row, a) => !row ? 'draft_not_found' : row.status !== 'draft' || row.version !== a.version ? (row.version !== a.version ? 'draft_conflict' : 'invalid_draft_transition') : null;
