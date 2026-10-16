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
      activity,
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
    workspacePath: state.tool.domain === "hasib" ? "/layla/dashboard" : "/mcp",
  };
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
    tools: toolsFor({ ...p, scopes: p.connection.scopes }).map((t) => t.name),
  };
}

export async function requestStatus(ctx, p, runId, now = Date.now()) {
  const run = await ctx.db.get(runId);
  demand(
    run &&
      run.connectionId === p.connection._id &&
      run.accountId === p.account._id &&
      run.expiresAt > now,
    "run_not_found",
  );
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
            : "invitation",
      status,
      reason: row?.reason || null,
    });
  }
  let status = run.status;
  if (effects.length) {
    const pending = [
      "queued",
      "pending",
      "scheduled",
      "starting",
      "processing",
      "attempting",
      "submitted",
      "sending",
    ];
    if (
      effects.some((e) => ["ambiguous", "outcome_unknown"].includes(e.status))
    )
      status = "outcome_unknown";
    else if (effects.some((e) => pending.includes(e.status)))
      status = "pending";
    else if (
      effects.some((e) => ["failed", "blocked", "cancelled"].includes(e.status))
    )
      status = "failed";
    else status = "completed";
  }
  return {
    runId: run._id,
    reason: run.reason || null,
    status,
    result: run.result ?? null,
    effects,
    expiresAt: run.expiresAt,
  };
}
