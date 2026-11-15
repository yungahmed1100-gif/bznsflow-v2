// Resending a broadcast's failed recipients: a new broadcast with the same template and the values each
// person was first sent, limited to the people who never got it. Everyone is checked again as if new
// (consent, opt-out, number, today's sending limit), and one failure can be resent only once.
import { owned } from './blueTenant.js';
import { DAY, displayName } from './blueContacts.js';
import { marketingEligibility } from './blueAudienceState.js';
import { messagingReady } from './blueMessagingState.js';
import { SECTOR_DRAFT_FIELDS } from './hasib/workspace/sectors.js';
import { formatPhone } from '../src/lib/dashboard/phone.js';
import { mediaHeaderOf } from '../config/layla-templates.js';

// "Not delivered" and "Not sent". An unknown outcome ('ambiguous') may have arrived, so it is never resent.
export const RESEND_STATUSES = Object.freeze(['failed', 'blocked']);
// Only a broadcast that has stopped can be resent; a cancelled one was the owner's own choice.
const RESENDABLE_CAMPAIGN = ['completed', 'blocked'];
const ok = value => ({ ok: true, value }),
  fail = reason => ({ ok: false, reason });

const resendableCampaign = campaign => campaign.origin === 'broadcast' && RESENDABLE_CAMPAIGN.includes(campaign.status);

/** The recipients of an ended broadcast who did not get the message and have not been resent yet. */
export async function resendableRecipients(ctx, campaign, recipientsFor) {
  if (!resendableCampaign(campaign)) return [];
  const rows = [];
  // A broadcast stopped before or during sending leaves people waiting who will never be reached.
  const statuses = campaign.status === 'blocked' ? [...RESEND_STATUSES, 'pending', 'queued'] : RESEND_STATUSES;
  for (const status of statuses)
    for (const r of await recipientsFor(ctx, campaign._id, status))
      if (!r.resentIn && !SECTOR_DRAFT_FIELDS.some(field => r[field])) rows.push(r);
  return rows;
}

/** A recipient's stored values still fit the template when every variable has one and none is left over. */
function parametersFit(template, parameters) {
  const have = new Set(parameters.map(p => `${p.component}:${p.key}`));
  return have.size === template.variables.length && template.variables.every(v => have.has(`${v.component}:${v.key}`));
}

/**
 * Owner operation `campaign_resend`. Without `confirm` it only reports who would be sent to.
 * @param tenant the caller's resolved tenant
 * @param helpers the campaign module's own helpers and limits, passed in so the two files do not import each other
 */
