// The owner dashboard's map: plain sections, some with a few views inside (Real Estate has six, below).
// Section ids never change by industry; only labels and views do (a clinic's Orders read as Visits).
// Old `?tab=` links (insights, expenses, contacts, broadcast, channels, business)
// keep working by landing on the section and view that now holds them.

const VIEWS = {
  stock: ['products', 'services'],
  money: ['insights', 'expenses'],
  customers: ['contacts', 'broadcast'],
  settings: ['channels', 'business', 'accounts'],
};
const ALIASES = {
  insights: ['money', 'insights'], expenses: ['money', 'expenses'],
  contacts: ['customers', 'contacts'], broadcast: ['customers', 'broadcast'],
  channels: ['settings', 'channels'], business: ['settings', 'business'],
};
// Catalyst is four tabs: Chats, Broadcasts, Customers, Settings. Settings holds BznsBrain (bzns.md and
// the catalog, Layla's behaviour, review) and Channels. Older links land on them.
const CATALYST_ALIASES = {
  broadcast: ['broadcasts'], contacts: ['customers'], stock: ['settings', 'brain'],
  channels: ['settings', 'channels'], business: ['settings', 'brain'], brain: ['settings', 'brain'],
};
// Settings' old views (Business details, Services & prices) are now BznsBrain's two tabs.
const CATALYST_VIEWS = { business: 'brain', services: 'brain' };
const CATALYST = Object.freeze({
  sections: ['chats', 'broadcasts', 'customers', 'settings'],
  views: { customers: [], settings: ['brain', 'channels'] },
});
// Real Estate on Ascend is six tabs (ascend/real-estate.md): Chats, Deals (the `work` key),
// Customers, Broadcasts, Insights and Settings. Today, Properties, Money and Team now live inside them.
const REAL_ESTATE_VIEWS = Object.freeze({
  work: ['board', 'viewings', 'properties', 'followups'],
  settings: ['brain', 'rules', 'team', 'business', 'channels', 'accounts'],
});
const REAL_ESTATE_ALIASES = {
  today: ['work', 'board'], orders: ['work', 'board'], stock: ['work', 'properties'], followups: ['work', 'followups'],
  money: ['insights'], expenses: ['insights'], team: ['settings', 'team'], broadcast: ['broadcasts'], contacts: ['customers'],
  channels: ['settings', 'channels'], business: ['settings', 'business'], brain: ['settings', 'brain'], accounts: ['settings', 'accounts'],
};
// Media & production is the same six tabs, with Productions as Work (ascend/media.md).
const MEDIA_VIEWS = Object.freeze({
  work: ['board', 'calendar', 'resources', 'followups'],
  settings: ['brain', 'rules', 'team', 'business', 'channels', 'accounts'],
});
const MEDIA_ALIASES = { ...REAL_ESTATE_ALIASES, stock: ['work', 'resources'] };
// Fitness & wellness: Memberships as Work, with Members · Classes · Plans · Follow-ups (ascend/fitness.md).
const FITNESS_VIEWS = Object.freeze({
  work: ['members', 'classes', 'plans', 'followups'],
  settings: ['brain', 'rules', 'team', 'business', 'channels', 'accounts'],
});
const FITNESS_ALIASES = { ...REAL_ESTATE_ALIASES, today: ['work', 'members'], orders: ['work', 'members'], stock: ['work', 'plans'] };
// Dental clinics: Visits as Work, with Schedule · Visit list · Services · Follow-ups (ascend/dental.md).
const DENTAL_VIEWS = Object.freeze({
  work: ['schedule', 'visits', 'services', 'followups'],
  settings: ['brain', 'rules', 'team', 'business', 'channels', 'accounts'],
});
const DENTAL_ALIASES = { ...REAL_ESTATE_ALIASES, today: ['work', 'schedule'], orders: ['work', 'visits'], stock: ['work', 'services'] };
// Automotive workshops: Workshop as Work, with Board · Schedule · Parts · Follow-ups (ascend/automotive.md).
const AUTOMOTIVE_VIEWS = Object.freeze({
  work: ['board', 'schedule', 'parts', 'followups'],
  settings: ['brain', 'rules', 'team', 'workshop', 'business', 'channels', 'accounts'],
});
const AUTOMOTIVE_ALIASES = { ...REAL_ESTATE_ALIASES, today: ['work', 'board'], orders: ['work', 'board'], stock: ['work', 'parts'] };
// Contractors: Projects as Work, with Projects · Procurement & site · Follow-ups (ascend/construction.md);
// milestones, variations, claims and retention live on each project.
const CONSTRUCTION_VIEWS = Object.freeze({
  work: ['projects', 'procurement', 'followups'],
  settings: ['brain', 'rules', 'team', 'site', 'business', 'channels', 'accounts'],
});
const CONSTRUCTION_ALIASES = { ...REAL_ESTATE_ALIASES, today: ['work', 'projects'], orders: ['work', 'projects'], stock: ['work', 'procurement'] };
// Packs whose Ascend workspace is the six tabs, with their Work views and old-link aliases.
const SIX_TAB_PACKS = Object.freeze({ 'real-estate': { views: REAL_ESTATE_VIEWS, aliases: REAL_ESTATE_ALIASES }, media: { views: MEDIA_VIEWS, aliases: MEDIA_ALIASES },
  fitness: { views: FITNESS_VIEWS, aliases: FITNESS_ALIASES }, dental: { views: DENTAL_VIEWS, aliases: DENTAL_ALIASES },
  automotive: { views: AUTOMOTIVE_VIEWS, aliases: AUTOMOTIVE_ALIASES }, construction: { views: CONSTRUCTION_VIEWS, aliases: CONSTRUCTION_ALIASES } });
