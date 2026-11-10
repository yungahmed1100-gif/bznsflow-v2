import { recordLinks } from "../../config/mcp/links.js";
import { transfer } from "./transfers.js";
import { executeAuthorizedDashboard } from "../dashboardApplication.js";
import {
  AREAS,
  CATEGORIES,
  SCOPES,
  TOOL_BY_NAME,
  toolsFor,
} from "../../config/mcp/contracts.js";
import {
  canonical,
  encodedSize,
  valid,
  publicResult,
} from "../../config/mcp/validation.js";
import { hmacSha256Hex } from "../hash.js";
import {
  browserOwner,
  connectionOwner,
  demand,
  lookup,
  toolAllowed,
} from "./access.js";
const DAY = 86400000;
const digest = (value) =>
  hmacSha256Hex("bznsflow-mcp-fingerprint-v1", canonical(value));
const publicConnection = (c) => ({
  id: c._id,
  clientId: c.clientId,
  clientName: c.clientName,
  scopes: c.scopes,
  grantedScopes: c.grantedScopes,
  areas: c.areas,
  direct: c.direct,
  createdAt: c.createdAt,
  expiresAt: c.expiresAt,
  revokedAt: c.revokedAt ?? null,
  lastUsedAt: c.lastUsedAt ?? null,
  verifiedAt: c.verifiedAt ?? null,
  version: c.version,
});
export async function snapshot(ctx, p, args, tool) {
  const records = [];
  async function visit(value, depth = 0) {
    if (depth > 8) return;
    if (Array.isArray(value)) {
      for (const v of value.slice(0, 100)) await visit(v, depth + 1);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, v] of Object.entries(value)) {
      if (
        (key.endsWith("Id") || key === "linkedId") &&
        key !== "requestId" &&
        typeof v === "string"
      ) {
        let row;
        try {
          row = await ctx.db.get(v);
        } catch {
          continue;
        }
        if (row) {
          if (row.workspaceId) {
            const workspace = await ctx.db.get(row.workspaceId);
            demand(
              workspace?.managerAccountId === p.account._id,
              "foreign_record",
            );
          } else
            demand(
              !row.accountId || row.accountId === p.account._id,
              "foreign_record",
            );
          demand(!row.reviewId || row.reviewId === p.row._id, "foreign_record");
          demand(
            !row.ownerKey || row.ownerKey === String(p.account._id),
            "foreign_record",
          );
          records.push([v, row]);
        }
      } else if (key.endsWith("Ids") && Array.isArray(v)) {
        for (const id of v) await visit({ recordId: id }, depth + 1);
      } else if (v && typeof v === "object") await visit(v, depth + 1);
    }
  }
  await visit(args);
  if (
    tool?.domain === "catalog" ||
    (tool?.domain === "brain" && ["publish", "accept"].includes(tool.operation))
  ) {
    for (const status of ["draft", "approved"]) {
      const entries = await ctx.db
        .query("blueCatalogEntries")
        .withIndex("by_owner_status_order", (q) =>
          q.eq("ownerKey", String(p.account._id)).eq("status", status),
        )
        .take(501);
      records.push(["catalog", entries]);
    }
  }
  const catalog = await lookup(
    ctx,
    "blueCatalogMeta",
    "by_owner",
    "ownerKey",
    String(p.account._id),
  );
  if (args.sourceKey) {
    const source = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_account_key", (q) =>
        q.eq("accountId", p.account._id).eq("sourceKey", args.sourceKey),
      )
      .unique();
    if (source) records.push(["knowledge", source]);
  }
  if (args.idempotencyKey && args.requestId) {
    const draft = await ctx.db
      .query("knowledgeImportDrafts")
      .withIndex("by_account_request", (q) =>
        q.eq("accountId", p.account._id).eq("requestId", args.requestId),
      )
      .unique();
    if (draft) records.push(["draft", draft]);
  }

  return digest({
    catalogRevision: catalog?.revision,
    behaviour: p.row.behaviour,
    connectionVersion: p.connection.version,
    profileVersion: p.row.profileVersion,
    integrationId: p.row.integration?.id,
    bznsDraft: p.row.bznsDraft,
    bznsPublished: p.row.bznsPublished,
    settings: p.settings,
    records,
  });
}
export async function audit(ctx, p, tool, status, now, runId) {
  await ctx.db.insert("mcpAudit", {
    accountId: p.account._id,
    connectionId: p.connection._id,
    tool,
    status,
    at: now,
    expiresAt: now + 30 * DAY,
    ...(runId ? { runId } : {}),
  });
}
// The API reports each call's duration once the call returns. The call already
// wrote its own activity row, so the duration joins that row instead of
// becoming a second one. Calls refused before any row was written (unknown or
// forbidden tools, bad arguments) still get a row of their own.
export async function recordMetric(ctx, input, now = Date.now()) {
  const c = await ctx.db.get(
    ctx.db.normalizeId("mcpConnections", input.connectionId),
  );
  demand(
    c && TOOL_BY_NAME.has(input.tool) && /^[a-z_]{3,60}$/.test(input.status),
    "invalid_metric",
  );
  const durationMs = Math.max(
    0,
    Math.min(60000, Number(input.durationMs) || 0),
  );
  const since = now - Math.max(durationMs, 0) - 5000;
  const recent = await ctx.db
    .query("mcpAudit")
    .withIndex("by_account", (q) =>
      q.eq("accountId", c.accountId).gte("at", since),
    )
    .order("desc")
    .take(50);
  const own = recent.find(
    (r) =>
      r.connectionId === c._id &&
      r.tool === input.tool &&
      r.durationMs === undefined,
  );
  if (own) await ctx.db.patch(own._id, { durationMs });
  else
    await ctx.db.insert("mcpAudit", {
      accountId: c.accountId,
      connectionId: c._id,
      tool: input.tool,
      status: input.status,
      durationMs,
      at: now,
      expiresAt: now + 30 * DAY,
    });
  return null;
}
// Rows written before recordMetric joined them: the call's own row had no
// duration, and the metric then wrote a timed copy just after it.
function withoutMetricEchoes(rows) {
  return rows.filter(
    (r) =>
      r.runId ||
      r.durationMs === undefined ||
      !rows.some(
        (o) =>
          o !== r &&
          o.durationMs === undefined &&
          o.connectionId === r.connectionId &&
          o.tool === r.tool &&
          o.status === r.status &&
          o.at <= r.at &&
          r.at - o.at <= 5000,
      ),
  );
}
export async function rate(ctx, key, max, now, window = 60000) {
  const r = await lookup(ctx, "mcpLimits", "by_key", "key", key);
  if (r && r.expiresAt > now) {
    demand(r.count < max, "rate_limited");
    await ctx.db.patch(r._id, { count: r.count + 1 });
  } else if (r)
    await ctx.db.patch(r._id, { count: 1, expiresAt: now + window });
  else
    await ctx.db.insert("mcpLimits", {
      key,
      count: 1,
      expiresAt: now + window,
    });
}
export async function manage(ctx, a, now = Date.now()) {
  const p = await browserOwner(
    ctx,
    a.tokenHash,
    now,
    a.operation === "connect" || a.operation === "policy",
  );
  if (a.operation === "list") {
    const recent = await ctx.db
      .query("mcpConnections")
      .withIndex("by_account", (q) => q.eq("accountId", p.account._id))
      .order("desc")
      .take(40);
    const active = await ctx.db
      .query("mcpConnections")
      .withIndex("by_account_active", (q) =>
        q
          .eq("accountId", p.account._id)
          .eq("revokedAt", undefined)
          .gt("expiresAt", now),
      )
      .take(10);
    const connections = [
      ...new Map([...active, ...recent].map((c) => [c._id, c])).values(),
    ];
    const approvals = await ctx.db
      .query("mcpRuns")
      .withIndex("by_account_status", (q) =>
        q.eq("accountId", p.account._id).eq("status", "approval_required"),
      )
      .order("desc")
      .take(50);
    const activity = await ctx.db
      .query("mcpAudit")
      .withIndex("by_account", (q) => q.eq("accountId", p.account._id))
      .order("desc")
      .take(50);
    return {
      connections: connections.map(publicConnection),
      approvals: approvals
        .filter((r) => r.expiresAt > now)
        .map((r) => ({
          id: r._id,
          connectionId: r.connectionId,
          tool: r.tool,
          args: r.args,
          preview: r.preview,
          expiresAt: r.expiresAt,
        })),
      activity: withoutMetricEchoes(activity),
      account: { email: p.account.email, plan: p.plan },
      workspace: {
        id: String(p.account._id),
        name: p.row.profile?.businessName || "",
        plan: p.plan,
      },
      enabled: process.env.MCP_ENABLED === "true",
    };
  }
  if (a.operation === "connect") {
    demand(process.env.MCP_ENABLED === "true", "mcp_disabled");
    demand(
      !process.env.MCP_PILOT_EMAIL ||
        process.env.MCP_PILOT_EMAIL.toLowerCase() ===
          p.account.email.toLowerCase(),
      "mcp_pilot_only",
    );
    demand(
      typeof a.clientId === "string" &&
        a.clientId.length <= 2048 &&
        typeof a.clientName === "string" &&
        a.clientName.length <= 120,
      "invalid_client",
    );
    demand(
      Array.isArray(a.scopes) &&
        a.scopes.includes("workspace:read") &&
        a.scopes.every((s) => SCOPES.includes(s)),
      "invalid_scope",
    );
    demand(
      Array.isArray(a.areas || AREAS) &&
        (a.areas || AREAS).every((k) => AREAS.includes(k)),
      "invalid_permissions",
    );
    const rows = await ctx.db
      .query("mcpConnections")
      .withIndex("by_account_active", (q) =>
        q
          .eq("accountId", p.account._id)
          .eq("revokedAt", undefined)
          .gt("expiresAt", now),
      )
      .take(11);
    demand(
      rows.filter((c) => !c.revokedAt && c.expiresAt > now).length < 10,
      "connection_limit",
    );
    const id = await ctx.db.insert("mcpConnections", {
      accountId: p.account._id,
      clientId: a.clientId,
      clientName: a.clientName,
      scopes: a.scopes,
      grantedScopes: a.scopes,
      areas: a.areas || AREAS,
      direct: [],
      createdAt: now,
      expiresAt: now + 30 * DAY,
      version: 1,
    });
    return { id, accountId: p.account._id, expiresAt: now + 30 * DAY };
  }
  const connection = await ctx.db.get(a.connectionId);
  demand(connection?.accountId === p.account._id, "connection_not_found");
  if (a.operation === "revoke") {
    if (connection.grantId) {
      const grant = await ctx.db
        .query("mcpOAuth")
        .withIndex("by_key", (q) =>
          q.eq("model", "Grant").eq("key", connection.grantId),
        )
        .unique();
      if (grant) await ctx.db.delete(grant._id);
      const tokens = await ctx.db
        .query("mcpOAuth")
        .withIndex("by_grant", (q) => q.eq("grantId", connection.grantId))
        .take(1000);
      for (const token of tokens) await ctx.db.delete(token._id);
    }
    await ctx.db.patch(connection._id, {
      revokedAt: now,
      version: connection.version + 1,
    });
    await audit(ctx, { ...p, connection }, "connection", "revoked", now);
    return { revoked: true };
  }
  if (a.operation === "policy") {
    demand(
      !connection.revokedAt && connection.expiresAt > now,
      "connection_revoked",
    );
    demand(
      Array.isArray(a.direct) && a.direct.every((c) => CATEGORIES.includes(c)),
      "invalid_policy",
    );
    demand(
      Array.isArray(a.scopes) &&
        a.scopes.includes("workspace:read") &&
        a.scopes.every((s) => SCOPES.includes(s)) &&
        a.scopes.every((s) =>
          (connection.grantedScopes || connection.scopes).includes(s),
        ),
      "reauthorization_required",
    );
    demand(
      Array.isArray(a.areas || connection.areas) &&
        (a.areas || connection.areas).every((k) => AREAS.includes(k)),
      "invalid_permissions",
    );
    await ctx.db.patch(connection._id, {
      areas: a.areas || connection.areas,
      direct: [...new Set(a.direct)],
      scopes: a.scopes,
      version: connection.version + 1,
    });
    await audit(ctx, { ...p, connection }, "connection", "policy_changed", now);
    return { updated: true };
  }
  if (["approve", "reject"].includes(a.operation)) {
    const run = await ctx.db.get(a.runId);
    demand(
      run &&
        run.connectionId === connection._id &&
        run.accountId === p.account._id,
      "approval_not_found",
    );
    demand(
      run.status === "approval_required" && run.expiresAt > now,
      "approval_expired",
    );
    const current = await connectionOwner(ctx, connection._id, now),
      tool = TOOL_BY_NAME.get(run.tool);
    demand(toolAllowed(tool, current), "access_required");
    if (a.operation === "approve")
      demand(
        run.snapshot === (await snapshot(ctx, current, run.args, tool)),
        "approval_stale",
      );
    await ctx.db.patch(run._id, {
      status: a.operation === "approve" ? "approved" : "rejected",
      ...(a.operation === "approve"
        ? { approvedAt: now }
        : { args: undefined }),
    });
    await audit(
      ctx,
      current,
      run.tool,
      a.operation === "approve" ? "approved" : "rejected",
      now,
      run._id,
    );
    return {
      runId: run._id,
      status: a.operation === "approve" ? "approved" : "rejected",
    };
  }
  throw Error("invalid_operation");
}
export async function prepare(ctx, a, now = Date.now()) {
  const p = await connectionOwner(ctx, a.connectionId, now),
    tool = TOOL_BY_NAME.get(a.tool);
  demand(toolAllowed(tool, p), "tool_not_allowed");
  demand(
    valid(tool.inputSchema, a.args) && encodedSize(a.args) <= 450000,
    "invalid_arguments",
  );
  const args = a.args;
  if (tool.category === "read") return { status: "ready", tool: tool.name };
  const fingerprint = digest({ tool: a.tool, args });
  const old = await ctx.db
    .query("mcpRuns")
    .withIndex("by_request", (q) =>
      q
        .eq("connectionId", p.connection._id)
        .eq("requestId", args.idempotencyKey || args.requestId),
    )
    .unique();
  if (old) {
    demand(old.fingerprint === fingerprint, "idempotency_conflict");
    demand(old.status !== "rejected", "approval_rejected");
    demand(old.status !== "cancelled", "request_cancelled");
    demand(
      !["approval_required", "approved", "ready"].includes(old.status) ||
        old.expiresAt > now,
      "approval_expired",
    );
    return {
      runId: old._id,
      status: old.status,
      result: old.result ?? null,
      expiresAt: old.expiresAt,
    };
  }
  const status = (tool.categories || [tool.category]).some(
    (c) => CATEGORIES.includes(c) && !p.connection.direct.includes(c),
  )
    ? "approval_required"
    : "ready";
  if (status === "approval_required") {
    const pending = await ctx.db
      .query("mcpRuns")
      .withIndex("by_account_status", (q) =>
        q
          .eq("accountId", p.account._id)
          .eq("status", "approval_required")
          .gt("createdAt", now - 15 * 60000),
      )
      .take(50);
    demand(pending.length < 50, "approval_limit");
  }
  let exportPreview;
  if (tool.category === "exports") {
    const exported = await executeAuthorizedDashboard(ctx, {
      ...args,
      sessionHash: p.account.draftHash,
      actorAccountId: p.account._id,
      operation: tool.operation,
    });
    demand(exported.ok, exported.reason || "export_failed");
    exportPreview = publicResult(exported.value);
    demand(encodedSize(exportPreview) <= 450000, "transfer_too_large");
  }
  const preview = {
    categories: tool.categories || [tool.category],
    records: Object.entries(args)
      .filter(([k, v]) => /Ids?$/.test(k) && k !== "requestId")
      .map(([field, value]) => ({ field, value })),
    ...(exportPreview
      ? {
          exportRecords: (
            exportPreview.items ||
            exportPreview.chats ||
            exportPreview.messages ||
            []
          ).length,
        }
      : {}),
  };
  if (tool.domain === "files" && tool.operation === "import_contacts") {
    const file = await transfer(ctx, p, args.transferId, now);
    preview.contacts = file.payload;
  }
  for (const item of preview.records) {
    const ids = Array.isArray(item.value) ? item.value : [item.value];
    item.summaries = [];
    for (const id of ids.slice(0, 100)) {
      let record;
      try {
        record = await ctx.db.get(id);
      } catch {
        continue;
      }
      if (record)
        item.summaries.push({
          id,
          label:
            record.ownerName ||
            record.name ||
            record.nameEn ||
            record.nameAr ||
            record.email ||
            record.number ||
            record.waId ||
            id,
          version: record.version ?? record.updatedAt ?? null,
        });
    }
  }
  const runId = await ctx.db.insert("mcpRuns", {
    accountId: p.account._id,
    connectionId: p.connection._id,
    tool: tool.name,
    args,
    preview,
    ...(exportPreview ? { exportPreview } : {}),
    fingerprint,
    snapshot: await snapshot(ctx, p, args, tool),
    requestId: args.idempotencyKey || args.requestId,
    status,
    createdAt: now,
    expiresAt: now + 15 * 60000,
  });
  await audit(ctx, p, tool.name, status, now, runId);
  return { runId, status, preview, expiresAt: now + 15 * 60000 };
}
export async function resolveRun(ctx, a, now = Date.now()) {
  const p = await connectionOwner(ctx, a.connectionId, now),
    tool = TOOL_BY_NAME.get(a.tool);
  demand(toolAllowed(tool, p), "tool_not_allowed");
  if (tool.category === "read") {
    demand(valid(tool.inputSchema, a.args), "invalid_arguments");
    return { p, tool, args: a.args };
  }
  const run = await ctx.db.get(a.runId);
  demand(
    run && run.connectionId === p.connection._id && run.tool === tool.name,
    "run_not_found",
  );
  if (
    ["completed", "pending", "outcome_unknown", "failed"].includes(run.status)
  )
    return { p, tool, run, replay: true };
  demand(
    ["ready", "approved"].includes(run.status) && run.expiresAt > now,
    "approval_required",
  );
  if (
    (tool.categories || [tool.category]).some(
      (c) => CATEGORIES.includes(c) && !p.connection.direct.includes(c),
    )
  )
    demand(run.approvedAt, "approval_required");
  demand(
    run.snapshot === (await snapshot(ctx, p, run.args, tool)),
    "approval_stale",
  );
  return { p, tool, run, args: run.args };
}
export async function finish(
  ctx,
  state,
  result,
  now = Date.now(),
  effects = [],
) {
  demand(result?.ok, result?.reason || "operation_failed");
  const value = publicResult(result.value);
  demand(encodedSize(value) <= 500000, "result_too_large");
  const status =
    effects.length ||
    value?.queued ||
    value?.invitationDelivery === "pending" ||
    value?.status === "scheduled" ||
    value?.status === "processing"
      ? "pending"
      : "completed";
  if (state.run)
    await ctx.db.patch(state.run._id, {
      status,
      result: value,
      effects,
      args: undefined,
      exportPreview: undefined,
      finishedAt: now,
      expiresAt: now + 30 * DAY,
    });
  await audit(ctx, state.p, state.tool.name, status, now, state.run?._id);
  return {
    status,
    recordLinks: recordLinks(state.tool, state.args, value),
    result: value,
    ...(state.run ? { runId: state.run._id } : {}),
    ...(effects.length
      ? {
          delivery:
            "Queued work is not confirmed delivery. Use bznsflow_requests_status to check outcomes.",
        }
      : {}),
    workspacePath: workspacePath(state.tool),
  };
}
const DOMAIN_TABS = {
  hasib: "",
  dashboard: "chats",
  messaging: "chats",
  catalog: "catalog",
  brain: "bzns",
  business: "bzns",
  knowledge: "bzns",
  website: "website",
  email: "email",
  onboarding: "settings",
  files: "customers",
};
/** The dashboard tab where the owner sees what this tool changed. */
function workspacePath(tool) {
  if (tool.domain === "dashboard" && /campaign|template/.test(tool.operation))
    return "/layla/dashboard?tab=broadcasts";
  if (tool.domain === "dashboard" && /contact/.test(tool.operation))
    return "/layla/dashboard?tab=customers";
  if (!Object.hasOwn(DOMAIN_TABS, tool.domain)) return "/mcp";
  return DOMAIN_TABS[tool.domain]
    ? `/layla/dashboard?tab=${DOMAIN_TABS[tool.domain]}`
    : "/layla/dashboard";
}
export async function admit(ctx, a, now = Date.now()) {
  const p = await connectionOwner(ctx, a.connectionId, now);
  await rate(ctx, `connection:${a.connectionId}`, 120, now);
  await rate(ctx, `workspace:${p.account._id}`, 300, now);
  const leases = await ctx.db
    .query("mcpLeases")
    .withIndex("by_connection", (q) => q.eq("connectionId", a.connectionId))
    .take(20);
  demand(
    leases.filter((r) => r.expiresAt > now).length < 5,
    "concurrency_limited",
  );
  for (const l of leases) if (l.expiresAt <= now) await ctx.db.delete(l._id);
  demand(typeof a.lease === "string" && a.lease.length <= 80, "invalid_lease");
  await ctx.db.insert("mcpLeases", {
    key: a.lease,
    connectionId: a.connectionId,
    expiresAt: now + 65000,
  });
  await ctx.db.patch(a.connectionId, {
    lastUsedAt: now,
    verifiedAt: p.connection.verifiedAt || now,
  });
  return {
    connectionId: a.connectionId,
    plan: p.plan,
    packId: p.packId,
    capabilities: p.capabilities,
    scopes: p.connection.scopes,
    // Server-side only: the API checks it against the Rasil allow-list.
    email: p.account.email,
    tools: toolsFor({ ...p, scopes: p.connection.scopes }).map((t) => t.name),
  };
}