export async function resendCampaign(ctx, a, tenant, now, helpers) {
  const { accountId, integration, row } = tenant;
  const { broadcastEnabled, publicCampaign, sentInLastDay, recipientsFor, maxRecipients } = helpers;
  const source = await owned(ctx, a.campaignId, accountId, 'blueCampaigns');
  if (!source) return fail('campaign_not_found');
  if (a.confirm === true) {
    if (!/^[a-f0-9-]{36}$/.test(a.requestId || '')) return fail('invalid_request');
    // The browser's request id makes a double-clicked confirmation create one broadcast.
    const prior = await ctx.db
      .query('blueCampaigns')
      .withIndex('by_account_request', q => q.eq('accountId', accountId).eq('requestId', a.requestId))
      .unique();
    if (prior) return ok({ campaign: await publicCampaign(ctx, prior) });
  }
  if (!integration || !tenant.connected || !messagingReady(row, now)) return fail('connection_not_ready');
  if (source.integrationId !== integration.id || !resendableCampaign(source)) return fail('campaign_not_resendable');
  const sendingAvailable = await broadcastEnabled(ctx);
  if (a.confirm === true && !sendingAvailable) return fail('broadcast_unavailable');
  const template = await ctx.db
    .query('blueTemplates')
    .withIndex('by_account_template', q => q.eq('accountId', accountId).eq('templateId', source.template.templateId))
    .unique();
  if (
    !template ||
    template.integrationId !== integration.id ||
    !template.sendable ||
    template.status !== 'APPROVED' ||
    template.category !== 'MARKETING'
  )
    return fail('template_not_sendable');

  // The header file: a fresh copy when the dashboard API supplies one, otherwise the first broadcast's file.
  const format = mediaHeaderOf(template);
  const supplied = format && a.headerMediaId ? await owned(ctx, a.headerMediaId, accountId, 'blueCampaignMedia') : null;
  if (a.headerMediaId && (!supplied || supplied.campaignId || supplied.format !== format))
    return fail('header_media_invalid');
  const kept = format && !supplied && source.headerMediaId ? await ctx.db.get(source.headerMediaId) : null;
  const stored = kept && kept.format === format && (await ctx.db.system.get(kept.storageId)) ? kept : null;
  const media = supplied || stored;

  const rows = await resendableRecipients(ctx, source, recipientsFor);
  const eligible = [],
    excluded = [];
  for (const r of rows) {
    const contact = await ctx.db.get(r.contactId);
    const live = contact?.state === 'active' && contact.accountId === accountId;
    const shown = {
      contactId: String(r.contactId),
      name: live ? displayName(contact).name : r.name || '',
      number: live ? formatPhone(contact.waId) : r.waId ? formatPhone(r.waId) : '',
    };
    const reason =
      marketingEligibility(live ? contact : null) ||
      (contact.numberHash !== r.numberHash ? 'contact_changed' : null) ||
      (parametersFit(template, r.parameters) ? null : 'missing_variable');
    if (reason) excluded.push({ ...shown, reason });
    else eligible.push({ ...shown, contact, recipient: r });
  }
  const allowance = Number.isFinite(a.allowance) ? a.allowance : 0;
  const cap = Math.min(maxRecipients, Math.max(0, allowance - (await sentInLastDay(ctx, integration.id, now))));
  if (a.confirm !== true)
    return ok({
      preview: {
        eligible: eligible.map(({ contact, recipient, ...e }) => e),
        excluded,
        cap,
        allowance,
        sendingAvailable,
        templateId: template.templateId,
        needsHeaderMedia: !!format && !media,
      },
    });

  if (format && !media) return fail('header_media_required');
  if (!eligible.length) return fail('no_eligible_recipients');
  if (eligible.length > cap) return fail('messaging_limit');
  const campaignId = await ctx.db.insert('blueCampaigns', {
    accountId,
    integrationId: integration.id,
    requestId: a.requestId,
    name: source.name,
    origin: 'broadcast',
    resendOf: source._id,
    template: {
      templateId: template.templateId,
      name: template.name,
      language: template.language,
      category: template.category,
      parameterFormat: template.parameterFormat,
      body: template.body,
      ...(template.header ? { header: template.header } : {}),
      ...(template.footer ? { footer: template.footer } : {}),
    },
    ...(media ? { headerMediaId: media._id } : {}),
    mapping: source.mapping,
    status: 'scheduled',
    scheduledAt: now,
    timezone: source.timezone,
    recipientCount: eligible.length,
    createdAt: now,
    updatedAt: now,
  });
  // The file now belongs to the newest broadcast using it, so it is kept for as long as that one needs it.
  if (media) await ctx.db.patch(media._id, { campaignId });
  for (const { contact, recipient } of eligible) {
    await ctx.db.insert('blueCampaignRecipients', {
      campaignId,
      accountId,
      integrationId: integration.id,
      contactId: contact._id,
      numberHash: contact.numberHash,
      waId: contact.waId,
      name: displayName(contact).name,
      parameters: recipient.parameters,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: now,
      at: now,
      updatedAt: now,
      expiresAt: now + 30 * DAY,
    });
    await ctx.db.patch(recipient._id, { resentIn: campaignId });
  }
  return ok({ campaign: await publicCampaign(ctx, await ctx.db.get(campaignId)), excluded });
}
