import { numberHash, hmacSha256Hex } from './hash.js';

const TABLES = { contacts: 'blueContacts', conversations: 'blueConversations', messages: 'blueMessages', catalog: 'blueCatalogEntries' };
const PENDING = new Set(['queued', 'pending', 'attempting', 'ambiguous']);
const strip = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['_id', '_creationTime'].includes(key)));

// Operator-only transaction. Source credentials and session state have no input path.
export async function importOwnerSnapshot(ctx, { snapshot, draftHash }, now, secret) {
  if (snapshot?.format !== 1 || snapshot.source !== 'blue-owner-read-only' || snapshot.ownerEmail !== 'ahmed@bznsflowai.com') throw Error('owner_snapshot_invalid');
  if (!/^[a-f0-9]{64}$/.test(draftHash)) throw Error('owner_draft_invalid');
  for (const key of Object.keys(TABLES)) {
    if (!Array.isArray(snapshot[key]) || snapshot[key].length !== snapshot.expected?.[key] || snapshot[key].length > 5000) throw Error('owner_count_mismatch');
    if (new Set(snapshot[key].map(row => row._id)).size !== snapshot[key].length) throw Error('owner_duplicate_source_id');
  }
  // A deleted opted-out number cannot be rehashed without the original number.
  // Never copy a Blue secret or silently weaken suppression to make import pass.
  if (snapshot.contacts.some(r => r.state === 'deleted' && r.optout)) throw Error('owner_suppression_remap_required');
  if (snapshot.exclusions?.media) throw Error('owner_media_migration_required');
  if (snapshot.messages.some(r => PENDING.has(r.status) || r.media || r.intent)) throw Error('owner_pending_effect_refused');
  const account = await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', snapshot.ownerEmail)).unique();
  if (!account) throw Error('owner_account_missing');
  const previous = await ctx.db.query('greenOwnerImports').withIndex('by_owner', q => q.eq('accountId', account._id)).unique();
  const fingerprint = hmacSha256Hex(secret, JSON.stringify(snapshot));
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw Error('owner_snapshot_changed_reconcile_required');
    for (const row of previous.rows) {
      const document = await ctx.db.get(row.destinationId);
      if (!document || (document.accountId !== account._id && document.ownerKey !== String(account._id))) throw Error('owner_import_integrity_failed');
    }
    return { counts: previous.counts, repeated: true, connectionRequired: true };
  }
  for (const table of ['blueContacts','blueConversations','blueMessages']) {
    const index = table === 'blueContacts' ? 'by_account_state_activity' : table === 'blueMessages' ? 'by_account_at' : 'by_account_updated';
    if (await ctx.db.query(table).withIndex(index, q => q.eq('accountId', account._id)).first()) throw Error('owner_destination_not_empty');
  }
  const contactIds = new Map(), conversationIds = new Map(), rows = [];
  const insert = async (kind, sourceId, value) => {
    const destinationId = await ctx.db.insert(TABLES[kind], value);
    rows.push({ sourceTable: TABLES[kind], sourceId, destinationId });
    return destinationId;
  };
  for (const row of snapshot.contacts) {
    const data = strip(row);
    if (!['active','deleted'].includes(data.state) || (data.state === 'active' && !/^\d{7,15}$/.test(data.waId || ''))) throw Error('owner_contact_invalid');
    if (data.state === 'deleted' && (data.waId || data.ownerName || data.customerName || data.profileName || data.fields?.length)) throw Error('owner_deleted_pii_refused');
    const value = { ...data, accountId: account._id, key: data.state === 'deleted' ? `import-deleted:${row._id}` : `${account._id}:${data.waId}`,
      numberHash: data.state === 'deleted' ? data.numberHash : numberHash(secret, account._id, data.waId) };
    contactIds.set(row._id, await insert('contacts', row._id, value));
  }
  for (const row of snapshot.conversations) {
    const contactId = row.contactId ? contactIds.get(row.contactId) : undefined;
    if (row.contactId && !contactId) throw Error('owner_contact_relationship_missing');
    conversationIds.set(row._id, await insert('conversations', row._id, { ...strip(row), accountId: account._id,
      key: `${row.integrationId}:${row.number}`, ...(contactId ? { contactId } : {}) }));
  }
  for (const row of snapshot.messages) {
    const conversationId = conversationIds.get(row.conversationId);
    if (!conversationId || row.integrationId !== snapshot.conversations.find(c => c._id === row.conversationId)?.integrationId) throw Error('owner_message_relationship_missing');
    await insert('messages', row._id, { ...strip(row), accountId: account._id, conversationId });
  }
  for (const row of snapshot.catalog) await insert('catalog', row._id, { ...strip(row), ownerKey: String(account._id) });
  let draft = account.draftHash ? await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', account.draftHash)).unique() : null;
  if (draft?.integration || draft?.profile) throw Error('owner_setup_conflict');
  if (snapshot.profile) {
    if (draft) await ctx.db.patch(draft._id, { profile: snapshot.profile, status: 'draft', updatedAt: now });
    else {
      await ctx.db.insert('blueReviewSessions', { accountId: account._id, sessionHash: draftHash, profile: snapshot.profile, status: 'draft', attempts: 0, createdAt: now, updatedAt: now, expiresAt: now + 365 * 86400000 });
      await ctx.db.patch(account._id, { draftHash });
    }
  }
  const business = await ctx.db.query('blueBusinessSettings').withIndex('by_account', q => q.eq('accountId', account._id)).unique();
  if (!business) await ctx.db.insert('blueBusinessSettings', { accountId: account._id, timezone: snapshot.timezone, updatedAt: now });
  const brake = await ctx.db.query('blueMessagingSettings').withIndex('by_key', q => q.eq('key', 'global')).unique();
  if (brake) await ctx.db.patch(brake._id, { enabled: false }); else await ctx.db.insert('blueMessagingSettings', { key: 'global', enabled: false });
  await ctx.db.insert('greenOwnerImports', { accountId: account._id, ...(snapshot.integration ? { sourceIntegration: { id: snapshot.integration.id, phone: snapshot.integration.phone, waba: snapshot.integration.waba } } : {}), fingerprint, counts: snapshot.expected, rows, importedAt: now });
  return { counts: snapshot.expected, repeated: false, connectionRequired: true };
}

