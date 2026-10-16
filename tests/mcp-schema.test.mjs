import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mcpTables } from "../convex/mcp/schema.ts";
import { blueHarness, seedTenant } from "./helpers/blue-tenant.mjs";
import { manage, prepare } from "../convex/mcp/state.js";
import { executeApplication } from "../convex/mcp/application.js";
function matches(value, v) {
  if (v.type === "any") return value !== undefined;
  if (v.type === "union") return v.value.some((s) => matches(value, s));
  if (v.type === "literal") return value === v.value;
  if (v.type === "id")
    return typeof value === "string" && value.startsWith(`${v.tableName}_`);
  if (v.type === "array")
    return Array.isArray(value) && value.every((x) => matches(x, v.value));
  if (v.type === "object")
    return (
      !!value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).every((k) => v.value[k]) &&
      Object.entries(v.value).every(([k, f]) =>
        value[k] === undefined ? f.optional : matches(value[k], f.fieldType),
      )
    );
  return typeof value === v.type;
}
test("actual MCP table validators accept the connection, proposal, transfer and receipt records", async () => {
  process.env.MCP_ENABLED = "true";
  process.env.CONVEX_SERVICE_SECRET = "9".repeat(64);
  const { m } = blueHarness({ start: Date.now() }),
    a = await seedTenant(m);
  await m.db.insert("sessions", {
    accountId: a.accountId,
    tokenHash: "1".repeat(64),
    createdAt: m.now(),
    expiresAt: m.now() + 60000,
  });
  const c = await manage(
    m.ctx,
    {
      operation: "connect",
      tokenHash: "1".repeat(64),
      clientId: "synthetic",
      clientName: "Synthetic",
      scopes: ["workspace:read", "workspace:write"],
    },
    m.now(),
  );
  const tool = "bznsflow_files_upload_contacts",
    args = {
      requestId: randomUUID(),
      content: "phone,name,country\n+96891234567,Synthetic,OM",
    };
  const p = await prepare(m.ctx, { connectionId: c.id, tool, args }, m.now());
  await executeApplication(
    m.ctx,
    { connectionId: c.id, runId: p.runId, tool, args },
    {},
    m.now(),
  );
  for (const row of m.rows.values())
    if (mcpTables[row.table]) {
      const { _id, _seq, table, ...data } = row;
      assert.ok(
        matches(
          JSON.parse(JSON.stringify(data)),
          mcpTables[table].validator.json,
        ),
        `${table} does not match its deployed validator`,
      );
    }
});
