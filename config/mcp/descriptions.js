// What each MCP tool does, written for the assistant choosing a tool. Keep each
// line short: discovery sends every description to the client on every connection.
// The registry appends the approval note and the "business data" reminder.

export const DESCRIPTIONS = {
  // Start here
  workspace_summary:
    "Start here. Plan, sector, channels, setup progress, open handoffs, approvals waiting for the owner, this connection's permissions and the tool groups available.",
  tools_describe:
    "Full input schema, required fields and approval rule for one tool. Use when a tool's advertised fields are summarised.",
  requests_status:
    'Durable outcome of a write by runId: completed, pending, failed, outcome_unknown, approval_required or approval_expired, with delivery receipts for queued messages.',
  requests_list:
    "This connection's recent and waiting requests, newest first, with approval links. Use to find a runId or see what still needs the owner.",
  requests_cancel: "Withdraw one of this connection's requests that is still waiting for approval. Nothing runs.",

  // Business profile and BznsBrain
  business_state: 'Business profile, the draft and published bzns.md document and their versions.',
  business_profile:
    'Replace the reviewed business profile (name, sector, services, prices, hours, location, contact, tone).',
  business_bzns_save: 'Save a new draft of the bzns.md business document. Needs the current version.',
  business_bzns_publish: 'Publish bzns.md so Layla answers from it. Needs the current version.',
  business_save_progress: 'Record which setup journey step the owner has reached.',
  brain_state: 'BznsBrain review queue: proposals from customer questions, behaviour settings, publish state.',
  brain_accept: 'Accept a BznsBrain proposal into bzns.md or the catalog. Optional edited text, section or entry.',
  brain_dismiss: 'Dismiss a BznsBrain proposal.',
  brain_behaviour_save: "Save Layla's behaviour: tone, whether she asks the name, what she asks, handoff note.",
  brain_step: 'Record the BznsBrain setup step reached (0-6).',
  brain_test:
    'Ask Layla a test question against the draft or published setup. Returns her reply, sources and what she would capture. Sends nothing to customers.',
  brain_publish: 'Publish the bzns.md draft and catalog drafts together so Layla uses them.',

  // Catalog
  catalog_list: 'Catalog entries (services, products, offers) with status and prices. Paged.',
  catalog_match: 'Find catalog entries matching a customer question or product name.',
  catalog_summary: 'Catalog counts by status and what is waiting to publish.',
  catalog_save: 'Create or update one catalog entry as a draft.',
  catalog_saveMany: 'Create or update up to 50 catalog entries as drafts.',
  catalog_archive: 'Archive a catalog entry so Layla stops offering it.',
  catalog_approve: 'Approve a draft catalog entry for the next publish.',
  catalog_discard: "Discard a draft catalog entry's unpublished changes.",
  catalog_publish: 'Publish approved catalog entries so Layla uses them.',

  // Knowledge
  knowledge_list: 'Knowledge sources Layla answers from, and drafts in progress.',
  knowledge_answers: 'Every approved question and answer Layla can use.',
  knowledge_open: 'Open one knowledge source and its current revision by sourceKey.',
  knowledge_open_draft: 'Open a knowledge draft by its requestId.',
  knowledge_save:
    'Save a knowledge draft (title, text, kind, references with question/answer pairs). requestId names the draft; idempotencyKey dedupes this call.',
  knowledge_publish: 'Publish a knowledge draft. Needs version and confirmed:true.',
  knowledge_cancel: 'Cancel a knowledge draft.',
  knowledge_archive: 'Archive a published knowledge source. Needs expectedRevision.',

  // Conversations and customers
  dashboard_overview: "Today's numbers: conversations, open handoffs, customers, channel status and timezone.",
  dashboard_conversations: 'Recent customer conversations with last message and status. Search by name or number.',
  dashboard_handoffs: 'Conversations waiting for the team (Layla handed them over).',
  dashboard_thread: 'Messages in one conversation. Use before to page back.',
  dashboard_contacts: 'Customer list with fields and qualification. Search and filter by status.',
  dashboard_contact_update: "Edit a customer's name, custom fields or qualification.",
  dashboard_contact_delete: 'Delete one customer record. Needs confirm:true.',
  dashboard_import_contacts: 'Add up to 100 customers from rows (WhatsApp number, name, country, fields).',
  dashboard_takeover_handoff: 'Take over a handed-off conversation so the team replies instead of Layla.',
  dashboard_return_handoff: 'Give a conversation back to Layla.',
  dashboard_resolve_handoff: 'Mark a handoff resolved.',
  dashboard_set_timezone: 'Set the business timezone (IANA name such as Asia/Muscat).',
  dashboard_export_chat: 'Export one conversation as a protected download link.',
  dashboard_export_contacts: 'Export the customer list as a protected download link. Paged by cursor.',
  dashboard_export_account: 'Export all account data as a protected download link. Paged by cursor.',

  // Broadcasts
  dashboard_templates: 'Approved WhatsApp message templates available for broadcasts.',
  dashboard_sync_templates: 'Refresh templates from Meta.',
  dashboard_campaigns: 'WhatsApp broadcasts with status and counts.',
  dashboard_campaign_detail: "One broadcast's recipients and delivery receipts.",
  dashboard_campaign_preview:
    'Preview a WhatsApp broadcast: rendered message per recipient and who would be skipped. Sends nothing.',
  dashboard_campaign_create:
    'Send or schedule a WhatsApp template broadcast to up to 100 customers. Needs confirm:true.',
  dashboard_campaign_cancel: 'Cancel a scheduled or running broadcast.',

  // Messaging channel
  messaging_state: 'WhatsApp and Instagram channel status: connected, paused, Layla on or off.',
  messaging_check_connection: 'Re-check the WhatsApp connection with Meta (read only).',
  messaging_activate: 'Turn Layla on for the connected channel.',
  messaging_pause: 'Pause Layla. Customers stop getting automatic replies.',
  messaging_disconnect: 'Disconnect the channel from BznsFlow.',
  messaging_manual_reply:
    'Send a WhatsApp or Instagram reply as the business in one conversation (within the 24-hour window).',
  messaging_takeover: 'Stop Layla replying in one conversation.',
  messaging_resume_conversation: 'Let Layla reply again in one conversation.',

  // Files
  files_upload_contacts:
    'Stage a UTF-8 CSV (phone,name,country headers, up to 100 rows). Returns a 15-minute transferId; nothing is imported yet.',
  files_read: 'Read a staged or exported transfer by transferId.',
  files_import_contacts: 'Import the customers in a staged CSV transfer.',

  // Onboarding and setup
  onboarding_get: 'Catalyst and Ascend setup progress: step reached, completion, sector and VAT settings.',
  onboarding_save:
    'Save setup progress for catalyst or ascend: step (0-3), completed, sector packId, stock policy or VAT. Needs the current version.',

  // Website (Ascend)
  website_state: 'The Ascend website brief: draft, submitted version, build stage, domain and mailbox.',
  website_save_draft:
    'Save the website brief draft (business, pages, style, domain wishes). Files are added on the website.',
  website_domain_check: 'Check whether a domain name is available for the free Ascend website.',
  website_submit: 'Submit the website brief to the BznsFlow team to build.',
  website_resend: 'Resend the website brief confirmation email to the owner.',

  // Email campaigns (Rasil, Ascend)
  email_state: 'Email campaigns: sending domain status, subscriber counts, monthly usage and cap.',
  email_subscribers: 'Email subscribers, filter by status. Paged.',
  email_subscribers_import: 'Add up to 500 email subscribers with a consent record (source, date, purpose, attested).',
  email_subscriber_unsubscribe: 'Unsubscribe one email subscriber.',
  email_sender_save: 'Set the sender name, from address and reply-to for email campaigns.',
  email_draft:
    "Write an email campaign subject and body from a short brief, using the business's facts. Sends nothing.",
  email_campaign_preview: 'Preview an email campaign and the number of subscribers it would reach. Sends nothing.',
  email_campaigns: 'Email campaigns with status and counts.',
  email_campaign_detail: "One email campaign's delivery, open and bounce counts.",
  email_campaign_create: 'Send or schedule an email campaign to all subscribed contacts. Needs confirm:true.',
  email_campaign_cancel: 'Cancel a scheduled email campaign.',
  email_domain_check: "Re-check the sending domain's DNS verification.",

  // Billing
  billing_state: 'Plan, subscription status, renewal date and recent payments.',
  billing_checkout_link: 'A Paymob payment page link for the owner to pay or renew the plan in the browser.',

  // Hasib: shared operations
  hasib_overview: 'Hasib summary for the live sector: sales, orders, stock and what needs attention.',
  hasib_today: "Today's work list: orders to fulfil, follow-ups due, low stock.",
  hasib_items: 'Products and services with variants, prices and stock. Search and filter by kind.',
  hasib_item_save: 'Create or update a product or service and its variants (prices in minor units, e.g. baisa).',
  hasib_item_archive: 'Archive a product or service.',
  hasib_item_photo: 'Attach an already uploaded photo to an item.',
  hasib_items_import: 'Create up to 25 products with variants and opening stock.',
  hasib_low_stock: 'Variants at or below their reorder point.',
  hasib_services_sync: 'Copy services from the catalog into Hasib items.',
  hasib_stock_move: 'Adjust stock for one variant (positive or negative delta, reason).',
  hasib_stock_moves: 'Stock history for one variant.',
  hasib_orders: 'Orders, filter by status. Paged.',
  hasib_order: 'One order with lines, payments and status history.',
  hasib_order_create: 'Create an order with lines, customer, fulfilment and delivery fee (minor units).',
  hasib_order_status: 'Move an order to a new status (confirmed, ready, delivered, cancelled…). Needs version.',
  hasib_payment_record: 'Record a payment against an order (amount in minor units, method, reference).',
  hasib_contact_summary: "One customer's orders, spend and open items.",
  hasib_conversation_orders: 'Orders linked to one conversation.',
  hasib_expenses: 'Expenses for a period (e.g. 2026-11).',
  hasib_expense_create: 'Record an expense (category, amount and VAT in minor units, vendor, date).',
  hasib_expense_void: 'Void an expense.',
  hasib_insights: 'Profit, top items, lost demand and trends for a period.',
  hasib_followups: 'Customer follow-ups, filter by status.',
  hasib_followup_save: 'Create or update a follow-up (customer, due time, reason).',
  hasib_followup_complete: 'Complete a follow-up; may send its prepared message to the customer.',
  hasib_settings_update: 'Change Hasib settings: VAT, stock policy, sector windows and follow-up rules.',
  hasib_team_list: 'Team members and pending invitations.',
  hasib_team_invite: 'Invite a team member by email with an operational role.',
  hasib_team_resend: 'Resend a team invitation.',
  hasib_team_revoke: "Remove a team member's access.",
  hasib_adiba_offers: 'Quotes and offers Adiba drafted, by status.',
  hasib_adiba_offer: 'One Adiba offer with lines and prices.',
  hasib_adiba_offer_price: 'Fill or change prices on an Adiba offer (minor units).',
  hasib_adiba_offer_approve: 'Approve an Adiba offer; Layla sends it to the customer.',
  hasib_adiba_offer_withdraw: 'Withdraw an Adiba offer.',
  hasib_adiba_offer_accept_record: "Record the customer's acceptance of an offer with evidence.",
};

