import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { generateKeyPair, exportJWK } from "jose";
import {
  createOAuth,
  narrowRefreshScope,
  oauthAdapter,
} from "../api/_lib/mcp/oauth.js";
import { createMcpHandler } from "../api/_lib/mcp/handler.js";
import { McpError } from "../api/_lib/mcp/store.js";
function durableStore() {
  const rows = new Map(),
    connections = new Map();
  let seq = 0;
  return {
    rows,
    connections,
    call: async (op, a) => {
      if (op === "metric" || op === "rate" || op === "release") return null;
      if (op === "oauth") {
        const key = `${a.model}:${a.key}`,
          r = rows.get(key);
        if (a.action === "upsert") {
          rows.set(key, { ...structuredClone(a), consumedAt: r?.consumedAt });
          return;
        }
        if (a.action === "find")
          return r && r.expiresAt > Date.now() ? structuredClone(r) : null;
        if (a.action === "find_uid")
          return (
            [...rows.values()].find(
              (x) =>
                x.model === a.model &&
                x.uid === a.uid &&
                x.expiresAt > Date.now(),
            ) || null
          );
        if (a.action === "destroy") {
          rows.delete(key);
          return;
        }
        if (a.action === "consume") {
          if (!r || r.consumedAt) throw new McpError("oauth_replay");
          r.consumedAt = Date.now();
          return;
        }
        if (a.action === "revoke_grant") {
          for (const [k, v] of rows)
            if (v.grantId === a.grantId) rows.delete(k);
          return;
        }
      }
      if (op === "browser_identity")
        return { accountId: "owner-a", email: "synthetic@example.com" };
      if (op === "manage" && a.operation === "connect") {
        const c = {
          id: `connection-${++seq}`,
          accountId: "owner-a",
          clientId: a.clientId,
        };
        connections.set(c.id, c);
        return c;
      }
      if (op === "bind_grant") {
        Object.assign(connections.get(a.connectionId), { grantId: a.grantId });
        return;
      }
      if (op === "grant_context") {
        const c = [...connections.values()].find(
          (c) =>
            c.grantId === a.grantId &&
            c.accountId === a.accountId &&
            c.clientId === a.clientId &&
            !c.revoked,
        );
        if (!c) throw new McpError("invalid_token", 401);
        return { connectionId: c.id };
      }
      if (op === "admit") return { tools: ["bznsflow_business_state"] };
      throw new Error(`unexpected ${op} ${JSON.stringify(a)}`);
    },
  };
}
test("native OAuth redirects allow only the loopback port to vary", () => {
  const provider = createOAuth({
    env: {
      NODE_ENV: "test",
      PUBLIC_SITE_ORIGIN: "http://127.0.0.1:1234",
      MCP_COOKIE_KEYS: "k".repeat(48),
      MCP_OAUTH_ENCRYPTION_KEY: "a".repeat(64),
    },
    store: durableStore().call,
  });
  const client = new provider.Client({
    client_id: "native-test",
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    redirect_uris: [
      "http://localhost/callback",
      "http://127.0.0.1/callback",
      "https://example.com/callback",
    ],
  });
  assert.ok(client.redirectUriAllowed("http://localhost:51872/callback"));
  assert.ok(client.redirectUriAllowed("http://127.0.0.1:3333/callback"));
  assert.ok(client.redirectUriAllowed("https://example.com/callback"));
  for (const uri of [
    "http://localhost.evil.example/callback",
    "http://localhost:51872/other",
    "http://localhost:51872/callback?next=evil",
    "https://example.com:8443/callback",
    "https://example.com/other",
  ])
    assert.equal(client.redirectUriAllowed(uri), false, uri);
});
test("OAuth adapter encrypts and authenticates payloads, hashes identifiers and atomically consumes codes", async () => {
  const store = durableStore(),
    Adapter = oauthAdapter(store.call, "a".repeat(64)),
    a = new Adapter("AuthorizationCode");
  await a.upsert(
    "raw-code",
    { accountId: "owner-a", secret: "sensitive", uid: "interaction-id" },
    300,
  );
  const r = [...store.rows.values()][0];
  assert.ok(!JSON.stringify(r).includes("sensitive"));
  assert.ok(!JSON.stringify(r).includes("raw-code"));
  assert.equal((await a.find("raw-code")).accountId, "owner-a");
  assert.equal((await a.findByUid("interaction-id")).secret, "sensitive");
  await a.consume("raw-code");
  await assert.rejects(() => a.consume("raw-code"), /oauth_replay/);
  r.payload = r.payload.slice(0, -8) + "aaaaaaaa";
  await assert.rejects(() => a.find("raw-code"));
});
test("refresh scope narrowing works on pre-parsed (Vercel) bodies and never adds scopes", async () => {
  const provider = {
    RefreshToken: {
      find: async (v) =>
        v === "rt" ? { scopes: new Set(["workspace:read"]) } : undefined,
    },
  };
  const run = async (body) => {
    const ctx = { req: { readable: false, body } };
    await narrowRefreshScope(provider, ctx);
    return ctx.req.body;
  };
  const refresh = { grant_type: "refresh_token", refresh_token: "rt" };
  assert.equal(
    (await run({ ...refresh, scope: "openid workspace:read workspace:write" }))
      .scope,
    "workspace:read",
  );
  assert.equal(
    (
      await run(
        "grant_type=refresh_token&refresh_token=rt&scope=openid%20workspace%3Aread",
      )
    ).scope,
    "workspace:read",
  );
  assert.equal((await run({ ...refresh, scope: "openid" })).scope, "openid");
  assert.equal(
    (await run({ ...refresh, refresh_token: "unknown", scope: "openid" }))
      .scope,
    "openid",
  );
  assert.equal((await run({ ...refresh })).scope, undefined);
});
for (const requestedScope of [
  "openid offline_access workspace:read workspace:write",
  "workspace:read workspace:write",
  "workspace:read",
])
  test(`HTTP OAuth PKCE, multi-instance, SDK, refresh and revoke: ${requestedScope}`, async (t) => {
    const durable = durableStore(),
      { privateKey } = await generateKeyPair("RS256", { extractable: true }),
      jwk = await exportJWK(privateKey);
    Object.assign(jwk, { kid: "synthetic", use: "sig", alg: "RS256" });
    const server = createServer();
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    t.after(() => new Promise((r) => server.close(r)));
    const origin = `http://127.0.0.1:${server.address().port}`,
      resource = `${origin}/api/mcp`;
    const env = {
      NODE_ENV: "test",
      PUBLIC_SITE_ORIGIN: origin,
      MCP_ENABLED: "true",
      MCP_COOKIE_KEYS: "k".repeat(48),
      MCP_OAUTH_ENCRYPTION_KEY: "a".repeat(64),
      MCP_OAUTH_JWKS: JSON.stringify({ keys: [jwk] }),
    };
    const providers = [
      createOAuth({ env, store: durable.call }),
      createOAuth({ env, store: durable.call }),
    ];
    const handlers = providers.map((provider) =>
      createMcpHandler({
        env,
        store: durable.call,
        provider,
        execute: async () => ({
          status: "completed",
          result: { businessName: "Synthetic" },
        }),
      }),
    );
    let i = 0;
    server.on("request", (req, res) => handlers[i++ % 2](req, res));
    const jar = new Map();
    async function request(path, options = {}) {
      const r = await fetch(new URL(path, origin), {
        redirect: "manual",
        ...options,
        headers: {
          Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
          ...options.headers,
        },
      });
      for (const cookie of r.headers.getSetCookie()) {
        const pair = cookie.split(";")[0],
          eq = pair.indexOf("=");
        jar.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
      return r;
    }
    const discovery = await request("/.well-known/oauth-authorization-server");
    assert.equal(discovery.status, 200);
    const metadata = await discovery.json();
    assert.equal(metadata.issuer, `${origin}/oauth`);
    assert.ok(metadata.code_challenge_methods_supported.includes("S256"));
    const pm = await (
      await request("/.well-known/oauth-protected-resource/api/mcp")
    ).json();
    assert.equal(pm.resource, resource);
    const badRegistration = await request("/oauth/reg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirect_uris: ["http://evil.example/callback"] }),
    });
    assert.equal(badRegistration.status, 400);
    const privateMetadata = await request(
      "/oauth/auth?" +
        new URLSearchParams({
          client_id: "https://127.0.0.1/metadata.json",
          response_type: "code",
          redirect_uri: "http://127.0.0.1/callback",
          scope: "workspace:read",
          resource,
        }),
    );
    assert.equal(privateMetadata.status, 400);
    const reg = await request("/oauth/reg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "Synthetic Codex",
        redirect_uris: ["http://127.0.0.1:3456/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    });
    assert.equal(reg.status, 201, await reg.clone().text());
    const client = await reg.json();
    const verifier = "v".repeat(64),
      challenge = createHash("sha256").update(verifier).digest("base64url");
    const params = new URLSearchParams({
      client_id: client.client_id,
      redirect_uri: client.redirect_uris[0],
      response_type: "code",
      scope: requestedScope,
      resource,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: "synthetic-state",
      prompt: "consent",
    });
    let r = await request(`/oauth/auth?${params}`);
    assert.equal(r.status, 303, await r.clone().text());
    assert.match(r.headers.get("location"), /\/mcp\?interaction=/);
    for (
      let step = 0;
      step < 4 && new URL(r.headers.get("location")).pathname === "/mcp";
      step++
    ) {
      const view = await request("/api/mcp/manage?interaction=true");
      assert.equal(view.status, 200, await view.clone().text());
      const details = await view.json();
      jar.set("bf_csrf", "c".repeat(64));
      jar.set("bf_session", "s".repeat(64));
      const tampered = await request("/api/mcp/manage", {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          "x-csrf-token": "c".repeat(64),
        },
        body: JSON.stringify({
          action: "consent",
          allow: true,
          interactionUid: "another-tab",
        }),
      });
      assert.equal(tampered.status, 409);
      const consent = await request("/api/mcp/manage", {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          "x-csrf-token": "c".repeat(64),
        },
        body: JSON.stringify({
          action: "consent",
          allow: true,
          interactionUid: details.interaction.uid,
        }),
      });
      assert.equal(consent.status, 200, await consent.clone().text());
      const { redirect } = await consent.json();
      assert.ok(redirect);
      r = await request(redirect);
      assert.equal(r.status, 303, await r.clone().text());
    }
    const callback = new URL(r.headers.get("location"));
    assert.equal(callback.origin, "http://127.0.0.1:3456");
    assert.equal(callback.searchParams.get("state"), "synthetic-state");
    assert.ok(callback.searchParams.get("code"), callback.href);
    const tokenReq = async (body) =>
      request("/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: client.client_id, ...body }),
      });
    const grant = {
      grant_type: "authorization_code",
      code: callback.searchParams.get("code"),
      redirect_uri: client.redirect_uris[0],
      resource,
    };
    const wrong = await tokenReq({ ...grant, code_verifier: "x".repeat(64) });
    assert.equal(wrong.status, 400);
    const response = await tokenReq({ ...grant, code_verifier: verifier });
    assert.equal(response.status, 200, await response.clone().text());
    const tokens = await response.json();
    assert.equal(tokens.expires_in, 900);
    assert.ok(tokens.refresh_token);
    const rpc = async (token) =>
      request("/api/mcp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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
    const listed = await rpc(tokens.access_token);
    assert.equal(listed.status, 200, await listed.clone().text());
    assert.equal(
      (await listed.json()).result.tools[0].name,
      "bznsflow_business_state",
    );
    const sdkClient = new Client({
      name: "synthetic-client",
      version: "1.0.0",
    });
    const transport = new StreamableHTTPClientTransport(new URL(resource), {
      requestInit: {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    });
    await sdkClient.connect(transport);
    assert.equal(
      (await sdkClient.listTools()).tools[0].name,
      "bznsflow_business_state",
    );
    const answer = await sdkClient.callTool({
      name: "bznsflow_business_state",
      arguments: {},
    });
    assert.equal(answer.structuredContent.status, "completed");
    const denied = await sdkClient.callTool({
      name: "bznsflow_execute_arbitrary_sql",
      arguments: {},
    });
    assert.equal(denied.isError, true);
    await sdkClient.close();
    for (const c of durable.connections.values()) c.revoked = true;
    assert.equal((await rpc(tokens.access_token)).status, 401);
    for (const c of durable.connections.values()) c.revoked = false;
    // Codex refreshes with its default scope set even after
    // `mcp login --scopes workspace:read,workspace:write`. Unheld scopes are
    // dropped, never added: a read-only grant must stay read-only.
    const refreshed = await tokenReq({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      resource,
      scope: "openid workspace:read workspace:write",
    });
    assert.equal(refreshed.status, 200, await refreshed.clone().text());
    const rotated = await refreshed.json();
    assert.notEqual(rotated.refresh_token, tokens.refresh_token);
    assert.equal(
      rotated.scope.split(" ").includes("workspace:write"),
      requestedScope.split(" ").includes("workspace:write"),
    );
    const unheld = await tokenReq({
      grant_type: "refresh_token",
      refresh_token: rotated.refresh_token,
      resource,
      scope: "profile",
    });
    assert.equal((await unheld.json()).error, "invalid_scope");
    const replay = await tokenReq({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      resource,
    });
    assert.equal(replay.status, 400);
    assert.equal((await rpc(rotated.access_token)).status, 401);
    // A directly issued wrong-audience token is refused before tool discovery.
    const bad = new providers[0].AccessToken({
      accountId: "owner-a",
      clientId: client.client_id,
      scope: "workspace:read",
      aud: "https://foreign.example/mcp",
    });
    assert.equal((await rpc(await bad.save())).status, 401);
  });
