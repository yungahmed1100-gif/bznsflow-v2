// Installed Codex/Claude Code OAuth login and browser consent against the synthetic candidate.
// Does not invoke a model or certify either CLI's tool execution/refresh.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright";
const origin = "https://bznsflow-mcp-acceptance.vercel.app";
const sessions = JSON.parse(
  readFileSync(process.env.MCP_ACCEPTANCE_SESSION_FILE, "utf8"),
);
if (process.env.MCP_ACCEPTANCE_MODEL_TEST === "true") {
  const refreshed = spawnSync(
    "npx",
    [
      "convex",
      "run",
      "--deployment",
      "quaint-monitor-641",
      "mcpAcceptance:fixture",
      JSON.stringify({
        operation: "refresh_session",
        input: { sessionId: sessions.seeded.owner.sessionId },
      }),
    ],
    { encoding: "utf8" },
  );
  assert.equal(refreshed.status, 0, "Synthetic session refresh failed");
}
const config = `mcp_servers.bznsflow_acceptance.url="${origin}/api/mcp"`;
const cli = process.argv[2] || "codex";
assert.ok(["codex", "claude"].includes(cli));
const cwd =
  cli === "claude"
    ? mkdtempSync(join(tmpdir(), "bznsflow-mcp-claude-"))
    : process.cwd();
if (cli === "claude") {
  const added = spawnSync(
    cli,
    [
      "mcp",
      "add",
      "--scope",
      "local",
      "--transport",
      "http",
      "bznsflow_acceptance",
      `${origin}/api/mcp`,
    ],
    { cwd, encoding: "utf8" },
  );
  assert.equal(added.status, 0, added.stderr);
}
// Supply a private PTY for Codex's hidden callback prompt without changing user config.
const pty = `import os,pty,select,sys,signal
pid,fd=pty.fork()
if pid==0: os.execvp(sys.argv[1],sys.argv[1:])
def stop(*_):
  try: os.kill(pid,signal.SIGTERM)
  except ProcessLookupError: pass
signal.signal(signal.SIGTERM,stop)
inputs=[fd,0]
while True:
  ready,_,_=select.select(inputs,[],[])
  if fd in ready:
    try: data=os.read(fd,65536)
    except OSError: break
    if not data: break
    os.write(1,data)
  if 0 in ready:
    data=os.read(0,65536)
    if data: os.write(fd,data)
    else: inputs.remove(0)
_,status=os.waitpid(pid,0)
sys.exit(os.waitstatus_to_exitcode(status))`;
const cliArgs =
  cli === "codex"
    ? [
        "-c",
        config,
        "mcp",
        "login",
        "bznsflow_acceptance",
        "--no-browser",
        "--scopes",
        "workspace:read,workspace:write",
      ]
    : ["mcp", "login", "bznsflow_acceptance", "--no-browser"];
const child = spawn("python3", ["-c", pty, cli, ...cliArgs], {
  cwd,
  env: { ...process.env, NO_COLOR: "1" },
  stdio: ["pipe", "pipe", "pipe"],
});
let output = "";
let resolveUrl, rejectUrl;
const urlReady = new Promise((resolve, reject) => {
  resolveUrl = resolve;
  rejectUrl = reject;
});
urlReady.catch(() => {}); // Browser startup can finish after a CLI refusal.
for (const stream of [child.stdout, child.stderr])
  stream.on("data", (chunk) => {
    output += chunk;
    const url = stripVTControlCharacters(output).match(
      /https:\/\/bznsflow-mcp-acceptance\.vercel\.app\/oauth\/auth\?[^\s\x00-\x1f\x7f]+/,
    );
    if (url) resolveUrl(url[0]);
  });
