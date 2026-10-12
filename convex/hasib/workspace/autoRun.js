// Hasib's scheduled run, shared by every sector that lets rule messages send themselves: the
// drafts whose rule is set to Auto go out through the shared fences (autoSend.js), oldest first,
// bounded per run. A draft that may not go out stays a draft with the reason it was held.
import { sendAutomatedDraft } from './autoSend.js';
import { audit } from '../workspaceState.js';

export const MAX_SENDS_PER_RUN = 10;

/**
 * @param {object} o
 * @param {Array<object>} o.drafts the sector's draft rows
 * @param {Array<{id:string, enabled:boolean, mode:string}>} o.rules the sector's rules
 * @param {string} o.keyPrefix message key prefix, e.g. 'media-draft'
 * @param {(draft:object) => object} o.links fields written on the outbound message (sector record + draft ids)
 * @param {object} o.actor the automation actor (agent 'hasib')
 * @returns {Promise<{ sent: number, skipped: number }>}
 */
export async function sendAutoRuleDrafts(ctx, tenant, { drafts, rules, keyPrefix, links, actor }, now) {
  const auto = new Set(rules.filter(r => r.enabled && r.mode === 'auto').map(r => r.id));
  let sent = 0, skipped = 0;
  if (!auto.size) return { sent, skipped };
  const waiting = drafts.filter(d => d.status === 'draft' && auto.has(d.ruleId)).sort((a, b) => a.createdAt - b.createdAt);
  for (const draft of waiting) {
    if (sent >= MAX_SENDS_PER_RUN) break;
    const result = await sendAutomatedDraft(ctx, tenant, { draft, keyPrefix, messageLinks: links(draft) }, now);
    if (result.skip) {
      skipped++;
      if (draft.autoSkip !== result.skip) await ctx.db.patch(draft._id, { autoSkip: result.skip, updatedAt: now });
      continue;
    }
    await ctx.db.patch(draft._id, { status: 'queued', sentBy: 'automation', autoSkip: undefined, version: draft.version + 1, updatedAt: now });
    await audit(ctx, tenant, actor, 'draft_auto_sent', 'draft', draft._id, now, `rule:${draft.ruleId}`);
    sent++;
  }
  return { sent, skipped };
}