export const isSixTabPack = id => !!SIX_TAB_PACKS[id];
/** Which BznsBrain tab a URL opens: `part`, else the old Services & prices links open the catalog. */
export function brainPart(params) {
  const part = params.get('part');
  if (['bzns', 'catalog'].includes(part)) return part;
  return params.get('view') === 'services' || params.get('tab') === 'stock' ? 'catalog' : 'bzns';
}
const TEAM_PACKS = ['retail', 'retail-tech', 'dental', 'real-estate', 'media', 'fitness', 'clinic', 'construction', 'automotive'];
export const SECTION_ORDER = ['today', 'chats', 'broadcasts', 'orders', 'stock', 'service', 'money', 'customers', 'team', 'settings'];

/** Preserve caller-owned URL parameters while clearing record state when changing sections. */
export function dashboardSearch(current, tab, extra = {}) {
  const params = new URLSearchParams(current);
  for (const key of ['tab', 'view', 'part', 'chat', 'queue', 'order', 'ledger', 'repair', 'create', 'action', 'low', 'deal', 'production', 'member', 'visit', 'patient', 'day', 'stage', 'filter', 'metric', 'segment', 'period', 'from', 'quick']) params.delete(key);
  params.set('tab', tab);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return params;
}

/**
 * @param {{ modules: string[], setupRequired: boolean, pack?: { id: string } } | null} hasib the Hasib overview, or null when Hasib is off
 * @param {Record<string, boolean>} [capabilities]
 * @param {'manager' | 'employee'} [role] the role from the main overview, used until the Hasib overview arrives
 * @returns {{ sections: string[], views: Record<string, string[]> }}
 */
