// MCP tool handlers added on 10 November 2026: request tracking, the workspace summary,
// billing, setup progress, the Ascend website brief and Rasil email campaigns.
import { requestStatus, listRequests, cancelRequest } from '../requests.js';
import { workspaceSummary, billingState } from '../workspace.js';
import { executeProductSetupForAccount } from '../../productSetupState.js';
import { executeWebsiteBriefForAccount, websiteDraftFiles } from '../../websiteBriefState.js';
import { executeRasil } from '../../rasilState.js';
import { demand } from '../access.js';

async function requests({ ctx, p, tool, args, now }) {
  const value =
    tool.operation === 'list'
      ? await listRequests(ctx, p, args, now)
      : tool.operation === 'cancel'
        ? await cancelRequest(ctx, p, args.runId, now)
        : await requestStatus(ctx, p, args.runId, now);
  return { ok: true, value };
}

async function workspace({ ctx, p, now }) {
  return { ok: true, value: await workspaceSummary(ctx, p, now) };
}

async function billing({ ctx, p, now }) {
  return { ok: true, value: await billingState(ctx, p, now) };
}

/** Setup progress only; sector and VAT stay with bznsflow_hasib_settings_update. */
function onboarding({ ctx, p, tool, args, now }) {
  const product = args.product || (['ascend', 'apex'].includes(p.plan) ? 'ascend' : 'catalyst');
  const input =
    tool.operation === 'get'
      ? { operation: 'get', product }
      : {
          operation: 'save',
          product,
          step: args.step,
          version: args.version,
          requestId: args.requestId,
          ...(args.completed !== undefined ? { completed: args.completed } : {}),
        };
  return executeProductSetupForAccount(ctx, p.account, input, now);
}

// Storage links are capability URLs; the assistant gets what the brief says and which files exist.
function websiteForAssistant(view) {
  const { logo, photos, docs, ...rest } = view || {};
  return {
    ...rest,
    files: { logo: !!logo, photos: (photos || []).length, paymentDocuments: (docs || []).map(d => d.kind) },
  };
}

async function website({ ctx, p, tool, args, prepared, now }) {
  const accountId = p.account._id;
  if (tool.operation === 'state') {
    const result = await executeWebsiteBriefForAccount(ctx, accountId, { operation: 'get' }, now);
    return result.ok ? { ok: true, value: websiteForAssistant(result.value) } : result;
  }
  if (tool.operation === 'save_draft') {
    // A text edit keeps the logo, photos and documents already on the draft.
    const current = await websiteDraftFiles(ctx, accountId);
    return executeWebsiteBriefForAccount(
      ctx,
      accountId,
      {
        operation: 'save_draft',
        step: args.step,
        fields: { ...current.fields, ...args.fields },
        photoIds: current.photoIds,
        docIds: current.docIds,
        ...(current.logoId ? { logoId: current.logoId } : {}),
      },
      now,
    );
  }
  demand(Array.isArray(prepared.domains), 'invalid_preparation');
  return { ok: true, value: { results: prepared.domains } };
}

const language = lang => (lang === 'en' ? 'en' : 'ar');

function email({ domainCtx, tool, args, base, prepared, now }) {
  const rasil = (operation, extra = {}) => executeRasil(domainCtx, { ...base, ...extra, operation }, now);
  switch (tool.operation) {
    case 'draft':
      demand(prepared.draft, 'draft_unavailable');
      return { ok: true, value: { draft: prepared.draft } };
    case 'domain_check':
      demand(prepared.domainStatus, 'invalid_preparation');
      return rasil('domain_status', prepared.domainStatus);
    case 'campaign_create': {
      demand(Number.isSafeInteger(prepared.scheduledAt), 'invalid_schedule');
      const { schedule, ...rest } = args;
      return rasil('campaign_create', {
        ...rest,
        lang: language(rest.lang),
        scheduledAt: prepared.scheduledAt,
        timezone: schedule.timezone,
      });
    }
    case 'campaign_preview':
      return rasil('campaign_preview', { ...args, lang: language(args.lang) });
    case 'subscribers_import':
      return rasil('subscribers_import', {
        rows: args.rows,
        origin: args.origin === 'manual' ? 'manual' : 'import',
        consent: args.consent,
      });
    default: {
      const { requestId: _requestId, ...rest } = args;
      return rasil(tool.operation, rest);
    }
  }
}

export const PRODUCT_DOMAINS = { requests, workspace, billing, onboarding, website, email };
