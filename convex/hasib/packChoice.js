// Choosing an industry changes more than the setting: a clinic's chat-text rule, its internal stock,
// and services that become chargeable items. Settings, Ahmed's grant and sign-in all go through here.
import { shortenClinicalText, textRetentionFor, CLINICAL_TEXT_RETENTION_MS } from '../blueContacts.js';
import { syncServiceItems } from './serviceSync.js';
import { STOCK_SOURCE } from './stockSync.js';
import { DEFAULT_SETTINGS } from './shared.js';
import { hasibPack, isLivePack } from '../../config/hasib-packs.js';
import { grantLive } from '../grantStatus.js';
import { ensureAutomation, AUTOMATION_PACKS } from './workspace/schedule.js';

/** What choosing an industry changes beyond the setting itself. */
export async function applyPackChoice(ctx, accountId, pack, now) {
  // A clinical industry's 24-hour chat-text rule applies to recent messages at once.
  if (textRetentionFor(null, pack.id) === CLINICAL_TEXT_RETENTION_MS) {
    // Newest first, up to 2,000 messages in this change; a busier account finishes with blueHasib:shortenDentalText.
    let next = now + 1;
    for (let page = 0; page < 4 && next !== null; page++) next = (await shortenClinicalText(ctx, accountId, now, next)).next;
  }
  // Internal stock (a clinic's supplies) leaves Layla's catalog; treatments become chargeable.
  if (pack.internalStock) {
    const published = await ctx.db.query('blueCatalogEntries').withIndex('by_owner_status_order', q => q.eq('ownerKey', String(accountId)).eq('status', 'approved')).take(500);
    for (const entry of published.filter(e => e.source === STOCK_SOURCE)) await ctx.db.patch(entry._id, { status: 'archived', updatedAt: now });
  }
  if (pack.serviceItems) await syncServiceItems(ctx, accountId, now);
}

/**
 * Put an account on a live industry, as an operator grant does. `onlyIfUnset` keeps a sector the owner already chose.
 * @returns {Promise<boolean>} whether the sector was set
 */
export async function setAccountPack(ctx, accountId, packId, now, { onlyIfUnset = false } = {}) {
  if (!isLivePack(packId)) return false;
  const settings = await ctx.db.query('hasibSettings').withIndex('by_account', q => q.eq('accountId', accountId)).unique();
  if (onlyIfUnset && settings?.packId) return false;
  if (settings?.packId === packId) return false;
  if (settings) await ctx.db.patch(settings._id, { packId, updatedAt: now });
  else await ctx.db.insert('hasibSettings', { accountId, ...DEFAULT_SETTINGS, packId, updatedAt: now });
  await applyPackChoice(ctx, accountId, hasibPack(packId), now);
  // A new studio starts on its sector's defaults, so Hasib's schedule knows it.
  if (AUTOMATION_PACKS.has(packId)) await ensureAutomation(ctx, accountId, packId, true, now);
  return true;
}

/** A sector granted before the account existed reaches it at sign-in, unless the owner has chosen one. */
export async function applyGrantedPack(ctx, account, now) {
  const email = String(account?.email || '').toLowerCase().trim();
  if (!email) return false;
  const grant = await ctx.db.query('blueAccessGrants').withIndex('by_email', q => q.eq('email', email)).unique();
  if (!grantLive(grant, now) || grant.plan !== 'ascend' || !grant.packId) return false;
  return setAccountPack(ctx, account._id, grant.packId, now, { onlyIfUnset: true });
}
