import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { blueHarness, seedTenant } from "./helpers/blue-tenant.mjs";
import { manage, prepare, admit } from "../convex/mcp/state.js";
import { executeApplication } from "../convex/mcp/application.js";
import { connectionOwner, mcpEffectAllowed } from "../convex/mcp/access.js";
import { TOOLS, toolsFor } from "../config/mcp/contracts.js";
import { HASIB_OPERATIONS } from "../convex/hasib/hasibState.js";
import { HASIB_POLICY } from "../config/mcp/hasib-policy.js";
import { valid } from "../config/mcp/validation.js";
process.env.MCP_ENABLED = "true";
process.env.CONVEX_SERVICE_SECRET = "9".repeat(64);
async function fixture(plan = "ascend") {
  const h = blueHarness({ start: Date.now() }),
    { m } = h;
  await h.enable();
  await m.db.insert("blueMessagingSettings", { key: "hasib", enabled: true });
  const a = await seedTenant(m, { plan, sector: "Real estate" });
  await m.db.insert("sessions", {
    accountId: a.accountId,
    tokenHash: "1".repeat(64),
    createdAt: m.now(),
    expiresAt: m.now() + 86400000,
  });
  const c = await manage(
    m.ctx,
    {
      operation: "connect",
      tokenHash: "1".repeat(64),
      clientId: "synthetic-client",
      clientName: "Synthetic",
      scopes: ["workspace:read", "workspace:write"],
    },
    m.now(),
  );
  const call = async (tool, args = {}) => {
    const p = await prepare(m.ctx, { connectionId: c.id, tool, args }, m.now());
    if (p.status === "approval_required") return p;
    return executeApplication(
      m.ctx,
      { connectionId: c.id, tool, args, runId: p.runId },
      { workerFunction: "dispatch" },
      m.now(),
    );
  };
  return { ...h, a, c, call };
}
test("every Hasib operation has exactly one explicit policy and a closed tool schema", () => {
  assert.deepEqual(
    Object.keys(HASIB_POLICY).sort(),
    [...new Set(HASIB_OPERATIONS)].sort(),
  );
  assert.equal(new Set(TOOLS.map((t) => t.name)).size, TOOLS.length);
  for (const t of TOOLS) {
    assert.equal(t.inputSchema.additionalProperties, false, t.name);
    assert.ok(["tool", "handoff", "unavailable"].includes(t.disposition));
    assert.ok(!valid(t.inputSchema, { accountId: "injected" }), t.name);
    if (t.category !== "read")
      assert.ok(t.inputSchema.required.includes("requestId"));
  }
});
test("authenticated read, routine edit and exact approval slice reuse domain operations", async () => {
  const { m, c, call } = await fixture();
  const read = await call("bznsflow_business_state");
  assert.equal(read.status, "completed");
  assert.ok(read.result.profile);
  const write = await call("bznsflow_dashboard_set_timezone", {
    requestId: randomUUID(),
    timezone: "Asia/Muscat",
  });
  assert.equal(write.status, "completed");
  const args = { requestId: randomUUID(), confirm: true };
  const pending = await call("bznsflow_messaging_pause", args);
  assert.equal(pending.status, "approval_required");
  await assert.rejects(
    () =>
      executeApplication(
        m.ctx,
        {
          connectionId: c.id,
          tool: "bznsflow_messaging_pause",
          runId: pending.runId,
        },
        {},
        m.now(),
      ),
    /approval_required/,
  );
  await manage(
    m.ctx,
    {
      operation: "approve",
      tokenHash: "1".repeat(64),
      connectionId: c.id,
      runId: pending.runId,
    },
    m.now(),
  );
  const done = await call("bznsflow_messaging_pause", args);
  assert.equal(done.status, "completed");
  const again = await call("bznsflow_messaging_pause", args);
  assert.equal(again.replay, true);
  assert.deepEqual(done.result, again.result);
  await assert.rejects(
    () => call("bznsflow_messaging_pause", { ...args, confirm: false }),
    /idempotency_conflict/,
  );
});
test("employee, removed access, expired and revoked connections fail inside backend", async () => {
  const { m, a, c } = await fixture();
  await m.db.patch(c.id, { expiresAt: m.now() - 1 });
  await assert.rejects(
    () => connectionOwner(m.ctx, c.id, m.now()),
    /connection_revoked/,
  );
  await m.db.patch(c.id, { expiresAt: m.now() + 600000 });
  const member = await m.db.insert("ascendWorkspaceMembers", {
    accountId: a.accountId,
    status: "active",
  });
  await assert.rejects(
    () => connectionOwner(m.ctx, c.id, m.now()),
    /manager_required/,
  );
  await m.db.delete(member);
  const grant = m.table("blueAccessGrants")[0];
  await m.db.patch(grant._id, { status: "revoked" });
  await assert.rejects(
    () => connectionOwner(m.ctx, c.id, m.now()),
    /access_required/,
  );
  await m.db.patch(grant._id, { status: "active" });
  await manage(
    m.ctx,
    { operation: "revoke", tokenHash: "1".repeat(64), connectionId: c.id },
    m.now(),
  );
  await assert.rejects(
    () => connectionOwner(m.ctx, c.id, m.now()),
    /connection_revoked/,
  );
  assert.equal(
    await mcpEffectAllowed(
      m.ctx,
      { accountId: a.accountId, mcpConnectionId: c.id },
      m.now(),
    ),
    false,
  );
  assert.equal(
    await mcpEffectAllowed(m.ctx, { accountId: a.accountId }, m.now()),
    true,
  );
});
test("stale and expired previews cannot be approved; foreign records denied", async () => {
  const { m, a, c, call } = await fixture();
  const p = await call("bznsflow_messaging_pause", { requestId: randomUUID() });
  await m.db.patch(a.rowId, { profileVersion: 2 });
  await assert.rejects(
    () =>
      manage(
        m.ctx,
        {
          operation: "approve",
          tokenHash: "1".repeat(64),
          connectionId: c.id,
          runId: p.runId,
        },
        m.now(),
      ),
    /approval_stale/,
  );
  const other = await seedTenant(m, { name: "b" });
  const foreign = await m.db.insert("blueContacts", {
    accountId: other.accountId,
  });
  await assert.rejects(
    () =>
      call("bznsflow_dashboard_contact_delete", {
        requestId: randomUUID(),
        contactId: foreign,
        confirm: true,
      }),
    /foreign_record/,
  );
  const p2 = await call("bznsflow_messaging_pause", {
    requestId: randomUUID(),
  });
  m.advance(16 * 60000);
  await assert.rejects(
    () =>
      manage(
        m.ctx,
        {
          operation: "approve",
          tokenHash: "1".repeat(64),
          connectionId: c.id,
          runId: p2.runId,
        },
        m.now(),
      ),
    /approval_expired/,
  );
});
test("permission changes need fresh account verification and invalidate pending approval", async () => {
  const { m, c, call } = await fixture();
  const args = { requestId: randomUUID() },
    pending = await call("bznsflow_messaging_pause", args);
  await manage(
    m.ctx,
    {
      operation: "policy",
      tokenHash: "1".repeat(64),
      connectionId: c.id,
      direct: ["publish"],
      scopes: ["workspace:read", "workspace:write"],
    },
    m.now(),
  );
  await assert.rejects(
    () =>
      manage(
        m.ctx,
        {
          operation: "approve",
          tokenHash: "1".repeat(64),
          connectionId: c.id,
          runId: pending.runId,
        },
        m.now(),
      ),
    /approval_stale/,
  );
  m.advance(6 * 60000);
  await assert.rejects(
    () =>
      manage(
        m.ctx,
        {
          operation: "policy",
          tokenHash: "1".repeat(64),
          connectionId: c.id,
          direct: [],
          scopes: ["workspace:read"],
        },
        m.now(),
      ),
    /fresh_sign_in_required/,
  );
});
test("plan downgrade filters discovery and forbids previously available tools", async () => {
  const { m, c } = await fixture();
  const p = await connectionOwner(m.ctx, c.id, m.now());
  assert.ok(
    toolsFor({ ...p, scopes: p.connection.scopes }).some(
      (t) => t.name === "bznsflow_hasib_real_estate_overview",
    ),
  );
  await m.db.patch(m.table("blueAccessGrants")[0]._id, { plan: "catalyst" });
  const downgraded = await connectionOwner(m.ctx, c.id, m.now());
  assert.ok(
    !toolsFor({ ...downgraded, scopes: downgraded.connection.scopes }).some(
      (t) => t.domain === "hasib",
    ),
  );
  await assert.rejects(
    () =>
      prepare(
        m.ctx,
        {
          connectionId: c.id,
          tool: "bznsflow_hasib_real_estate_overview",
          args: {},
        },
        m.now(),
      ),
    /tool_not_allowed/,
  );
});
test("concurrency and call limits are durable and independent of a server instance", async () => {
  const { m, c } = await fixture();
  for (let i = 0; i < 5; i++)
    await admit(m.ctx, { connectionId: c.id, lease: randomUUID() }, m.now());
  await assert.rejects(
    () => admit(m.ctx, { connectionId: c.id, lease: randomUUID() }, m.now()),
    /concurrency_limited/,
  );
  m.advance(66000);
  await admit(m.ctx, { connectionId: c.id, lease: randomUUID() }, m.now());
  const r = m.table("mcpLimits").find((r) => r.key === `connection:${c.id}`);
  await m.db.patch(r._id, { count: 120 });
  await assert.rejects(
    () => admit(m.ctx, { connectionId: c.id, lease: randomUUID() }, m.now()),
    /rate_limited/,
  );
});
test("connection area restrictions are enforced on discovery and execution", async () => {
  const { m, c } = await fixture();
  await manage(
    m.ctx,
    {
      operation: "policy",
      tokenHash: "1".repeat(64),
      connectionId: c.id,
      areas: ["customers"],
      scopes: ["workspace:read", "workspace:write"],
      direct: [],
    },
    m.now(),
  );
  const p = await connectionOwner(m.ctx, c.id, m.now());
  assert.ok(
    !toolsFor({ ...p, scopes: p.connection.scopes }).some(
      (t) => t.domain === "business",
    ),
  );
  await assert.rejects(
    () =>
      prepare(
        m.ctx,
        { connectionId: c.id, tool: "bznsflow_business_state", args: {} },
        m.now(),
      ),
    /tool_not_allowed/,
  );
});
test("knowledge draft identity is independent of MCP mutation idempotency", async () => {
  const { m, c, call } = await fixture("catalyst");
  const draft = {
    requestId: "draft-1",
    idempotencyKey: randomUUID(),
    sourceKey: "source-1",
    title: "Garden access",
    kind: "guided",
    text: "Dogs are welcome in the garden.",
    references: [],
    partial: false,
  };
  const saved = await call("bznsflow_knowledge_save", draft);
  assert.equal(saved.status, "completed");
  const args = {
    requestId: "draft-1",
    idempotencyKey: randomUUID(),
    version: 1,
    confirmed: true,
  };
  const p = await call("bznsflow_knowledge_publish", args);
  assert.equal(p.status, "approval_required");
  await manage(
    m.ctx,
    {
      operation: "approve",
      tokenHash: "1".repeat(64),
      connectionId: c.id,
      runId: p.runId,
    },
    m.now(),
  );
  assert.equal(
    (await call("bznsflow_knowledge_publish", args)).status,
    "completed",
  );
});
test("CSV transfer validation, approval-required import, bounded export and expiry", async () => {
  const { m, c, call } = await fixture("catalyst");
  const uploaded = await call("bznsflow_files_upload_contacts", {
    requestId: randomUUID(),
    content: "phone,name,country\n+96891234567,Synthetic,OM",
  });
  assert.equal(uploaded.status, "completed");
  const args = {
    requestId: randomUUID(),
    transferId: uploaded.result.transferId,
  };
  const p = await call("bznsflow_files_import_contacts", args);
  assert.equal(p.status, "approval_required");
  await manage(
    m.ctx,
    {
      operation: "approve",
      tokenHash: "1".repeat(64),
      connectionId: c.id,
      runId: p.runId,
    },
    m.now(),
  );
  const imported = await call("bznsflow_files_import_contacts", args);
  assert.equal(imported.status, "completed");
  assert.equal(m.table("blueContacts").length, 1);
  const exportArgs = { requestId: randomUUID() },
    e = await call("bznsflow_dashboard_export_contacts", exportArgs);
  assert.equal(e.status, "approval_required");
  assert.equal(e.preview.exportRecords, 1);
  await manage(
    m.ctx,
    {
      operation: "approve",
      tokenHash: "1".repeat(64),
      connectionId: c.id,
      runId: e.runId,
    },
    m.now(),
  );
  const exported = await call("bznsflow_dashboard_export_contacts", exportArgs);
  assert.ok(exported.result.transferId);
  const file = await call("bznsflow_files_read", {
    transferId: exported.result.transferId,
  });
  assert.equal(file.result.data.items.length, 1);
  m.advance(16 * 60000);
  await assert.rejects(
    () =>
      call("bznsflow_files_read", { transferId: exported.result.transferId }),
    /transfer_expired/,
  );
  await assert.rejects(
    () =>
      call("bznsflow_files_upload_contacts", {
        requestId: randomUUID(),
        content: "url,name\nhttps://127.0.0.1,secrets",
      }),
    /invalid_csv_headers/,
  );
});
test("manual replies retain pending delivery and revocation stops the queued provider effect", async () => {
  const { m, c, a, call, inbound, messaging } = await fixture();
  assert.equal(
    (await messaging("activate", { sessionHash: a.sessionHash })).ok,
    true,
  );
  const accepted = await inbound(a, { turn: false });
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  const person = m.table("blueConversations")[0],
    args = {
      requestId: randomUUID(),
      conversationId: person._id,
      text: "Synthetic reply",
    };
  const p = await call("bznsflow_messaging_manual_reply", args);
  await manage(
    m.ctx,
    {
      operation: "approve",
      tokenHash: "1".repeat(64),
      connectionId: c.id,
      runId: p.runId,
    },
    m.now(),
  );
  const sent = await call("bznsflow_messaging_manual_reply", args);
  assert.equal(sent.status, "pending");
  const message = m.table("blueMessages").find((x) => x.direction === "out");
  assert.equal(message.mcpConnectionId, c.id);
  assert.equal(message.mcpRunId, p.runId);
  assert.equal(message.status, "queued");
  await manage(
    m.ctx,
    { operation: "revoke", tokenHash: "1".repeat(64), connectionId: c.id },
    m.now(),
  );
  assert.equal(await mcpEffectAllowed(m.ctx, message, m.now()), false);
});
for (const packId of [
  "retail",
  "retail-tech",
  "dental",
  "real-estate",
  "construction",
  "automotive",
  "fitness",
  "media",
])
  test(`${packId}: MCP owner read, approved financial write and replay`, async () => {
    const { m, c, a, call } = await fixture();
    await m.db.insert("hasibSettings", { accountId: a.accountId, packId });
    const read = await call("bznsflow_hasib_overview");
    assert.equal(read.result.pack.id, packId);
    const args = {
      requestId: randomUUID(),
      category: "rent",
      amountMinor: 30000,
      method: "bank_transfer",
      paidOn: new Date(m.now()).toISOString().slice(0, 10),
    };
    const prepared = await call("bznsflow_hasib_expense_create", args);
    assert.equal(prepared.status, "approval_required");
    await manage(
      m.ctx,
      {
        operation: "approve",
        tokenHash: "1".repeat(64),
        connectionId: c.id,
        runId: prepared.runId,
      },
      m.now(),
    );
    const done = await call("bznsflow_hasib_expense_create", args);
    assert.equal(done.status, "completed");
    const replay = await call("bznsflow_hasib_expense_create", args);
    assert.equal(replay.replay, true);
    assert.equal(m.table("hasibExpenses").length, 1);
  });