export function dashboardMap(hasib, capabilities = { broadcasts: true, money: true }, role = 'manager') {
  // Catalyst (no operations): Chats, Broadcasts, Customers, Settings. Ascend keeps the map below.
  if (!hasib && !capabilities.operations) {
    const sections = CATALYST.sections.filter(id => (id !== 'broadcasts' || capabilities.broadcasts) && (id !== 'settings' || role !== 'employee'));
    return { sections, views: CATALYST.views, catalyst: true };
  }
  // The main overview already knows the role, so an employee never sees Settings flash while Hasib loads.
  const workspaceRole = hasib?.workspaceRole ?? role;
  const on = m => !!hasib && !hasib.setupRequired && hasib.modules.includes(m);
  const clinic = hasib?.pack?.id === 'clinic' && !hasib.setupRequired;
  // Dental: Services leads with its treatments (products are its supplies); Patients is one list, no mass messaging.
  const dental = on('orders') && hasib?.pack?.id === 'dental';
  const construction = hasib?.pack?.id === 'construction' && !hasib.setupRequired;
  const automotive = hasib?.pack?.id === 'automotive' && !hasib.setupRequired;
  // Real Estate's Properties is one listings screen, not products and services.
  const realEstate = hasib?.pack?.id === 'real-estate' && !hasib.setupRequired;
  const sixTab = !hasib?.setupRequired && SIX_TAB_PACKS[hasib?.pack?.id];
  if (sixTab) {
    const has = { chats: true, work: true, customers: true, broadcasts: workspaceRole === 'manager' && capabilities.broadcasts !== false,
      insights: workspaceRole === 'manager' && capabilities.insights !== false, settings: workspaceRole !== 'employee' };
    return { sections: ['chats', 'work', 'customers', 'broadcasts', 'insights', 'settings'].filter(id => has[id]), views: { ...sixTab.views, customers: [] }, sixTab: true, packId: hasib.pack.id };
  }
  // Services are edited in Business details, which is the manager's.
  const managerViews = list => list.filter(v => v !== 'services' || workspaceRole !== 'employee');
  const views = {
    stock: construction || automotive || realEstate ? [] : on('stock') ? managerViews(dental ? ['services', 'products'] : VIEWS.stock) : ['services'],
    money: construction || automotive ? [] : VIEWS.money.filter(on),
    customers: clinic || dental ? ['contacts'] : capabilities.broadcasts ? VIEWS.customers : ['contacts'],
    // Accounts and VAT belong to Hasib's money, so they appear once an industry is set.
    // Automotive opens Settings on its workshop page (the business view); Channels stays one tab away.
    settings: construction ? [] : automotive ? ['business', 'channels', 'accounts'] : on('orders') ? VIEWS.settings : VIEWS.settings.filter(v => v !== 'accounts'),
  };
  const has = {
    today: !!hasib, chats: !clinic, orders: on('orders'), stock: on('stock'), service: on('repairs'),
    money: (construction || automotive ? on('insights') : views.money.length > 0) && capabilities.money !== false, customers: true,
    team: !!hasib && TEAM_PACKS.includes(hasib.pack?.id) && workspaceRole === 'manager', settings: workspaceRole !== 'employee',
  };
  return { sections: SECTION_ORDER.filter(id => has[id]), views };
}

/** The section and view to show for a URL, falling back to the home section. */
export function resolveTab(requestedTab, requestedView, map) {
  const aliases = map.sixTab ? (SIX_TAB_PACKS[map.packId] || SIX_TAB_PACKS['real-estate']).aliases : map.catalyst ? CATALYST_ALIASES : ALIASES;
  // Catalyst's and Real Estate's Broadcasts used to be a view of Customers.
  const [aliasTab, aliasView] = (map.catalyst || map.sixTab) && requestedTab === 'customers' && requestedView === 'broadcast' ? ['broadcasts'] : aliases[requestedTab] || [];
  const tab = aliasTab || requestedTab;
  const home = map.sixTab ? 'work' : map.sections[0] === 'today' ? 'today' : 'chats';
  if (!map.sections.includes(tab)) return { tab: home, view: map.views[home]?.[0] ?? null };
  const views = map.views[tab];
  if (!views) return { tab, view: null };
  if (views.length === 0) return { tab, view: null };
  const wanted = aliasView || (map.catalyst && CATALYST_VIEWS[requestedView]) || requestedView;
  return { tab, view: views.includes(wanted) ? wanted : views[0] };
}