const PENDING_EFFECTS = new Set([
  "queued", "pending", "scheduled", "starting", "processing", "attempting",
  "submitted", "sending", "sent",
]);
const FAILED_EFFECTS = new Set(["failed", "blocked", "cancelled", "bounced"]);
// A complaint is reported after delivery; it is a delivered email marked as spam.
const COMPLETED_EFFECTS = new Set(["completed", "delivered", "read", "complained"]);
function effectOutcome(statuses) {
  if (statuses.some(status =>
    !PENDING_EFFECTS.has(status) && !FAILED_EFFECTS.has(status) && !COMPLETED_EFFECTS.has(status)
  )) return "outcome_unknown";
  if (statuses.some(status => PENDING_EFFECTS.has(status))) return "pending";
  if (statuses.some(status => FAILED_EFFECTS.has(status))) return "failed";
  return "completed";
}

async function campaignOutcome(ctx, campaign) {
  // Campaigns admit at most 100 recipients. Read one extra to detect drift,
  // rather than reporting success from a truncated or expired receipt set.
  const recipients = await ctx.db.query("blueCampaignRecipients")
    .withIndex("by_campaign_status", q => q.eq("campaignId", campaign._id))
    .take(101);
  const counts = Object.fromEntries([...new Set(recipients.map(r => r.status))]
    .map(status => [status, recipients.filter(r => r.status === status).length]));
  const completeEvidence = Number.isInteger(campaign.recipientCount) &&
    campaign.recipientCount > 0 && campaign.recipientCount <= 100 &&
    recipients.length === campaign.recipientCount;
  // "completed" means the worker has no more attempts, not that Meta delivered.
  const statuses = recipients.map(r => r.status);
  if (campaign.status !== "completed") statuses.push(campaign.status);
  return {
    status: completeEvidence ? effectOutcome(statuses) : "outcome_unknown",
    processingStatus: campaign.status,
    counts,
  };
}

