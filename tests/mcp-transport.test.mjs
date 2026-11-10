// Transport guards learned in production on 10 November 2026: clients' optional GET stream
// held functions open until Vercel's 60-second kill, and a backend deployed before the
// website advertised tool names the website did not know.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createMcpHandler } from "../api/_lib/mcp/handler.js";

async function harness({ tools = ["bznsflow_business_state"], execute, deadlineMs } = {}) {
  const calls = [];
  const store = async (operation, input) => {
    calls.push(operation);
    if (operation === "grant_context") return { connectionId: "connection-1" };
    if (operation === "admit") return { tools, email: "owner@example.com" };
    return null;
  };
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const provider = {
    AccessToken: {
      find: async () => ({
        grantId: "grant",
        accountId: "account",
        clientId: "client",
        aud: `${origin}/api/mcp`,
        scope: "workspace:read workspace:write",
      }),
    },
  };
  const handler = createMcpHandler({
    env: { NODE_ENV: "test", PUBLIC_SITE_ORIGIN: origin, MCP_ENABLED: "true" },
    store,
    provider,
    execute: execute || (async () => ({ status: "completed", result: {} })),
    ...(deadlineMs ? { deadlineMs } : {}),
  });
  server.on("request", handler);
  const rpc = (method, params = {}) =>
    fetch(`${origin}/api/mcp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${"t".repeat(40)}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  const close = () => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); });
  return { origin, calls, rpc, close };
}

test("GET and DELETE are refused at once, before any token check or lease", async () => {
  const h = await harness();
  try {
    for (const method of ["GET", "DELETE"]) {
      const started = Date.now();
      const response = await fetch(`${h.origin}/api/mcp`, {
        method,
        headers: { Authorization: `Bearer ${"t".repeat(40)}`, Accept: "text/event-stream" },
        signal: AbortSignal.timeout(5000),
      });
      assert.equal(response.status, 405, method);
      assert.equal(response.headers.get("allow"), "POST, OPTIONS");
      assert.ok(Date.now() - started < 2000, `${method} answers immediately`);
    }
    assert.deepEqual(h.calls, [], "no token lookup, admission or lease for a refused method");
    const preflight = await fetch(`${h.origin}/api/mcp`, {
      method: "OPTIONS",
      headers: { Origin: "https://claude.ai", "Access-Control-Request-Method": "POST" },
    });
    assert.equal(preflight.headers.get("access-control-allow-methods"), "POST, OPTIONS");
  } finally {
    await h.close();
  }
});

test("tool names from a newer backend are skipped, not fatal", async () => {
  const h = await harness({ tools: ["bznsflow_business_state", "bznsflow_from_a_newer_backend"] });
  try {
    const response = await h.rpc("tools/list");
    assert.equal(response.status, 200, await response.clone().text());
    const names = (await response.json()).result.tools.map((t) => t.name);
    assert.deepEqual(names, ["bznsflow_business_state"]);
    assert.ok(h.calls.includes("release"), "the lease is released");
  } finally {
    await h.close();
  }
});

test("a call that outlives the deadline answers before the platform limit and frees its lease", async () => {
  const h = await harness({ deadlineMs: 300, execute: () => new Promise(() => {}) });
  try {
    const started = Date.now();
    const response = await h.rpc("tools/call", { name: "bznsflow_business_state", arguments: {} });
    assert.equal(response.status, 504);
    const body = await response.json();
    assert.equal(body.reason, "request_timeout");
    assert.match(body.hint, /Do not repeat/);
    assert.ok(Date.now() - started < 5000);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(h.calls.includes("release"), "the concurrency lease is released");
  } finally {
    await h.close();
  }
});