const exited = new Promise((resolve) =>
  child.on("exit", (code) => {
    rejectUrl(
      Error(
        `${cli} ended before authorization: ` +
          output.replace(/https?:\/\/\S+/g, "[URL]"),
      ),
    );
    resolve(code);
  }),
);
const timer = setTimeout(() => child.kill(), 150000);
const browser = await chromium.launch();
try {
  const url = await urlReady;
  if (process.env.MCP_ACCEPTANCE_AUTH_URL_FILE)
    writeFileSync(process.env.MCP_ACCEPTANCE_AUTH_URL_FILE, url, {
      mode: 0o600,
    });
  const authParams = new URL(url).searchParams;
  console.log(
    "Client request:",
    JSON.stringify({
      client: authParams.get("client_id"),
      scope: authParams.get("scope"),
      resource: authParams.get("resource"),
      redirect: authParams.get("redirect_uri"),
    }),
  );
  const callbackOrigin = new URL(new URL(url).searchParams.get("redirect_uri"))
    .origin;
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "bf_session",
      value: sessions.cookies.owner,
      url: origin,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  let callback;
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin === callbackOrigin) {
      callback = route.request().url();
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "Synthetic OAuth callback received.",
      });
    }
    return route.continue();
  });
  await page.goto(url);
  console.log("Authorization page loaded:", new URL(page.url()).pathname);
  if (new URL(page.url()).pathname !== "/mcp")
    throw Error(
      (await page.locator("body").innerText())
        .replace(/https?:\/\/\S+/g, "[URL]")
        .slice(0, 1200),
    );
  for (let i = 0; i < 3 && !callback; i++) {
    const previous = page.url();
    await page
      .getByRole("button", {
        name: /المتابعة بهذا الحساب|Continue with this account/,
      })
      .click({ timeout: 30000 });
    await page.waitForURL(
      (next) =>
        next.origin === callbackOrigin ||
        (next.pathname === "/mcp" && next.href !== previous),
      { timeout: 45000 },
    );
    await page.waitForLoadState("networkidle");
    if (new URL(page.url()).origin === callbackOrigin) callback = page.url();
    console.log("Consent navigation:", new URL(page.url()).pathname);
  }
  assert.ok(callback, "No OAuth callback");
  if (child.exitCode === null && !child.stdin.destroyed)
    child.stdin.end(callback + "\r");
  assert.equal(await exited, 0, output.replace(/https?:\/\/\S+/g, "[URL]"));
  console.log(
    `Installed ${cli} OAuth login passed against HTTPS candidate with real Arabic consent UI. Synthetic seeded account session; no OTP/social sign-in or model tool calls claimed.`,
  );
  if (process.env.MCP_ACCEPTANCE_MODEL_TEST === "true") {
    const toolCwd = mkdtempSync(join(tmpdir(), "bznsflow-mcp-model-"));
    const configPath = join(toolCwd, "mcp.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          bznsflow_acceptance: { type: "http", url: origin + "/api/mcp" },
        },
      }),
      { mode: 0o600 },
    );
    const modelRun = async (prompt, stage) => {
      const args =
        cli === "codex"
          ? [
              "exec",
              "--json",
              "--ephemeral",
              "--skip-git-repo-check",
              "--sandbox",
              "read-only",
              "-c",
              "mcp_servers={}",
              "-c",
              config,
              prompt,
            ]
          : [
              "-p",
              prompt,
              "--output-format",
              "json",
              "--strict-mcp-config",
              "--mcp-config",
              configPath,
              "--tools",
              "",
              "--allowedTools",
              "mcp__bznsflow_acceptance__*",
              "--max-budget-usd",
              "1",
            ];
      const proc = spawn(cli, args, {
        cwd: toolCwd,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let text = "";
      for (const stream of [proc.stdout, proc.stderr])
        stream.on("data", (b) => {
          text += b.toString();
        });
      const deadline = setTimeout(() => proc.kill(), 180000);
      const code = await new Promise((resolve) => proc.on("exit", resolve));
      clearTimeout(deadline);
      writeFileSync(
        join(tmpdir(), "bznsflow-mcp-" + cli + "-" + stage + ".log"),
        text,
        { mode: 0o600 },
      );
      assert.equal(code, 0, cli + " model stage failed: " + stage);
      console.log(cli + " model stage returned: " + stage);
    };
    const list = async () => {
      const r = await context.request.get(origin + "/api/mcp/manage");
      assert.equal(r.status(), 200);
      return r.json();
    };
    try {
      const mutationId = randomUUID(),
        exportId = randomUUID();
      await modelRun(
        'This is a synthetic MCP acceptance test. Use only the bznsflow_acceptance MCP server; do not use shell, files, other servers or external sends. Call bznsflow_business_state. Then call bznsflow_dashboard_set_timezone with requestId "' +
          mutationId +
          '" and timezone "Asia/Muscat". Then call bznsflow_dashboard_export_contacts with requestId "' +
          exportId +
          '". Stop when approval is required; do not approve it yourself. Reply in Arabic and distinguish completed changes from pending approval.',
        "ar-read-write-preview",
      );
      let data = await list();
      const connection = data.connections.find(
        (c) =>
          c.clientId === authParams.get("client_id") &&
          !c.revokedAt &&
          c.verifiedAt,
      );
      assert.ok(connection, "client did not make a verified MCP connection");
      assert.ok(
        data.activity.some(
          (a) =>
            a.tool === "bznsflow_dashboard_set_timezone" &&
            a.status === "completed" &&
            a.connectionId === connection.id,
        ),
        "actual client write missing",
      );
      const approval = data.approvals.find(
        (a) =>
          a.connectionId === connection.id && a.args?.requestId === exportId,
      );
      assert.ok(approval, "actual client approval preview missing");
      await page.goto(origin + "/en/mcp");
      const card = page.locator('[id="approval-' + approval.id + '"]');
      await card
        .getByRole("button", { name: "Approve this action", exact: true })
        .click();
      await card.waitFor({ state: "detached" });
      await modelRun(
        'Use only bznsflow_acceptance. Call bznsflow_dashboard_export_contacts with requestId "' +
          exportId +
          '" again. Its exact preview was approved on the website. Report the returned completion status in English; do not send any messages or use other tools.',
        "en-approved-write",
      );
      data = await list();
      assert.ok(
        data.activity.some(
          (a) =>
            a.tool === "bznsflow_dashboard_export_contacts" &&
            a.status === "completed" &&
            a.connectionId === connection.id,
        ),
        "approved client execution missing",
      );
      const expire = spawnSync(
        "npx",
        [
          "convex",
          "run",
          "--deployment",
          "quaint-monitor-641",
          "mcpAcceptance:fixture",
          JSON.stringify({ operation: "expire_access_tokens", input: {} }),
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      assert.equal(expire.status, 0, "could not expire synthetic access token");
      await modelRun(
        "Use only bznsflow_acceptance. Call bznsflow_business_state and return a brief summary in English. Do not modify anything. The server may require automatic OAuth refresh; use existing authorization.",
        "automatic-refresh",
      );
      const refreshed = await list();
      assert.ok(
        refreshed.activity.some(
          (a) =>
            a.tool === "bznsflow_business_state" &&
            a.status === "completed" &&
            a.connectionId === connection.id &&
            a.at >
              data.connections.find((c) => c.id === connection.id).lastUsedAt,
        ),
        "client read after forced token expiry missing",
      );
      await page.reload();
      const connectionCard = page.locator("article").filter({
        has: page.locator(".mcp-client-id", { hasText: connection.clientId }),
      });
      await connectionCard
        .getByRole("button", { name: "Disconnect", exact: true })
        .click();
      assert.ok(
        (await list()).connections.find((c) => c.id === connection.id)
          .revokedAt,
      );
      console.log(
        cli +
          " real model acceptance passed: Arabic read/write/preview, English website-approved export, forced-expiry automatic refresh, website disconnection.",
      );
    } finally {
      rmSync(toolCwd, { recursive: true, force: true });
    }
  }
} finally {
  clearTimeout(timer);
  child.kill();
  await browser.close();
  const logout = spawnSync(
    cli,
    [
      ...(cli === "codex" ? ["-c", config] : []),
      "mcp",
      "logout",
      "bznsflow_acceptance",
    ],
    { cwd, encoding: "utf8" },
  );
  assert.equal(logout.status, 0, `${cli} test credential cleanup failed`);
  if (cli === "claude") {
    const removed = spawnSync(
      cli,
      ["mcp", "remove", "--scope", "local", "bznsflow_acceptance"],
      { cwd, encoding: "utf8" },
    );
    assert.equal(removed.status, 0, "Claude test registration cleanup failed");
    rmSync(cwd, { recursive: true });
  }
  console.log(`Temporary ${cli} authentication removed.`);
}
