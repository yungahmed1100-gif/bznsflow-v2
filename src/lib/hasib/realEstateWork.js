// Real Estate Deals: the board's grouping and quick filters, and the links that carry a
// record between Chats, Deals and Insights. Pure functions, shared by the views and tests.

export const BOARD_STAGES = ['new', 'contacted', 'qualified', 'viewing', 'offer'];
export const QUICK_FILTERS = ['all', 'mine', 'unassigned', 'awaiting', 'viewing_due'];
const AWAITING_TASKS = new Set(['first_response_overdue', 'second_attempt_overdue', 'rule_missing_requirements', 'rule_post_viewing_decision']);
const LIVE_VIEWING = new Set(['requested', 'confirmed']);
const DAY = 86400000;

/** The next live viewing of each deal, from the agency's viewing list. */
export function nextViewings(viewings = [], now = Date.now()) {
  const out = new Map();
  for (const v of viewings) {
    if (!LIVE_VIEWING.has(v.status)) continue;
    const prev = out.get(v.opportunityId);
    // A viewing whose time passed without an outcome still leads: it needs recording.
    const rank = x => (x.scheduledAt < now ? -1e15 : 0) + x.scheduledAt;
    if (!prev || rank(v) < rank(prev)) out.set(v.opportunityId, v);
  }
  return out;
}

/** Deals for one quick filter. `tasks` are the overview's open tasks; `viewing` maps deal → next viewing. */
export function quickFilter(deals, quick, { actorAccountId, tasks = [], viewing = new Map(), now = Date.now() } = {}) {
  if (quick === 'mine') return deals.filter(d => d.assignedAccountId && String(d.assignedAccountId) === String(actorAccountId));
  if (quick === 'unassigned') return deals.filter(d => !d.assignedAccountId);
  if (quick === 'awaiting') {
    const waiting = new Set(tasks.filter(t => AWAITING_TASKS.has(t.kind) && t.entityType === 'opportunity').map(t => String(t.entityId)));
    return deals.filter(d => waiting.has(String(d.id)));
  }
  if (quick === 'viewing_due') return deals.filter(d => { const v = viewing.get(d.id); return v && v.scheduledAt < now + 2 * DAY; });
  return deals;
}

/** Open deals by stage, oldest activity first so the stalest card sits on top. */
export function groupByStage(deals) {
  const columns = Object.fromEntries(BOARD_STAGES.map(stage => [stage, []]));
  for (const d of deals) if (columns[d.stage]) columns[d.stage].push(d);
  for (const list of Object.values(columns)) list.sort((x, y) => (x.updatedAt || 0) - (y.updatedAt || 0));
  return columns;
}

/** Stages a deal may move to from the board: forward only (lost goes through its own form). */
export const forwardStages = stage => BOARD_STAGES.slice(BOARD_STAGES.indexOf(stage) + 1);

/** What a deal is looking for, in one line. */
export const requirementLine = (deal, typeLabel = x => x, sep = ' · ') => [deal.propertyTypes?.map(typeLabel).join('/') || null, deal.areas?.join('، ') || null].filter(Boolean).join(sep);

/** The URL parameters that open Insights' source records in Deals and bring the owner back. */
export const metricSearch = ({ metric, period, segment }) => ({ view: 'board', metric, from: 'insights', ...(period ? { period } : {}), ...(segment ? { segment } : {}) });
export const insightsReturn = params => ({ ...(params.get('metric') ? { metric: params.get('metric') } : {}), ...(params.get('period') ? { period: params.get('period') } : {}), ...(params.get('segment') ? { segment: params.get('segment').split(':')[0] } : {}) });