const SECTOR_LABELS = {
  automotive: 'Automotive workshop',
  construction: 'Construction',
  dental: 'Dental clinic',
  fitness: 'Fitness',
  hvac: 'Air conditioning',
  media: 'Media production',
  real_estate: 'Real estate',
  store: 'Store',
  clinic: 'Clinic',
};
const VERBS = {
  save: 'Create or update',
  status: 'Change the status of',
  record: 'Record',
  approve: 'Approve',
  resolve: 'Resolve',
  snooze: 'Snooze',
  book: 'Book',
  reschedule: 'Reschedule',
  create: 'Create',
  update: 'Update',
  start: 'Start',
  stop: 'Stop',
  verify: 'Verify',
  decide: 'Decide on',
  submit: 'Submit',
  generate: 'Generate',
  close: 'Close',
  renew: 'Renew',
  cancel: 'Cancel',
  freeze: 'Freeze',
  complete: 'Complete',
  set: 'Set',
};

/** A readable line for a Hasib operation that has no hand-written description. */
export function hasibDescription(operation, category) {
  const sectorKey = Object.keys(SECTOR_LABELS).find(k => operation.startsWith(`${k}_`));
  const rest = sectorKey ? operation.slice(sectorKey.length + 1) : operation;
  const words = rest.split('_');
  const verb = VERBS[words.at(-1)];
  const subject = (verb ? words.slice(0, -1) : words).join(' ') || 'workspace';
  const phrase =
    category === 'read'
      ? `${subject[0].toUpperCase()}${subject.slice(1)}`
      : verb
        ? `${verb} ${subject}`
        : `${subject[0].toUpperCase()}${subject.slice(1)}`;
  return sectorKey ? `${SECTOR_LABELS[sectorKey]}: ${phrase[0].toLowerCase()}${phrase.slice(1)}.` : `${phrase}.`;
}

const APPROVAL = {
  messages: 'sends to customers',
  finance: 'money or prices',
  bulk: 'bulk or delete',
  exports: 'data export',
  team: 'team access',
  publish: 'goes live',
};
/** Appended to every tool so the assistant knows how a write behaves. */
export function behaviourNote(category, categories = [category]) {
  if (category === 'read') return 'Read only.';
  const gated = categories.filter(c => APPROVAL[c]);
  if (!gated.length) return 'Runs directly; new requestId per change.';
  return `Direct unless owner approval is on (${gated.map(c => APPROVAL[c]).join(', ')}); retry same requestId.`;
}
