// Installed Codex/Claude Code OAuth login and browser consent against the synthetic candidate.
// Does not invoke a model or certify either CLI's tool execution/refresh.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright";
const origin = "https://bznsflow-mcp-acceptance.vercel.app";
const sessions = JSON.parse(
  readFileSync(process.env.MCP_ACCEPTANCE_SESSION_FILE, "utf8"),
);
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
