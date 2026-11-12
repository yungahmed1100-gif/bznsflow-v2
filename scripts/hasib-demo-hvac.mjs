// A month of a fictional Muscat AC service business ("Barid Cooling / بريد للتكييف") for the local
// Hasib demo: customers write to Layla, the team triages, estimates and books technicians, visits are
// recorded on site, jobs are charged and paid, and maintenance contracts run their visits and come up
// for renewal, all in true time order through the real state code. Every name and figure is invented.
import { randomUUID } from 'node:crypto';

const SERVICES = [
  ['AC cleaning (split unit)', 'تنظيف مكيف سبليت', { type: 'fixed', amount: 8 }],
  ['Gas refill R410A', 'تعبئة غاز R410A', { type: 'fixed', amount: 15 }],
  ['Inspection visit', 'زيارة فحص', { type: 'fixed', amount: 5 }],
  ['Split unit installation', 'تركيب مكيف سبليت', { type: 'from', amount: 35, minimum: 35 }],
  ['Compressor replacement', 'تبديل كمبروسر', { type: 'quote' }],
];
const PEOPLE = [
  ['96894400001', 'سالم الحارثي'],
  ['96894400002', 'Aisha Al Lawati'],
  ['96894400003', 'خالد البوسعيدي'],
  ['96894400004', 'Rahma Al Amri'],
  ['96894400005', 'محمد الرواحي'],
  ['96894400006', 'Noura Al Kindi'],
  ['96894400007', 'سعيد الشكيلي'],
  ['96894400008', 'Fahad Al Riyami'],
  ['96894400009', 'مريم الفارسية'],
  ['96894400010', 'Zahra Al Habsi'],
  ['96894400011', 'ناصر المعمري'],
  ['96894400012', 'Huda Al Balushi'],
  ['96894400013', 'يوسف الكلباني'],
  ['96894400014', 'Laila Al Saadi'],
  ['96894400015', 'أحمد الهنائي'],
  ['96894400016', 'Sara Al Maskari'],
  ['96894400017', 'عبدالله الجابري'],
  ['96894400018', 'Maha Al Toobi'],
  ['96894400019', 'هلال العبري'],
  ['96894400020', 'Shaima Al Rashdi'],
  ['96894400021', 'Khamis Al Azri'],
  ['96894400022', 'بشرى السيابية'],
  ['96894400023', 'Talal Al Nabhani'],
  ['96894400024', 'جميلة الوهيبية'],
  ['96894400025', 'Badr Al Shidi'],
  ['96894400026', 'وفاء الحوسنية'],
  ['96894400027', 'Majid Al Hashmi'],
  ['96894400028', 'ريا الغافرية'],
  ['96894400029', 'Ibrahim Al Farsi'],
  ['96894400030', 'منيرة البطاشية'],
];
// Customers 0–9 are the month's regular jobs, 10–19 where things stand now, 20–27 the maintenance contracts, 28–29 units now due,
// so an open job of one story never hides another story's request.
const AREAS = ['Al Khuwair', 'Bausher', 'Seeb', 'Ruwi', 'Qurum', 'Al Ghubra', 'Al Hail', 'Madinat Sultan Qaboos'];
const UNIT_TYPES = ['split', 'split', 'split', 'ducted', 'window', 'cassette'];
const CHECKS = [
  ['Pressure within range', 'pass'],
  ['Cooling at the vent', 'pass'],
  ['Drain clear', 'pass'],
  ['Electrical connections tight', 'pass'],
];

