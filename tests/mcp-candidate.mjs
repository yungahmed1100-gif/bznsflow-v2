// Explicit opt-in integration check against an isolated synthetic Convex deployment.
// Requires the candidate-only helper copied/deployed as convex/mcpAcceptance.ts.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mcpStore } from "../api/_lib/mcp/store.js";
const env = JSON.parse(readFileSync(process.env.MCP_ACCEPTANCE_CONFIG, "utf8"));
const deployment = process.env.MCP_ACCEPTANCE_DEPLOYMENT;
assert.equal(env.MCP_PILOT_EMAIL, "mcp-synthetic@example.com");
assert.equal(
  env.PUBLIC_SITE_ORIGIN,
  "https://bznsflow-mcp-acceptance.vercel.app",
);
assert.equal(
  env.CONVEX_CLOUD_URL,
  `https://${deployment}.eu-west-1.convex.cloud`,
);
assert.ok(
  deployment &&
    !["rare-fish-465", "quaint-nightingale-675"].includes(deployment),
);
const store = mcpStore({ env });
const cli = (operation, input) => {
  const r = spawnSync(
    "npx",
    [
      "convex",
      "run",
      "--deployment",
      deployment,
      "mcpAcceptance:fixture",
      JSON.stringify({ operation, input }),
    ],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};
const hash = (v) => createHash("sha256").update(v).digest("hex");
const previous =
  process.env.MCP_ACCEPTANCE_RESUME === "true"
    ? JSON.parse(readFileSync(process.env.MCP_ACCEPTANCE_SESSION_FILE, "utf8"))
    : null;
const cookies =
  previous?.cookies ||
  Object.fromEntries(
    ["owner", "foreign", "employee"].map((k) => [
      k,
      randomBytes(32).toString("hex"),
    ]),
  );
const hashes = Object.fromEntries(
  Object.entries(cookies).map(([k, v]) => [`${k}Hash`, hash(v)]),
);
const seeded = previous?.seeded || cli("seed", hashes);
cli("refresh_session", { sessionId: seeded.owner.sessionId });
if (process.env.MCP_ACCEPTANCE_SESSION_FILE)
  writeFileSync(
    process.env.MCP_ACCEPTANCE_SESSION_FILE,
    JSON.stringify({ cookies, hashes, seeded }),
    { mode: 0o600 },
  );
let checks = 0;
const equal = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const rejects = async (p, pattern) => {
  await assert.rejects(p, pattern);
  checks++;
};
const connect = () =>
  store("manage", {
    operation: "connect",
    tokenHash: hashes.ownerHash,
    clientId: "candidate-test",
    clientName: "Synthetic acceptance",
    scopes: ["workspace:read", "workspace:write"],
  });
const c = await connect();
const call = async (tool, args = {}) => {
  const p = await store("prepare", { connectionId: c.id, tool, args });
  if (p.status === "approval_required") return p;
  return store("run", { connectionId: c.id, tool, args, runId: p.runId });
};
const approve = (runId) =>
  store("manage", {
    operation: "approve",
    connectionId: c.id,
    runId,
    tokenHash: hashes.ownerHash,
  });
equal((await call("bznsflow_business_state")).status, "completed");
await rejects(
  store("manage", {
    operation: "connect",
    tokenHash: hashes.employeeHash,
    clientId: "bad",
    clientName: "bad",
    scopes: ["workspace:read"],
  }),
  /manager_required/,
);
await rejects(
  store("manage", {
    operation: "revoke",
    tokenHash: hashes.foreignHash,
    connectionId: c.id,
  }),
  /connection_not_found/,
);
const requestId = randomUUID();
const duplicates = await Promise.all(
  Array.from({ length: 5 }, () =>
    call("bznsflow_dashboard_set_timezone", {
      requestId,
      timezone: "Asia/Muscat",
    }),
  ),
);
equal(
  duplicates.every((x) => x.status === "completed"),
  true,
);
equal(new Set(duplicates.map((x) => x.runId)).size, 1);
await rejects(
  call("bznsflow_dashboard_set_timezone", {
    requestId,
    timezone: "Europe/Dublin",
  }),
  /idempotency_conflict/,
);
const args = {
  requestId: randomUUID(),
  content: "phone,name,country\n+96891234567,Synthetic,OM",
};
const upload = await call("bznsflow_files_upload_contacts", args);
equal(upload.status, "completed");
const importedArgs = {
  requestId: randomUUID(),
  transferId: upload.result.transferId,
};
const pending = await call("bznsflow_files_import_contacts", importedArgs);
equal(pending.status, "approval_required");
await rejects(
  store("run", {
    connectionId: c.id,
    runId: pending.runId,
    tool: "bznsflow_files_import_contacts",
  }),
  /approval_required/,
);
await approve(pending.runId);
const imported = await Promise.all(
  Array.from({ length: 4 }, () =>
    call("bznsflow_files_import_contacts", importedArgs),
  ),
);
equal(
  imported.every((x) => x.status === "completed"),
  true,
);
const exportArgs = { requestId: randomUUID() };
const exported = await call("bznsflow_dashboard_export_contacts", exportArgs);
equal(exported.preview.exportRecords, 1);
await approve(exported.runId);
const file = await call("bznsflow_dashboard_export_contacts", exportArgs);
equal(
  (await call("bznsflow_files_read", { transferId: file.result.transferId }))
    .result.data.items.length,
  1,
);
const stale = await call("bznsflow_dashboard_export_contacts", {
  requestId: randomUUID(),
});
cli("touch_profile", { rowId: seeded.owner.rowId });
await rejects(approve(stale.runId), /approval_stale/);
const expired = await call("bznsflow_dashboard_export_contacts", {
  requestId: randomUUID(),
});
cli("expire_run", { runId: expired.runId });
await rejects(approve(expired.runId), /approval_expired/);
const leaseIds = Array.from({ length: 9 }, () => randomUUID());
const leases = await Promise.allSettled(
  leaseIds.map((lease) => store("admit", { connectionId: c.id, lease })),
);
equal(leases.filter((x) => x.status === "fulfilled").length, 5);
equal(leases.filter((x) => x.status === "rejected").length, 4);
for (const [i, x] of leases.entries())
  if (x.status === "fulfilled")
    await store("release", { connectionId: c.id, lease: leaseIds[i] });
cli("set_plan", { grantId: seeded.owner.grantId, plan: "catalyst" });
await rejects(call("bznsflow_hasib_expenses", {}), /tool_not_allowed/);
cli("set_plan", {
  grantId: seeded.owner.grantId,
  plan: "ascend",
  status: "revoked",
});
await rejects(call("bznsflow_business_state"), /access_required/);
cli("set_plan", { grantId: seeded.owner.grantId, plan: "ascend" });
cli("disable_hasib", { disabled: true });
await rejects(call("bznsflow_hasib_overview"), /tool_not_allowed/);
cli("disable_hasib", { disabled: false });
await store("manage", {
  operation: "revoke",
  tokenHash: hashes.ownerHash,
  connectionId: c.id,
});
await rejects(call("bznsflow_business_state"), /connection_revoked/);
cli("refresh_session", { sessionId: seeded.owner.sessionId });
const expiring = await connect();
cli("expire_connection", { connectionId: expiring.id });
await rejects(
  store("prepare", {
    connectionId: expiring.id,
    tool: "bznsflow_business_state",
    args: {},
  }),
  /connection_revoked/,
);
console.log(
  `${checks} isolated Convex checks passed: real HTTP, schema, ownership, approvals, concurrent replay, export/import, plan/integration changes and durable concurrency.`,
);
