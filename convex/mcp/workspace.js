// Read-only orientation for an assistant: what this workspace is, what it may do here,
// and what is waiting. Each section respects the areas the owner granted.
import { toolsFor } from '../../config/mcp/contracts.js';
import { grantLive } from '../grantStatus.js';

const PAYMENTS_SHOWN = 5;

/** Counts of the tools this connection may call, by group, so the assistant knows where to look. */
function toolGroups(p) {
  const groups = {};
  for (const t of toolsFor({ ...p, scopes: p.connection.scopes })) groups[t.domain] = (groups[t.domain] || 0) + 1;
  return groups;
}

export async function workspaceSummary(ctx, p, now = Date.now()) {
  const areas = p.connection.areas || [];
  const waiting = await ctx.db
    .query('mcpRuns')
    .withIndex('by_connection', q => q.eq('connectionId', p.connection._id))
    .order('desc')
    .take(100);
  const progress = await ctx.db
    .query('productSetupProgress')
    .withIndex('by_account_product', q =>
      q.eq('accountId', p.account._id).eq('product', ['ascend', 'apex'].includes(p.plan) ? 'ascend' : 'catalyst'),
    )
    .unique();
  const summary = {
    workspace: {
      businessName: p.row.profile?.businessName || '',
      sector: p.row.profile?.sector || '',
      plan: p.plan,
      hasibPack: p.hasibAvailable ? p.packId || null : null,
    },
    connection: {
      areas,
      canWrite: p.connection.scopes.includes('workspace:write'),
      runsWithoutApproval: p.connection.direct,
      expiresAt: p.connection.expiresAt,
    },
    setup: {
      step: progress?.step ?? 0,
      completed: progress?.completed === true,
      bznsPublished: !!p.row.bznsPublished,
      profileReviewed: !!p.row.profile?.reviewed,
    },
    requests: {
      waitingForApproval: waiting.filter(r => r.status === 'approval_required' && r.expiresAt > now).length,
      approvedNotRetried: waiting.filter(r => r.status === 'approved' && r.expiresAt > now).length,
    },
    toolGroups: toolGroups(p),
    firstCalls: [
      'bznsflow_dashboard_overview',
      'bznsflow_business_state',
      p.hasibAvailable ? 'bznsflow_hasib_overview' : 'bznsflow_catalog_summary',
    ],
  };
  if (areas.includes('conversations'))
    summary.channels = {
      whatsapp: p.row.integration ? p.row.status || 'unknown' : 'not_connected',
    };
  return summary;
}

export async function billingState(ctx, p, now = Date.now()) {
  const email = String(p.account.email || '')
    .toLowerCase()
    .trim();
  const grant = await ctx.db
    .query('blueAccessGrants')
    .withIndex('by_email', q => q.eq('email', email))
    .unique();
  const payments = await ctx.db
    .query('billingPayments')
    .withIndex('by_account_created', q => q.eq('accountId', p.account._id))
    .order('desc')
    .take(PAYMENTS_SHOWN);
  return {
    plan: p.plan,
    active: grantLive(grant, now),
    paidUntil: grant?.paidUntil ?? null,
    billingInterval: grant?.billingInterval ?? null,
    payments: payments.map(x => ({
      plan: x.plan,
      interval: x.interval,
      amountBaisa: x.baisa,
      currency: x.currency,
      status: x.status,
      createdAt: x.createdAt,
    })),
  };
}