export async function seedHvac({ m, tenant, call, hasib, executeMessaging, automationRun, SECRET, DAY, HOUR }) {
  const MIN = 60000;
  // Local (Muscat, UTC+4) midnight today; at(d, h) is h o'clock local, d days ago.
  const NOW = Date.now(),
    dayOf = ms => Math.floor((ms + 4 * HOUR) / DAY) * DAY - 4 * HOUR,
    today = dayOf(NOW),
    at = (d, h = 9) => today - d * DAY + h * HOUR;
  await m.db.patch(tenant.rowId, {
    profile: {
      businessName: 'Barid Cooling',
      sector: 'Air conditioning',
      services: 'AC cleaning, gas refill, repairs, installation and annual maintenance contracts',
      prices: 'Cleaning 8 OMR, gas refill 15 OMR, inspection 5 OMR',
      hours: 'Sat–Thu 8am–8pm',
      location: 'Muscat (Al Khuwair, Bausher, Seeb, Ruwi, Qurum)',
    },
  });
  await hasib(
    'settings_update',
    { packId: 'hvac', hvacSettings: { serviceAreas: AREAS, autoQuoteLimitMinor: 30000, repeatWindowDays: 14 } },
    at(31),
  );

  // Services live in Layla's catalog, which is what she quotes; estimates take their fixed prices.
  for (const [i, [nameEn, nameAr, price]] of SERVICES.entries()) {
    const label =
      price.type === 'quote'
        ? 'On request'
        : price.type === 'from'
          ? `From ${price.amount} OMR`
          : `${price.amount} OMR`;
    await m.db.insert('blueCatalogEntries', {
      ownerKey: String(tenant.accountId),
      entryKey: randomUUID(),
      kind: 'service',
      status: 'approved',
      nameEn,
      nameAr,
      category: 'AC services',
      benefitEn: '',
      benefitAr: '',
      descriptionEn: '',
      descriptionAr: '',
      availability: 'Saturday to Thursday',
      prices: [{ currency: 'OMR', unit: 'unit', label, ...price }],
      source: 'owner',
      confidence: 1,
      laylaUseEn: '',
      laylaUseAr: '',
      revision: 1,
      sortOrder: i,
      createdAt: m.now(),
      updatedAt: m.now(),
    });
  }
  await hasib('services_sync', {}, at(31));
  const items = (await hasib('items', { limit: 50 }, at(31))).items,
    service = nameEn => {
      const v = items.find(i => i.nameEn === nameEn).variants[0];
      return { variantId: v.id, name: nameEn, priceMinor: v.priceMinor };
    };
  const cleaning = service('AC cleaning (split unit)'),
    gas = service('Gas refill R410A'),
    inspection = service('Inspection visit');
  // Parts and gas are the business's own stock (never offered to customers).
  for (const [nameEn, nameAr, unit, onHand, reorderPoint, cost] of [
    ['R410A gas cylinder', 'أسطوانة غاز R410A', 'cylinder', 2, 3, 28000],
    ['Run capacitor 35µF', 'مكثف تشغيل 35', 'piece', 9, 4, 1800],
    ['Fan motor (split)', 'موتور مروحة سبليت', 'piece', 1, 2, 14000],
  ])
    await hasib(
      'item_save',
      {
        requestId: randomUUID(),
        item: { kind: 'product', nameAr, nameEn, category: 'Parts', unit, trackStock: true },
        variants: [{ sku: '', options: [], priceMinor: 0, costMinor: cost, reorderPoint, openingStock: onHand }],
      },
      at(31),
    );

  // Three technicians, invited and signed in.
  const techs = [];
  for (const name of ['salim', 'anwar', 'rahul']) {
    const invite = await hasib(
      'team_invite',
      { email: `${name}@barid.example`, operationalRole: 'technician' },
      at(31),
    );
    const id = await m.db.insert('accounts', { email: `${name}@barid.example`, role: 'customer', createdAt: m.now() });
    await m.db.patch(invite.id, { accountId: id, status: 'active', activatedAt: m.now() });
    techs.push(id);
  }

  const events = [],
    units = new Map();
  const contactOf = i => m.table('blueContacts').find(c => c.waId === PEOPLE[i][0] && c.state === 'active')?._id;
  const say = (t, who, text) =>
    events.push({
      t,
      run: async () => {
        if (t > m.now()) m.advance(t - m.now());
        await call(executeMessaging, 'ingest', {
          integrationId: tenant.integration.id,
          events: [
            {
              kind: 'message',
              id: `hvac-${randomUUID()}`,
              from: PEOPLE[who][0],
              at: m.now(),
              text,
              reply: /[؀-ۿ]/.test(text)
                ? 'شكراً لتواصلك، سيتواصل معك الفريق لتحديد موعد الفني.'
                : 'Thanks, the team will be in touch to book a technician.',
              intent: 'availability_request',
              handoff: false,
              profileName: PEOPLE[who][1],
            },
          ],
        });
      },
    });
  const unitOf = async (who, t) => {
    if (!units.has(who)) {
      const made = [];
      for (let k = 0; k < (who % 4 === 0 ? 2 : 1); k++)
        made.push(
          (
            await hasib(
              'hvac_unit_save',
              {
                requestId: randomUUID(),
                contactId: contactOf(who),
                hvac: {
                  label: k ? 'Bedroom split' : who % 3 === 0 ? 'Majlis ducted' : 'Living room split',
                  unitType: k ? 'split' : UNIT_TYPES[who % UNIT_TYPES.length],
                  area: AREAS[who % AREAS.length],
                  brand: ['Gree', 'Daikin', 'LG', 'Carrier'][who % 4],
                  capacityBtu: [18000, 24000, 12000, 36000][who % 4],
                },
              },
              t,
            )
          ).id,
        );
      units.set(who, made);
    }
    return units.get(who);
  };
  const latestJob = who =>
    m
      .table('hvacJobs')
      .filter(j => String(j.contactId) === String(contactOf(who)) && !['completed', 'cancelled'].includes(j.status))
      .sort((x, y) => y.createdAt - x.createdAt)[0];
  const row = (table, id) => m.table(table).find(r => r._id === id);
  /** Moves an existing job from its state through estimate, yes, visit, checks and completion, at time t. */
  const work = async (
    jobId,
    t,
    {
      tech,
      svc = gas,
      qty = 1,
      late = 0,
      pay = 'full',
      costs = true,
      nextService = false,
      stopAt = null,
      evidence = 'whatsapp',
    },
  ) => {
    const job = () => row('hvacJobs', jobId);
    if (job().status === 'requested')
      await hasib('hvac_job_status', { jobId, version: job().version, status: 'triaged' }, t - 25 * HOUR);
    if (job().source !== 'contract') {
      const e = await hasib(
        'hvac_estimate_save',
        {
          requestId: randomUUID(),
          jobId,
          hvac: {
            lines: [{ kind: 'service', name: svc.name, variantId: svc.variantId, qty, unitPriceMinor: svc.priceMinor }],
          },
        },
        t - 25 * HOUR,
      );
      await hasib(
        'hvac_estimate_status',
        { estimateId: e.id, version: row('hvacEstimates', e.id).version, status: 'issued' },
        t - 25 * HOUR,
      );
      if (stopAt === 'estimate') return;
      await hasib(
        'hvac_approval_record',
        { jobId, version: job().version, estimateId: e.id, approvedBy: 'Customer', evidenceSource: evidence },
        t - 24 * HOUR,
      );
    }
    if (stopAt === 'approved') return;
    const visit = await hasib(
      'hvac_visit_save',
      { requestId: randomUUID(), jobId, hvac: { technicianAccountId: tech, startsAt: t, endsAt: t + 2 * HOUR } },
      t - 24 * HOUR,
    );
    if (stopAt === 'scheduled') return;
    const arrived = t + (late || 10 * MIN);
    await hasib(
      'hvac_visit_status',
      { visitId: visit.id, version: row('hvacVisits', visit.id).version, status: 'arrived' },
      arrived,
    );
    if (job().source !== 'contract')
      await hasib('hvac_job_status', { jobId, version: job().version, status: 'repairing' }, arrived + 5 * MIN);
    await hasib(
      'hvac_checklist_save',
      {
        jobId,
        version: job().version,
        hvac: {
          checklist: CHECKS.map(([text, result]) => ({ text, result })),
          findings:
            job().jobType === 'gas_refill'
              ? 'Low charge topped up, no visible leak at the flare joints.'
              : 'Coils and filters cleaned; drain flushed.',
        },
      },
      arrived + 40 * MIN,
    );
    if (stopAt === 'repairing') return;
    if (stopAt === 'parts') {
      await hasib(
        'hvac_job_status',
        {
          jobId,
          version: job().version,
          status: 'waiting_parts',
          hvac: { partsLabel: 'Fan motor (split)', partsExpectedAt: today + DAY + 9 * HOUR },
        },
        arrived + 50 * MIN,
      );
      return;
    }
    await hasib('hvac_job_status', { jobId, version: job().version, status: 'tested' }, arrived + 60 * MIN);
    await hasib('hvac_job_status', { jobId, version: job().version, status: 'completed' }, arrived + 70 * MIN);
    const done = job();
    if (done.orderId && pay !== 'none') {
      const order = row('hasibOrders', done.orderId);
      await hasib(
        'payment_record',
        {
          requestId: randomUUID(),
          orderId: done.orderId,
          amountMinor: pay === 'part' ? Math.round(order.totalMinor / 2000) * 1000 : order.totalMinor,
          method: ['cash', 'card', 'bank_transfer'][done.number % 3],
        },
        arrived + 80 * MIN,
      );
    }
    if (costs && done.orderId)
      await hasib(
        'hvac_cost_save',
        {
          jobId,
          version: job().version,
          hvac: {
            costs: [
              {
                kind: svc === gas ? 'gas' : 'parts',
                label: svc === gas ? 'R410A 1 kg' : 'Coil cleaner',
                amountMinor: svc === gas ? 4500 : 1200,
              },
              { kind: 'labour', label: 'Technician time', amountMinor: 2500 },
            ],
            costsComplete: true,
          },
        },
        arrived + 90 * MIN,
      );
    if (nextService)
      for (const unitId of done.unitIds) {
        const u = row('hvacUnits', unitId);
        await hasib(
          'hvac_unit_service',
          {
            unitId,
            version: u.version,
            hvac: { nextServiceAt: arrived + (nextService === true ? 90 : nextService) * DAY },
          },
          arrived + 95 * MIN,
        );
      }
  };
  /** A customer writes to Layla the day before; Layla opens the request; the team takes it from there. */
  const job = (d, who, slot, text, opts = {}) => jobAt(at(d, slot), who, text, opts);
  const jobAt = (t, who, text, opts = {}) => {
    say(t - 26 * HOUR, who, text);
    events.push({
      t: t - 25.5 * HOUR,
      run: async () => {
        const unitIds = await unitOf(who, t - 25.5 * HOUR),
          fields = {
            unitIds: unitIds.slice(0, 1),
            jobType: opts.type || 'gas_refill',
            area: AREAS[who % AREAS.length],
          };
        // Layla opened the request from the message; a message without AC words leaves it to the team.
        const j = latestJob(who),
          id = j
            ? j._id
            : (
                await hasib(
                  'hvac_job_save',
                  { requestId: randomUUID(), contactId: contactOf(who), hvac: { ...fields, source: 'phone' } },
                  t - 25.5 * HOUR,
                )
              ).id;
        if (j) await hasib('hvac_job_save', { jobId: id, version: j.version, hvac: fields }, t - 25.5 * HOUR);
        await work(id, t, opts);
      },
    });
  };

  // A month of jobs: two or three a day across the three technicians, most fixed in one visit.
  const TEXTS = [
    'السلام عليكم، المكيف ما يبرد',
    'Hi, my AC is not cooling properly',
    'أبغى تنظيف مكيفات',
    'AC leaking water, can you send someone?',
    'المكيف يطلع صوت وما يبرد',
    'Need gas refill for my split AC',
  ];
  let n = 0;
  for (let d = 28; d >= 3; d--) {
    if (((today - d * DAY + 4 * HOUR) / DAY) % 7 === 1) continue; // roughly one quiet day a week
    for (let k = 0; k < (d % 3 === 0 ? 3 : 2); k++, n++) {
      const who = n % 10,
        svc = n % 3 === 1 ? cleaning : gas;
      job(d, who, [9, 12, 15][k], TEXTS[n % TEXTS.length], {
        tech: techs[(d + k) % 3],
        svc,
        type: svc === cleaning ? 'cleaning' : 'gas_refill',
        qty: svc === cleaning ? 1 + (who % 2) : 1,
        late: n % 9 === 4 ? 3 * HOUR : 0,
        pay: n % 7 === 3 ? 'none' : n % 11 === 5 ? 'part' : 'full',
        costs: n % 4 !== 2,
        nextService: svc === cleaning,
      });
    }
  }
  // Two cleanings were told to come back in three weeks and nothing is booked since: their units are due now.
  job(25, 28, 18, 'أبغى تنظيف مكيفات', { tech: techs[0], svc: cleaning, type: 'cleaning', nextService: 20 });
  job(24, 29, 18, 'I need my AC units cleaned', { tech: techs[1], svc: cleaning, type: 'cleaning', nextService: 20 });
  // Two customers back with the same fault within the week.
  for (const [d, who] of [
    [20, 1],
    [9, 4],
  ])
    events.push({
      t: at(d, 18),
      run: async () => {
        const first = m
          .table('hvacJobs')
          .filter(j => String(j.contactId) === String(contactOf(who)) && j.status === 'completed')
          .sort((x, y) => y.completedAt - x.completedAt)[0];
        if (!first) return;
        const again = await hasib(
          'hvac_job_save',
          {
            requestId: randomUUID(),
            contactId: contactOf(who),
            hvac: { jobType: 'repair', unitIds: first.unitIds, repeatOfId: first._id, reportedSymptom: 'not_cooling' },
          },
          at(d, 18),
        );
        await work(again.id, at(d - 1, 19), { tech: techs[(d + 2) % 3], svc: inspection, costs: false });
      },
    });

  // Where things stand now: requests to triage, estimates out, a job waiting for parts, and today's board.
  // These run on the real clock, so the board reads right whatever time the demo starts.
  say(NOW - 3 * HOUR, 10, 'السلام عليكم، المكيف في الصالة ما يبرد من أمس');
  say(NOW - 2 * HOUR, 11, 'Hello, I need two split AC units cleaned this week');
  jobAt(NOW - HOUR, 12, 'المكيف يسرب ماء', { tech: techs[0], type: 'repair', stopAt: 'repairing' }); // on site now
  jobAt(NOW + 2 * HOUR, 13, 'Need a gas refill for my AC please', { tech: techs[1], stopAt: 'scheduled' });
  jobAt(NOW + 5 * HOUR, 14, 'أبغى فحص المكيف المركزي', {
    tech: techs[2],
    type: 'inspection',
    svc: inspection,
    stopAt: 'scheduled',
  });
  jobAt(NOW + 24 * HOUR, 15, 'Can someone check my AC tomorrow?', { tech: techs[0], stopAt: 'scheduled' });
  jobAt(NOW - 20 * HOUR, 16, 'المكيف ما يشتغل', { tech: techs[1], type: 'repair', stopAt: 'scheduled' }); // no arrival recorded
  jobAt(NOW - 2 * DAY, 17, 'The AC fan is not spinning on my outdoor unit', {
    tech: techs[2],
    type: 'repair',
    svc: inspection,
    stopAt: 'parts',
  });
  jobAt(NOW - 3 * DAY, 18, 'How much to replace the AC compressor?', { type: 'repair', stopAt: 'estimate' });
  jobAt(NOW - 9 * DAY, 19, 'أبغى عرض سعر تركيب مكيف', { type: 'install', svc: cleaning, stopAt: 'estimate' });
  jobAt(NOW - DAY, 11, 'Please book an AC cleaning for my villa', {
    type: 'cleaning',
    svc: cleaning,
    qty: 3,
    stopAt: 'approved',
  });

  // Maintenance contracts: three come up for renewal, one is unpaid, the rest started this season.
  const contract = (startDaysAgo, who, visits, priceOmr, pay = 'full') => {
    // The customer asks about a contract first (no AC words, so Layla opens no repair request).
    say(
      at(startDaysAgo, 6),
      who,
      who % 2 ? 'Hello, do you offer annual maintenance contracts?' : 'السلام عليكم، عندكم عقود صيانة سنوية؟',
    );
    contractAt(startDaysAgo, who, visits, priceOmr, pay);
  };
  const contractAt = (startDaysAgo, who, visits, priceOmr, pay) =>
    events.push({
      t: at(startDaysAgo, 8),
      run: async () => {
        const start = at(startDaysAgo, 8),
          unitIds = await unitOf(who, start - HOUR);
        const c = await hasib(
          'hvac_contract_save',
          {
            requestId: randomUUID(),
            contactId: contactOf(who),
            hvac: { unitIds, visitsPerYear: visits, startsAt: start, priceMinor: priceOmr * 1000 },
          },
          start,
        );
        await hasib(
          'hvac_contract_status',
          {
            contractId: c.id,
            version: row('hvacContracts', c.id).version,
            status: 'active',
            evidenceSource: who % 2 ? 'signed' : 'whatsapp',
          },
          start,
        );
        // Layla took the question as a maintenance request; the contract answers it.
        for (const j of m
          .table('hvacJobs')
          .filter(x => String(x.contactId) === String(contactOf(who)) && x.status === 'requested'))
          await hasib(
            'hvac_job_status',
            { jobId: j._id, version: j.version, status: 'cancelled', reason: 'duplicate' },
            start,
          );
        const order = row('hasibOrders', row('hvacContracts', c.id).orderId);
        if (pay !== 'none')
          await hasib(
            'payment_record',
            {
              requestId: randomUUID(),
              orderId: order._id,
              amountMinor: pay === 'part' ? order.totalMinor / 2 : order.totalMinor,
              method: 'bank_transfer',
            },
            start + HOUR,
          );
        // Visits already due: the contract job is opened, booked and done a few days after it falls due.
        const span = row('hvacContracts', c.id).endsAt - start;
        for (let k = 0; k < visits; k++) {
          const due = start + Math.round((k * span) / visits);
          if (due > today - 3 * DAY) break;
          const j = await hasib(
            'hvac_job_save',
            {
              requestId: randomUUID(),
              contactId: contactOf(who),
              hvac: { source: 'contract', jobType: 'amc_visit', contractId: c.id, contractVisitIndex: k },
            },
            due - 14 * DAY > start ? due - 14 * DAY : start,
          );
          // At 17:00, after the day's regular windows, so a technician is never booked twice.
          await work(j.id, dayOf(Math.max(due, start) + 2 * DAY) + 17 * HOUR, {
            tech: techs[k % 3],
            costs: false,
            nextService: false,
          });
        }
      },
    });
  contract(340, 20, 2, 50);
  contract(322, 21, 2, 45, 'none');
  contract(306, 22, 2, 60);
  contract(80, 23, 4, 70);
  contract(40, 24, 4, 40, 'part');
  contract(26, 25, 4, 55);
  contract(12, 26, 4, 35);
  contract(5, 27, 4, 80, 'none');

  for (const e of events.sort((x, y) => x.t - y.t)) await e.run();

  const expense = (daysAgo, category, amount, vendor, method = 'bank_transfer') =>
    hasib(
      'expense_create',
      {
        requestId: randomUUID(),
        category,
        amountMinor: amount,
        method,
        paidOn: new Date(at(daysAgo) + 4 * HOUR).toISOString().slice(0, 10),
        vendor,
      },
      at(daysAgo),
    );
  await expense(27, 'rent', 380000, 'Al Khuwair workshop landlord');
  await expense(3, 'salaries', 1450000, 'Three technicians and the front desk');
  await expense(21, 'refrigerant', 168000, 'Gas supplier, Ghala');
  await expense(14, 'spare_parts', 92000, 'Parts trader, Ruwi');
  await expense(8, 'vehicle_fuel', 64000, 'Service vans', 'card');
  await expense(5, 'utilities', 41000, 'Nama electricity');

  // Hasib's first pass: tasks, rule drafts, Adiba's offers and the contract visits due soon.
  if (Date.now() > m.now()) m.advance(Date.now() - m.now());
  await automationRun(m.ctx, { accountId: tenant.accountId, workerFunction: null, secret: SECRET }, m.now());
  return { technicianId: techs[0] };
}
