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
const seeded =
  previous?.seeded ||
  cli(process.env.MCP_ACCEPTANCE_REBIND === "true" ? "rebind" : "seed", hashes);
for (const actor of Object.values(seeded))
  cli("refresh_session", { sessionId: actor.sessionId });
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
const existing = await store("manage", {
  operation: "list",
  tokenHash: hashes.ownerHash,
});
for (const c of existing.connections)
  if (!c.revokedAt)
    await store("manage", {
      operation: "revoke",
      tokenHash: hashes.ownerHash,
      connectionId: c.id,
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
  content: "phone,name,country\n+96891234568,أحمد Ahmed,OM",
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
const approvals = await Promise.allSettled(
  Array.from({ length: 4 }, () => approve(pending.runId)),
);
equal(approvals.filter((x) => x.status === "fulfilled").length, 1);
equal(
  approvals.filter(
    (x) => x.status === "rejected" && /approval_expired/.test(x.reason.message),
  ).length,
  3,
);
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
equal(exported.preview.exportRecords >= 2, true);
await approve(exported.runId);
const file = await call("bznsflow_dashboard_export_contacts", exportArgs);
equal(
  (await call("bznsflow_files_read", { transferId: file.result.transferId }))
    .result.data.items.length,
  exported.preview.exportRecords,
);
const exportedData = await call("bznsflow_files_read", {
  transferId: file.result.transferId,
});
equal(
  exportedData.result.data.items.filter((x) => x.name === "أحمد Ahmed").length,
  1,
);
const racedArgs = { requestId: randomUUID() };
const raced = await call("bznsflow_dashboard_export_contacts", racedArgs);
const race = await Promise.allSettled([
  approve(raced.runId),
  call("bznsflow_dashboard_export_contacts", racedArgs),
]);
equal(race[0].status, "fulfilled");
const finishedRace = await call(
  "bznsflow_dashboard_export_contacts",
  racedArgs,
);
equal(finishedRace.status, "completed");
equal(finishedRace.runId, raced.runId);
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
const connectionKey = "connection:" + c.id,
  workspaceKey = "workspace:" + seeded.owner.accountId;
cli("limits", { counts: { [connectionKey]: 119, [workspaceKey]: 0 } });
const lastLease = randomUUID();
await store("admit", { connectionId: c.id, lease: lastLease });
await store("release", { connectionId: c.id, lease: lastLease });
await rejects(
  store("admit", { connectionId: c.id, lease: randomUUID() }),
  /rate_limited/,
);
cli("limits", { counts: { [connectionKey]: 0, [workspaceKey]: 299 } });
const workspaceLease = randomUUID();
await store("admit", { connectionId: c.id, lease: workspaceLease });
await store("release", { connectionId: c.id, lease: workspaceLease });
await rejects(
  store("admit", { connectionId: c.id, lease: randomUUID() }),
  /rate_limited/,
);
cli("limits", { counts: { [connectionKey]: 0, [workspaceKey]: 0 } });
const durations = [];
for (let batch = 0; batch < 12; batch++)
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      const started = performance.now(),
        lease = randomUUID();
      await store("admit", { connectionId: c.id, lease });
      try {
        equal((await call("bznsflow_business_state")).status, "completed");
      } finally {
        await store("release", { connectionId: c.id, lease });
      }
      durations.push(Math.round(performance.now() - started));
    }),
  );
durations.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    syntheticLoadCalls: durations.length,
    concurrency: 5,
    p50Ms: durations[29],
    p95Ms: durations[56],
    maxMs: durations.at(-1),
  }),
);
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
const effectId = cli("queued_effect", {
  connectionId: c.id,
  runId: imported[0].runId,
});
await store("manage", {
  operation: "revoke",
  tokenHash: hashes.ownerHash,
  connectionId: c.id,
});
await rejects(call("bznsflow_business_state"), /connection_revoked/);
equal(await store("effect_claim", { effectId }), null);
equal(cli("effect_status", { effectId }), { status: "cancelled", attempts: 0 });
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