test("approved catalog publication is fenced against draft changes", async () => {
  const { m, a, c, call } = await fixture();
  const draftId = await m.db.insert("blueCatalogEntries", {
    ownerKey: String(a.accountId),
    entryKey: "item-a",
    status: "draft",
    nameEn: "Original",
    sortOrder: 0,
  });
  const args = { requestId: randomUUID() },
    p = await call("bznsflow_catalog_publish", args);
  await m.db.patch(draftId, { nameEn: "Changed" });
  await assert.rejects(
    () =>
      manage(
        m.ctx,
        {
          operation: "approve",
          tokenHash: "1".repeat(64),
          connectionId: c.id,
          runId: p.runId,
        },
        m.now(),
      ),
    /approval_stale/,
  );
});
test("active employee membership can be revoked by its owner, never another workspace", async () => {
  const { m, a, c, call } = await fixture();
  await call("bznsflow_hasib_overview");
  const workspace = m.table("ascendWorkspaces")[0];
  const employee = await m.db.insert("accounts", {
    email: "employee@example.com",
    role: "customer",
    createdAt: m.now(),
  });
  const memberId = await m.db.insert("ascendWorkspaceMembers", {
    workspaceId: workspace._id,
    accountId: employee,
    email: "employee@example.com",
    status: "active",
    invitedAt: m.now(),
    updatedAt: m.now(),
  });
  const args = { requestId: randomUUID(), memberId },
    p = await call("bznsflow_hasib_team_revoke", args);
  assert.equal(p.status, "approval_required");
  await manage(
    m.ctx,
    {
      operation: "approve",
      tokenHash: "1".repeat(64),
      connectionId: c.id,
      runId: p.runId,
    },
    m.now(),
  );
  assert.equal(
    (await call("bznsflow_hasib_team_revoke", args)).status,
    "completed",
  );
  assert.equal((await m.db.get(memberId)).status, "revoked");
});
