// Front end, API and Convex must agree. Every call the browser makes has to
// reach a live handler; a retired (410) endpoint or an unknown action fails here
// instead of in production.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { acceptedActions } from "./helpers/accepted-actions.mjs";
import { HASIB_ACTIONS } from "../api/_lib/hasib/validate.js";
import { SURFACES } from "../api/layla-meta.js";

const source = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? source(join(dir, e.name))
      : /\.(jsx?|tsx?)$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
const SRC = source("src").map((path) => [path, readFileSync(path, "utf8")]);
const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));

test("every action the browser sends is accepted by its controller", () => {
  const server = {
    hasib: new Set([...HASIB_ACTIONS, "overview"]),
    dashboard: new Set(acceptedActions("api/_lib/layla/dashboard-api.js")),
    messaging: new Set(acceptedActions("api/_lib/layla/blue-messaging.js")),
  };
  for (const [kind, accepted] of Object.entries(server)) {
    const call = new RegExp(`\\b${kind}\\(\\s*['"]([a-z_]+)['"]`, "g");
    for (const [path, text] of SRC)
      for (const [, action] of text.matchAll(call))
        assert.ok(accepted.has(action), `${path}: ${kind}('${action}')`);
  }
});

// A function file that is only a 410 placeholder for a retired endpoint.
const stub = (fn) => {
  const text = readFileSync(fn, "utf8");
  return text.split("\n").length < 12 && /send\(res,\s*410/.test(text);
};
// Resolve a browser URL the way Vercel does: a function file, or a rewrite into
// /api/layla-meta whose surface has a live handler.
function resolves(url) {
  const { pathname, searchParams } = new URL(url, "https://site.invalid");
  const fn = `${pathname.slice(1)}.js`;
  if (existsSync(fn) && !stub(fn))
    return pathname !== "/api/layla-meta" || live(searchParams.get("surface"));
  for (const { source: from, destination } of vercel.rewrites || []) {
    const pattern = new RegExp(`^${from.replace(/:path\*$/, ".*")}$`);
    if (!pattern.test(pathname)) continue;
    return live(
      new URL(destination, "https://site.invalid").searchParams.get("surface"),
    );
  }
  return false;
}
const live = (surface) => !!surface && SURFACES.includes(surface);

test("every API URL the browser calls reaches a live handler", () => {
  for (const [path, text] of SRC) {
    assert.doesNotMatch(
      text,
      /\/api\/[a-z0-9-]*-\$\{/,
      `${path}: unresolvable API name`,
    );
    for (const [url] of text.matchAll(
      /\/api\/[a-z0-9/_-]+(\?surface=[a-z-]+)?(?=['"`])/g,
    ))
      assert.ok(resolves(url), `${path}: ${url}`);
    for (const [, surface] of text.matchAll(/surface=([a-z-]+)['"`&]/g))
      assert.ok(live(surface), `${path}: surface=${surface}`);
  }
});

test("every Convex route the API uses is served by convex/http.ts", () => {
  const served = new Set(
    [
      ...readFileSync("convex/http.ts", "utf8").matchAll(
        /path:\s*['"]([^'"]+)['"]/g,
      ),
    ].map((m) => m[1]),
  );
  const api = source("api")
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
  const used = [
    ...[...api.matchAll(/route:\s*['"]([a-z0-9-]+)['"]/g)].map(
      (m) => `/${m[1]}`,
    ),
    ...[...api.matchAll(/\$\{site\}(\/[a-z0-9-]+)/g)].map((m) => m[1]),
  ];
  assert.ok(used.length > 10);
  for (const route of used)
    assert.ok(served.has(route), `convex/http.ts lacks ${route}`);
});

test("the AI Connections page only sends actions its handler accepts", () => {
  const handler = readFileSync("api/_lib/mcp/handler.js", "utf8");
  const page = [
    "src/pages/McpConnections.jsx",
    "src/components/mcp/ConnectionGuide.jsx",
  ]
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
  const sent = new Set(
    [...page.matchAll(/action:\s*"([a-z_]+)"/g)].map((m) => m[1]),
  );
  assert.ok(sent.size > 0);
  for (const action of sent)
    assert.match(handler, new RegExp(`"${action}"`), action);
});
