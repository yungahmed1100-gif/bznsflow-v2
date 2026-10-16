// Real HTTPS/OAuth/SDK checks using only the isolated candidate's synthetic account.
// Existing sign-in sessions are seeded: this does not certify OTP or social sign-in.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const env = JSON.parse(readFileSync(process.env.MCP_ACCEPTANCE_CONFIG, "utf8"));
const sessions = JSON.parse(
  readFileSync(process.env.MCP_ACCEPTANCE_SESSION_FILE, "utf8"),
);
const origin = env.PUBLIC_SITE_ORIGIN,
  resource = `${origin}/api/mcp`;
assert.equal(origin, "https://bznsflow-mcp-acceptance.vercel.app");
const jar = new Map([["bf_session", sessions.cookies.owner]]);
let checks = 0;
const equal = (a, b, message) => {
  assert.deepEqual(a, b, message);
  checks++;
};
async function request(path, options = {}) {
  const r = await fetch(new URL(path, origin), {
    redirect: "manual",
    signal: AbortSignal.timeout(55000),
    ...options,
    headers: {
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
      ...options.headers,
    },
  });
  for (const c of r.headers.getSetCookie()) {
    const pair = c.split(";")[0],
      eq = pair.indexOf("=");
    jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return r;
}
const post = async (path, body) =>
  request(path, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "x-csrf-token": jar.get("bf_csrf"),
    },
    body: JSON.stringify(body),
  });
const auth = await request("/api/auth-session");
equal(auth.status, 200);
equal((await auth.json()).account.email, "mcp-synthetic@example.com");
const protectedResource = await request(
  "/.well-known/oauth-protected-resource/api/mcp",
);
equal(protectedResource.status, 200);
equal((await protectedResource.json()).resource, resource);
const discovery = await request(
  "/.well-known/oauth-authorization-server/oauth",
);
equal(discovery.status, 200);
const metadata = await discovery.json();
equal(metadata.issuer, `${origin}/oauth`);
// Clients probe different discovery forms; every one names the same issuer.
for (const path of [
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration/oauth",
  "/oauth/.well-known/openid-configuration",
]) {
  const alt = await request(path);
  equal(alt.status, 200, path);
  equal((await alt.json()).issuer, `${origin}/oauth`, path);
}
const reg = await post(metadata.registration_endpoint, {
  client_name: "Synthetic HTTPS acceptance",
  redirect_uris: ["http://127.0.0.1:3456/callback"],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "none",
});
assert.equal(reg.status, 201, await reg.clone().text());
checks++;
const client = await reg.json(),
  verifier = "v".repeat(64),
  challenge = createHash("sha256").update(verifier).digest("base64url");
let r = await request(
  `${metadata.authorization_endpoint}?${new URLSearchParams({ client_id: client.client_id, redirect_uri: client.redirect_uris[0], response_type: "code", scope: "workspace:read workspace:write", resource, code_challenge: challenge, code_challenge_method: "S256", state: "synthetic-https", prompt: "consent" })}`,
);
equal(r.status, 303);
for (
  let i = 0;
  i < 4 && new URL(r.headers.get("location")).pathname === "/mcp";
  i++
) {
  const view = await request("/api/mcp/manage?interaction=true");
  equal(view.status, 200);
  const details = await view.json();
  const consent = await post("/api/mcp/manage", {
    action: "consent",
    allow: true,
    interactionUid: details.interaction.uid,
  });
  assert.equal(consent.status, 200, await consent.clone().text());
  checks++;
  r = await request((await consent.json()).redirect);
  equal(r.status, 303);
}
const callback = new URL(r.headers.get("location"));
equal(callback.origin, "http://127.0.0.1:3456");
equal(callback.searchParams.get("state"), "synthetic-https");
assert.ok(callback.searchParams.get("code"));
checks++;
const token = (body) =>
  request(metadata.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: client.client_id, ...body }),
  });
const issued = await token({
  grant_type: "authorization_code",
  code: callback.searchParams.get("code"),
  redirect_uri: client.redirect_uris[0],
  code_verifier: verifier,
  resource,
});
assert.equal(issued.status, 200, await issued.clone().text());
checks++;
const tokens = await issued.json();
equal(tokens.expires_in, 900);
assert.ok(tokens.refresh_token);
checks++;
const sdk = new Client({ name: "candidate-acceptance", version: "1.0.0" });
await sdk.connect(
  new StreamableHTTPClientTransport(new URL(resource), {
    requestInit: {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    },
  }),
);
checks++;
const names = [];
let cursor;
do {
  const page = await sdk.listTools(cursor ? { cursor } : {});
  names.push(...page.tools.map((t) => t.name));
  cursor = page.nextCursor;
} while (cursor);
assert.ok(names.includes("bznsflow_business_state"));
checks++;
const call = async (name, args = {}) => {
  const result = await sdk.callTool({ name, arguments: args });
  assert.ok(!result.isError, JSON.stringify(result));
  return result.structuredContent;
};
equal((await call("bznsflow_business_state")).status, "completed");
equal(
  (
    await call("bznsflow_dashboard_set_timezone", {
      requestId: randomUUID(),
      timezone: "Asia/Muscat",
    })
  ).status,
  "completed",
);
const args = { requestId: randomUUID() },
  preview = await call("bznsflow_dashboard_export_contacts", args);
equal(preview.status, "approval_required");
const management = await request("/api/mcp/manage");
equal(management.status, 200);
const managed = await management.json();
const connection = managed.connections.find(
  (c) => c.clientId === client.client_id,
);
assert.ok(connection?.verifiedAt);
checks++;
const approval = await post("/api/mcp/manage", {
  action: "approve",
  connectionId: connection.id,
  runId: preview.runId,
});
equal(approval.status, 200);
equal(
  (await call("bznsflow_dashboard_export_contacts", args)).status,
  "completed",
);
await sdk.close();
// Codex's actual refresh shape: its default scope set includes `openid`.
const refresh = await token({
  grant_type: "refresh_token",
  refresh_token: tokens.refresh_token,
  resource,
  scope: "openid workspace:read workspace:write",
});
assert.equal(refresh.status, 200, await refresh.clone().text());
checks++;
const rotated = await refresh.json();
assert.notEqual(rotated.refresh_token, tokens.refresh_token);
checks++;
equal(rotated.scope, "workspace:read workspace:write");
checks++;
const rpc = (access) =>
  request("/api/mcp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    }),
  });
equal((await rpc(rotated.access_token)).status, 200);
equal(
  (
    await token({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      resource,
    })
  ).status,
  400,
);
equal((await rpc(rotated.access_token)).status, 401);
equal(
  (
    await post("/api/mcp/manage", {
      action: "revoke",
      connectionId: connection.id,
    })
  ).status,
  200,
);
console.log(
  `${checks} HTTPS candidate checks passed: deployed rewrites, signed account session, OAuth PKCE, SDK discovery/read/write/approval, refresh rotation/replay and revocation. ${names.length} permitted tools.`,
);
