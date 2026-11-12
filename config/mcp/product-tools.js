// Tools added on 10 November 2026 so an assistant can orient itself, track its own
// requests and reach setup progress, the Ascend website brief, Rasil email and billing.
// Registered through the core registry's add(), in this order, so names, schemas and
// descriptions are identical to having them inline.
const ASCEND = ['ascend', 'apex'];

/** Workspace summary, tool descriptions, request tracking and setup progress. */
function registerOrientation(add, { s, b, id, version }) {
  add('workspace', 'summary', 'read', {}, [], { capability: 'businessDetails' });
  add('tools', 'describe', 'read', { name: s(120) }, ['name'], { capability: 'businessDetails' });
  add('requests', 'list', 'read', { status: s(40), limit: { type: 'integer', minimum: 1, maximum: 50 } }, [], {
    capability: 'businessDetails',
  });
  add('requests', 'cancel', 'edit', { runId: id }, ['runId'], { capability: 'businessDetails' });
  add('onboarding', 'get', 'read', { product: { enum: ['catalyst', 'ascend'] } }, [], {
    capability: 'businessDetails',
  });
  add(
    'onboarding',
    'save',
    'edit',
    {
      product: { enum: ['catalyst', 'ascend'] },
      step: { type: 'integer', minimum: 0, maximum: 3 },
      completed: b,
      version,
    },
    ['product', 'step', 'version'],
    { capability: 'businessDetails' },
  );
}

/** The Ascend website brief; files, submit and resend stay on the website. */
function registerWebsite(add, { s, b, arr }) {
  add('website', 'state', 'read', {}, [], { capability: 'businessDetails', plans: ASCEND });
  add(
    'website',
    'save_draft',
    'edit',
    {
      step: { type: 'integer', minimum: 0, maximum: 6 },
      fields: {
        type: 'object',
        description:
          'Brief fields to change; others are kept. Text up to 2000 characters, true/false, or up to 6 short strings. Read website_state for the field names.',
        additionalProperties: {
          anyOf: [s(2000), b, arr(s(300), 6)],
        },
      },
    },
    ['step', 'fields'],
    { capability: 'businessDetails', plans: ASCEND },
  );
  add('website', 'domain_check', 'read', { query: s(80) }, ['query'], {
    capability: 'businessDetails',
    plans: ASCEND,
    service: true,
  });
  // Files go straight from the owner's browser to storage, and the brief email is the website's.
  for (const op of ['upload_url', 'file_register', 'resend'])
    add('website', op, 'read', {}, [], {
      disposition: 'handoff',
      path: '/layla/dashboard?tab=website',
      capability: 'businessDetails',
      plans: ASCEND,
      description:
        op === 'resend'
          ? 'Resending the website brief email happens from the Website tab.'
          : 'The logo, photos and payment documents are uploaded in the Website tab.',
    });
  add('website', 'submit', 'read', {}, [], {
    disposition: 'handoff',
    path: '/layla/dashboard?tab=website',
    capability: 'businessDetails',
    plans: ASCEND,
    description:
      'Submitting the website brief happens on the website, where the owner checks the logo, photos and payment documents before sending.',
  });
}

/** Rasil email campaigns, behind the same allow-list as the Email tab. */
function registerEmail(add, { s, b, arr, obj, id }) {
  const consent = obj({ source: s(120), date: s(10), purpose: s(200), attested: b }, [
    'source',
    'date',
    'purpose',
    'attested',
  ]);
  const emailContent = { subject: s(400), body: s(21000), lang: { enum: ['ar', 'en'] } };
  const EMAIL = {
    state: ['read', {}, []],
    subscribers: ['read', { cursor: s(100), status: s(20) }, []],
    subscribers_import: [
      'bulk',
      {
        rows: arr(obj({ email: s(254), name: s(80) }, ['email']), 500),
        origin: { enum: ['manual', 'import'] },
        consent,
      },
      ['rows', 'consent'],
    ],
    subscriber_unsubscribe: ['edit', { subscriberId: id }, ['subscriberId']],
    sender_save: ['publish', { fromName: s(80), fromLocal: s(64), replyTo: s(254) }, ['fromName', 'fromLocal']],
    draft: ['read', { brief: s(600), lang: { enum: ['ar', 'en'] } }, ['brief'], true],
    campaign_preview: ['read', emailContent, ['subject', 'body']],
    campaigns: ['read', { cursor: s(100) }, []],
    campaign_detail: ['read', { campaignId: id }, ['campaignId']],
    campaign_create: [
      'messages',
      {
        ...emailContent,
        name: s(80),
        confirm: { const: true },
        schedule: obj({ mode: { enum: ['now', 'later'] }, timezone: s(64), local: s(40) }, ['mode', 'timezone']),
      },
      ['subject', 'body', 'confirm', 'schedule'],
      true,
    ],
    campaign_cancel: ['messages', { campaignId: id }, ['campaignId']],
    domain_check: ['edit', {}, [], true],
  };
  for (const [op, [category, properties, required, service]] of Object.entries(EMAIL))
    add('email', op, category, properties, required, {
      capability: 'email',
      plans: ASCEND,
      ...(service ? { service: true } : {}),
    });
  add('email', 'domain_connect', 'read', {}, [], {
    disposition: 'handoff',
    path: '/layla/dashboard?tab=email',
    capability: 'email',
    plans: ASCEND,
    description: 'Connecting a sending domain happens in the Email tab, where the DNS records are shown.',
  });
}

/** Plan status; paying happens on Paymob's page. */
function registerBilling(add) {
  add('billing', 'state', 'read', {}, [], { capability: 'businessDetails' });
  add('billing', 'checkout', 'read', {}, [], {
    disposition: 'handoff',
    path: '/#tiers',
    capability: 'businessDetails',
    description: "Paying or renewing the plan happens on the BznsFlow website through Paymob's secure page.",
  });
}

/** @param {Function} add the registry's add(domain, operation, category, properties, required, extra) */
export function registerProductTools(add, shapes) {
  registerOrientation(add, shapes);
  registerWebsite(add, shapes);
  registerEmail(add, shapes);
  registerBilling(add, shapes);
}