// Email campaigns reach up to 2,000 people, so their receipts are the campaign's own counts.
function emailCampaignOutcome(campaign) {
  const counts = campaign.counts || {};
  const statuses = Object.keys(counts).filter((k) => counts[k] > 0);
  const total = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  if (campaign.status !== "completed") statuses.push(campaign.status);
  return {
    status: total === campaign.recipientCount ? effectOutcome(statuses) : "outcome_unknown",
    processingStatus: campaign.status,
    counts,
  };
}
export async function requestStatus(ctx, p, runId, now = Date.now()) {
  let run;
  try {
    run = await ctx.db.get(runId);
  } catch {
    run = null;
  }
  demand(
    run &&
      run.connectionId === p.connection._id &&
      run.accountId === p.account._id,
    "run_not_found",
  );
  if (run.expiresAt <= now) {
    // Waiting approvals expire in 15 minutes but stay readable until cleanup.
    demand(["approval_required", "approved", "ready"].includes(run.status), "run_not_found");
    return {
      runId: run._id,
      tool: run.tool,
      status: "approval_expired",
      reason: null,
      result: null,
      effects: [],
      expiresAt: run.expiresAt,
      next: NEXT.approval_expired,
    };
  }
  demand(toolAllowed(TOOL_BY_NAME.get(run.tool), p), "tool_not_allowed");
  const effects = [];
  for (const ref of run.effects || []) {
    const row = await ctx.db.get(ref.id);
    const status =
      row?.status === "attempting" &&
      ref.table === "mcpEffects" &&
      row.updatedAt < now - 65000
        ? "outcome_unknown"
        : row?.status || "outcome_unknown";
    effects.push({
      id: ref.id,
      kind:
        ref.table === "blueMessages"
          ? "message"
          : ref.table === "blueCampaigns"
            ? "campaign"
            : ref.table === "emailCampaigns"
              ? "email_campaign"
              : "invitation",
      status,
      ...(row && ref.table === "blueCampaigns" ? await campaignOutcome(ctx, row) : {}),
      ...(row && ref.table === "emailCampaigns" ? emailCampaignOutcome(row) : {}),
      reason: row?.reason || null,
    });
  }
  let status = run.status;
  if (effects.length) status = effectOutcome(effects.map(e => e.status));
  return {
    runId: run._id,
    tool: run.tool,
    reason: run.reason || null,
    status,
    result: run.result ?? null,
    effects,
    expiresAt: run.expiresAt,
    ...(NEXT[status] ? { next: NEXT[status] } : {}),
  };
}
const NEXT = {
  approval_required: "Waiting for the owner to approve it on the BznsFlow website.",
  approved: "Approved. Retry the same tool with the same arguments and requestId now.",
  ready: "Prepared. Retry the same tool with the same arguments and requestId to run it.",
  pending: "Accepted and queued. Delivery is not confirmed yet; check again later.",
  outcome_unknown: "The result could not be confirmed. Do not repeat the action; ask the owner to check the workspace.",
  approval_expired: "The approval window passed. Prepare a new request with a new requestId.",
  rejected: "The owner rejected it. Do not retry.",
  cancelled: "Cancelled. Nothing ran.",
};
const LISTED_STATUSES = ["approval_required", "approved", "ready", "pending", "completed", "failed", "outcome_unknown", "rejected", "cancelled"];
/** This connection's recent requests, newest first, without their stored arguments. */
export async function listRequests(ctx, p, args, now = Date.now()) {
  demand(!args.status || LISTED_STATUSES.includes(args.status), "invalid_arguments");
  const limit = Math.min(50, args.limit || 20);
  const rows = await ctx.db
    .query("mcpRuns")
    .withIndex("by_connection", (q) => q.eq("connectionId", p.connection._id))
    .order("desc")
    .take(200);
  const items = [];
  for (const run of rows) {
    if (args.status && run.status !== args.status) continue;
    const expired = run.expiresAt <= now && ["approval_required", "approved", "ready"].includes(run.status);
    if (run.expiresAt <= now && !expired) continue;
    const status = expired ? "approval_expired" : run.status;
    items.push({
      runId: run._id,
      tool: run.tool,
      status,
      createdAt: run.createdAt,
      expiresAt: run.expiresAt,
      ...(NEXT[status] ? { next: NEXT[status] } : {}),
    });
    if (items.length >= limit) break;
  }
  return { items };
}
/** Withdraw one of this connection's own requests that has not run. */
export async function cancelRequest(ctx, p, runId, now = Date.now()) {
  let run;
  try {
    run = await ctx.db.get(runId);
  } catch {
    run = null;
  }
  demand(run && run.connectionId === p.connection._id && run.accountId === p.account._id, "run_not_found");
  if (run.status === "cancelled") return { runId: run._id, status: "cancelled", replay: true };
  demand(["approval_required", "approved", "ready"].includes(run.status), "request_not_cancellable");
  await ctx.db.patch(run._id, { status: "cancelled", args: undefined, exportPreview: undefined, finishedAt: now });
  await audit(ctx, p, run.tool, "cancelled", now, run._id);
  return { runId: run._id, status: "cancelled", tool: run.tool };
}
