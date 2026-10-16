// One-time Green provisioning for AI Connections (MCP). Run by the owner from a
// checkout linked to the bznsflow-main Vercel project:
//   node scripts/mcp-provision.mjs
// Generates independent production secrets and stores them only in Vercel and
// Convex. Prints names, never values. Existing variables are left untouched.
// MCP starts OFF; enabling the pilot is a separate, explicit step.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPair, exportJWK } from "jose";

const GREEN_PROJECT = "bznsflow-main";
const GREEN_CONVEX = "rare-fish-465";
// Green's own selector (also in .env.green-convex.local). dev:quaint-nightingale-675
// belongs to the Blue project; its --prod is valuable-mandrill-296, not Green.
const CONVEX_SELECTOR = "prod:rare-fish-465";
const PILOT_EMAIL = "ahmed@bznsflowai.com";
const ORIGIN = "https://www.bznsflowai.com";

const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", ...options });
const convexEnv = { ...process.env, CONVEX_DEPLOYMENT: CONVEX_SELECTOR };

const linked = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
if (linked.projectName !== GREEN_PROJECT)
  throw Error(
    `Linked Vercel project is ${linked.projectName}, not ${GREEN_PROJECT}`,
  );
const spec = run("npx", ["convex", "function-spec"], {
  env: convexEnv,
});
if (!spec.includes(`${GREEN_CONVEX}.`))
  throw Error(`Convex does not resolve to ${GREEN_CONVEX}`);

const { privateKey } = await generateKeyPair("RS256", { extractable: true });
const jwk = await exportJWK(privateKey);
const workerSecret = randomBytes(32).toString("hex");
const vercelValues = {
  MCP_ENABLED: "false",
  MCP_PILOT_EMAIL: PILOT_EMAIL,
  MCP_WORKER_SECRET: workerSecret,
  MCP_OAUTH_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  MCP_COOKIE_KEYS: randomBytes(48).toString("base64url"),
  MCP_OAUTH_JWKS: JSON.stringify({
    keys: [{ ...jwk, kid: `green-${Date.now()}`, use: "sig", alg: "RS256" }],
  }),
};
const existing = new Set(
  run("npx", ["vercel", "env", "ls", "production"])
    .split("\n")
    .map((line) => line.trim().split(/\s+/)[0]),
);
if (existing.has("MCP_WORKER_SECRET"))
  throw Error(
    "MCP_WORKER_SECRET already exists in Vercel; set Convex's copy to the same value by hand",
  );
for (const [name, value] of Object.entries(vercelValues)) {
  if (existing.has(name)) {
    console.log(`Vercel production: ${name} already set, kept`);
    continue;
  }
  const secret = !["MCP_ENABLED", "MCP_PILOT_EMAIL"].includes(name);
  run(
    "npx",
    [
      "vercel",
      "env",
      "add",
      name,
      "production",
      secret ? "--sensitive" : "--no-sensitive",
    ],
    {
      input: value,
      stdio: ["pipe", "ignore", "inherit"],
    },
  );
  console.log(`Vercel production: ${name} added`);
}

// Convex refuses the whole file if any variable already holds a different value.
const dir = mkdtempSync(join(tmpdir(), "bznsflow-mcp-"));
const file = join(dir, "mcp.env");
try {
  writeFileSync(
    file,
    [
      "MCP_ENABLED=false",
      `MCP_PILOT_EMAIL=${PILOT_EMAIL}`,
      `MCP_WORKER_SECRET=${workerSecret}`,
      `PUBLIC_SITE_ORIGIN=${ORIGIN}`,
    ].join("\n") + "\n",
    { mode: 0o600 },
  );
  run("npx", ["convex", "env", "set", "--from-file", file], {
    env: convexEnv,
    stdio: ["ignore", "ignore", "inherit"],
  });
  console.log(
    `Convex ${GREEN_CONVEX}: MCP_ENABLED, MCP_PILOT_EMAIL, MCP_WORKER_SECRET, PUBLIC_SITE_ORIGIN set`,
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log("MCP is provisioned and OFF. Deploy Convex and the website next.");