// Rebind only the source's current verified number after a fresh Green authorization.
// No transport brake is enabled here and historical outbound rows cannot be queued.
export async function bindOwnerImport(ctx) {
  const account = await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', 'ahmed@bznsflowai.com')).unique();
  if (!account?.draftHash) throw Error('owner_connection_required');
  const imported = await ctx.db.query('greenOwnerImports').withIndex('by_owner', q => q.eq('accountId', account._id)).unique();
  const draft = await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', account.draftHash)).unique();
  const target = draft?.integration;
  if (!imported?.sourceIntegration || !target || !['connected','paused'].includes(draft.status) || !draft.connectionChecks?.routing || !draft.connectionChecks?.registered || !draft.connectionChecks?.path) throw Error('owner_connection_unverified');
  if (target.phone !== imported.sourceIntegration.phone || target.waba !== imported.sourceIntegration.waba) throw Error('owner_binding_mismatch');
  if (imported.boundIntegrationId && imported.boundIntegrationId !== target.id) throw Error('owner_binding_changed');
  if (imported.boundIntegrationId === target.id) return { bound: true, repeated: true };
  for (const mapping of imported.rows) {
    if (!['blueConversations','blueMessages'].includes(mapping.sourceTable)) continue;
    const row = await ctx.db.get(mapping.destinationId);
    if (!row || row.accountId !== account._id) throw Error('owner_import_integrity_failed');
    if (row.integrationId !== imported.sourceIntegration.id) continue;
    if (mapping.sourceTable === 'blueMessages' && PENDING.has(row.status)) throw Error('owner_pending_effect_refused');
    const key = mapping.sourceTable === 'blueConversations' ? `${target.id}:${row.number}` : row.key.replace(`:${row.integrationId}:`, `:${target.id}:`);
    const collision = await ctx.db.query(mapping.sourceTable).withIndex('by_key', q => q.eq('key', key)).unique();
    if (collision && collision._id !== row._id) throw Error('owner_binding_collision');
    await ctx.db.patch(row._id, { integrationId: target.id, key });
  }
  await ctx.db.patch(imported._id, { boundIntegrationId: target.id });
  return { bound: true, repeated: false };
}
