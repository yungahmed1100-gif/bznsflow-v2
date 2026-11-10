import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOL_BY_NAME } from "../../../config/mcp/contracts.js";
import { explain, normalizeKeys } from "../../../config/mcp/validation.js";
import { toolError } from "../../../config/mcp/errors.js";
import { rasilOpen } from "../rasil-api.js";
import { MCP_NAME, MCP_DESCRIPTION, MCP_INSTRUCTIONS, mcpIcons } from "../../../config/mcp/identity.js";
import {
  createOAuth,
  protectedMetadata,
  accessToken,
  interactionView,
  completeInteraction,
  mcpOrigin,
  tokenHash,
  clientMetadataAllowed,
} from "./oauth.js";
import { mcpStore, McpError } from "./store.js";
import { runTool } from "./application.js";
import { parseCookies, verifyCsrf, ensureCsrfToken } from "../cookies.js";
import { sendTeamInvitation } from "../hasib/hasib-api.js";
const json = (res, status, value) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(value));
};
async function body(req) {
  if (req.body !== undefined) {
    if (
      Buffer.byteLength(
        typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      ) > 500000
    )
      throw new McpError("body_too_large", 413);
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (Buffer.byteLength(data) > 500000)
      throw new McpError("body_too_large", 413);
  }
  return data ? JSON.parse(data) : {};
}
const reason = (e) =>
  /^[a-z_]{3,60}$/.test(e?.code || "") ? e.code : "mcp_unavailable";
// Bump when tool names, schemas or descriptions change, so clients refresh their cache.
export const SERVER_VERSION = "1.1.0";
// Large shared sector shapes are advertised by top-level field only; validation still
// uses the full schema, and bznsflow_tools_describe returns it.
const ADVERTISED_SCHEMA_BYTES = 2500;
const brief = (schema) =>
  schema.type
    ? {
        type: schema.type,
        ...(schema.enum ? { enum: schema.enum } : {}),
        ...(schema.type === "string" && schema.maxLength ? { maxLength: schema.maxLength } : {}),
      }
    : schema.enum
      ? { enum: schema.enum }
      : schema.const !== undefined
        ? { const: schema.const }
        : {};
const CORE_FIELDS = new Set(["requestId", "idempotencyKey", "version", "cursor", "limit", "status"]);
export function advertisedSchema(tool) {
  const full = tool.inputSchema;
  // Sector tools share one large field set per sector. Advertise the fields every call
  // uses; the assistant reads the rest with bznsflow_tools_describe. Validation is unchanged.
  const shared = tool.domain === "hasib" && !!tool.packs && Object.keys(full.properties).length > 8;
  if (!shared && JSON.stringify(full).length <= ADVERTISED_SCHEMA_BYTES) return full;
  const required = full.required || [];
  const keep = Object.entries(full.properties).filter(
    ([k]) => !shared || required.includes(k) || CORE_FIELDS.has(k),
  );
  return {
    type: "object",
    properties: Object.fromEntries(keep.map(([k, v]) => [k, brief(v)])),
    required,
    additionalProperties: shared,
    ...(shared
      ? { description: "More fields: bznsflow_tools_describe with this tool's name." }
      : {}),
  };
}
export function describeTool(tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    category: tool.category,
    approvalCategories:
      tool.category === "read" ? [] : tool.categories || [tool.category],
    required: tool.inputSchema.required || [],
    inputSchema: tool.inputSchema,
    ...(tool.disposition === "handoff" ? { websitePath: tool.path } : {}),
  };
}
const errorResult = (error) => ({
  isError: true,
  content: [{ type: "text", text: JSON.stringify({ error }) }],
  structuredContent: { error },
});
export function createMcpHandler({
  env = process.env,
  store = mcpStore({ env }),
  provider: provided,
  execute = runTool,
} = {}) {
  let cached = provided;
  const provider = () => cached || (cached = createOAuth({ env, store }));
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Referrer-Policy", "no-referrer");
    let lease, connectionId;
    try {
      const origin = mcpOrigin(env),
        url = new URL(req.url, origin),
        route =
          req.query?.mcpRoute ||
          url.searchParams.get("mcpRoute") ||
          url.pathname;
      if (req.headers.host && req.headers.host !== new URL(origin).host)
        throw new McpError("invalid_host", 403);
      if (route.startsWith("/.well-known/oauth-protected-resource")) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        return json(res, 200, protectedMetadata(env));
      }
      if (route === "/api/mcp/worker") {
        const expected = Buffer.from(`Bearer ${env.MCP_WORKER_SECRET || ""}`),
          supplied = Buffer.from(req.headers.authorization || "");
        if (
          !env.MCP_WORKER_SECRET ||
          expected.length !== supplied.length ||
          !timingSafeEqual(expected, supplied) ||
          req.method !== "POST"
        )
          throw new McpError("worker_auth", 401);
        const { effectId } = await body(req),
          effect = await store("effect_claim", { effectId });
        if (!effect) return json(res, 200, { ok: true, skipped: true });
        let status = "submitted",
          providerId;
        try {
          ({ providerId } = await sendTeamInvitation({
            member: effect.payload,
            env,
          }));
        } catch {
          status = "outcome_unknown";
        }
        await store("effect_result", {
          effectId,
          status,
          ...(providerId ? { providerId } : {}),
        });
        return json(res, 200, { ok: true, status });
      }
      if (route === "/api/mcp/transfer") {
        if (req.method !== "GET") throw new McpError("method", 405);
        const file = await store("transfer_download", {
          tokenHash: tokenHash(req),
          transferId: url.searchParams.get("handle"),
        });
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="bznsflow-export.json"',
        );
        return json(res, 200, file.payload);
      }
      if (route === "/api/mcp/manage") {
        if (req.method !== "GET" && req.method !== "POST")
          throw new McpError("method", 405);
        if (req.headers.origin && req.headers.origin !== origin)
          throw new McpError("origin", 403);
        if (
          req.method === "POST" &&
          (req.headers.origin !== origin || !verifyCsrf(req))
        )
          throw new McpError("csrf", 403);
        const csrfToken = ensureCsrfToken(req, res);
        if (req.method === "GET") {
          if (url.searchParams.get("interaction") === "true") {
            const { view } = await interactionView(provider(), req, res);
            return json(res, 200, { ok: true, interaction: view, csrfToken });
          }
          const result = await store("manage", {
            operation: "list",
            tokenHash: tokenHash(req),
          });
          return json(res, 200, {
            ok: true,
            ...result,
            csrfToken,
            resume: !!parseCookies(req).bf_mcp_resume,
          });
        }
        const data = await body(req);
        if (data.action === "consent") {
          const redirect = await completeInteraction(
            provider(),
            store,
            req,
            res,
            data.allow === true,
            data.areas,
            data.interactionUid,
          );
          return json(res, 200, { ok: true, redirect });
        }
        if (!["policy", "revoke", "approve", "reject"].includes(data.action))
          throw new McpError("invalid_operation", 400);
        const result = await store("manage", {
          operation: data.action,
          tokenHash: tokenHash(req),
          connectionId: data.connectionId,
          ...(data.runId ? { runId: data.runId } : {}),
          ...(data.action === "policy"
            ? { direct: data.direct, scopes: data.scopes, areas: data.areas }
            : {}),
        });
        return json(res, 200, { ok: true, ...result, csrfToken });
      }
      if (env.MCP_ENABLED !== "true") throw new McpError("mcp_disabled", 503);
      if (
        route.startsWith("/oauth") ||
        route === "/.well-known/oauth-authorization-server"
      ) {
        const ip = String(
          req.headers["x-vercel-forwarded-for"] ||
            req.socket?.remoteAddress ||
            "unknown",
        ).split(",")[0];
        await store("rate", {
          key: `oauth:${createHash("sha256").update(ip).digest("hex")}`,
          max: 60,
          window: 60000,
        });
        if (route === "/oauth/reg" && req.method === "POST") {
          await store("rate", {
            key: "oauth:registration:global",
            max: 100,
            window: 3600000,
          });
          await store("rate", {
            key: `oauth:registration:${createHash("sha256").update(ip).digest("hex")}`,
            max: 10,
            window: 3600000,
          });
        }
        if (route === "/oauth/reg" && req.method === "POST") {
          const metadata = await body(req);
          req.body = metadata;
          if (
            !clientMetadataAllowed(metadata) ||
            !Array.isArray(metadata.redirect_uris) ||
            !metadata.redirect_uris.length ||
            metadata.redirect_uris.length > 10 ||
            JSON.stringify(metadata).length > 16000
          )
            throw new McpError("invalid_client_metadata", 400);
          for (const uri of metadata.redirect_uris) {
            let u;
            try {
              u = new URL(uri);
            } catch {
              throw new McpError("invalid_redirect_uri", 400);
            }
            if (
              u.username ||
              u.password ||
              u.hash ||
              !(
                u.protocol === "https:" ||
                (u.protocol === "http:" &&
                  ["127.0.0.1", "[::1]", "localhost"].includes(u.hostname))
              )
            )
              throw new McpError("invalid_redirect_uri", 400);
          }
        }
        const suffix = route.startsWith("/oauth")
          ? route.slice(6)
          : "/.well-known/oauth-authorization-server";
        url.searchParams.delete("mcpRoute");
        url.searchParams.delete("surface");
        req.originalUrl = `/oauth${suffix}${url.search}`;
        req.url = `${suffix || "/"}${url.search}`;
        return provider().callback()(req, res);
      }
      if (route !== "/api/mcp") throw new McpError("not_found", 404);
      // Origin is optional for native clients; any browser-supplied origin must be trusted.
      const allowedOrigins = new Set([
        origin,
        "https://claude.ai",
        "https://claude.com",
        "https://chatgpt.com",
      ]);
      if (req.headers.origin && !allowedOrigins.has(req.headers.origin))
        throw new McpError("origin", 403);
      if (req.headers.origin) {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
        res.setHeader("Vary", "Origin");
        res.setHeader(
          "Access-Control-Expose-Headers",
          "WWW-Authenticate, MCP-Protocol-Version",
        );
      }
      if (req.method === "OPTIONS") {
        res.setHeader(
          "Access-Control-Allow-Origin",
          req.headers.origin || origin,
        );
        res.setHeader("Vary", "Origin");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id",
        );
        res.setHeader(
          "Access-Control-Allow-Methods",
          "POST, GET, DELETE, OPTIONS",
        );
        res.statusCode = 204;
        return res.end();
      }
      const access = await accessToken(provider(), store, req, env);
      connectionId = access.connectionId;
      lease = randomUUID();
      const context = await store("admit", { connectionId, lease });
      // Email campaigns stay limited to the accounts the website's Rasil switch admits.
      const emailOpen = rasilOpen(env, context.email);
      const names = context.tools.filter(
        (name) =>
          (TOOL_BY_NAME.get(name).category === "read" ||
            access.scopes.includes("workspace:write")) &&
          (emailOpen || TOOL_BY_NAME.get(name).domain !== "email"),
      );
      const server = new Server(
        {
          name: "bznsflow",
          title: MCP_NAME,
          description: MCP_DESCRIPTION,
          version: SERVER_VERSION,
          websiteUrl: origin,
          // Shown by clients next to the connector so the owner can recognise it.
          icons: mcpIcons(origin),
        },
        { capabilities: { tools: {} }, instructions: MCP_INSTRUCTIONS },
      );
      server.setRequestHandler(ListToolsRequestSchema, async (request) => {
        const cursor = request.params?.cursor || "0";
        if (!/^(0|[1-9][0-9]{0,4})$/.test(cursor))
          throw new McpError("invalid_cursor", 400);
        const start = Number(cursor),
          page = names.slice(start, start + 60);
        return {
          tools: page.map((name) => {
            const t = TOOL_BY_NAME.get(name);
            return {
              name: t.name,
              title: t.title,
              icons: mcpIcons(origin),
              description: t.description,
              inputSchema: advertisedSchema(t),
              annotations: {
                readOnlyHint: t.category === "read",
                destructiveHint: ["bulk", "team"].includes(t.category) ||
                  /delete|archive|revoke|disconnect|void|cancel/.test(t.operation),
                // Reads repeat safely; writes dedupe on their requestId.
                idempotentHint: true,
                openWorldHint: ["messages", "team"].includes(t.category) ||
                  (t.categories || []).includes("messages"),
              },
            };
          }),
          ...(start + 60 < names.length
            ? { nextCursor: String(start + 60) }
            : {}),
        };
      });
      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (!names.includes(request.params.name))
          return errorResult(toolError("tool_not_allowed"));
        const started = Date.now();
        let outcome = "failed";
        const tool = TOOL_BY_NAME.get(request.params.name),
          args = normalizeKeys(request.params.arguments || {});
        const problem = explain(tool.inputSchema, args);
        if (problem) {
          outcome = "invalid_arguments";
          await store("metric", {
            connectionId,
            tool: tool.name,
            status: outcome,
            durationMs: Date.now() - started,
          }).catch(() => console.warn("mcp_metric_unavailable"));
          return errorResult(toolError("invalid_arguments", problem));
        }
        try {
          // Answered from this connection's own tool list; no workspace data involved.
          if (tool.domain === "tools") {
            const target = TOOL_BY_NAME.get(args.name);
            if (!target || !names.includes(target.name))
              throw new McpError("tool_not_allowed", 403);
            outcome = "completed";
            const value = describeTool(target);
            return {
              content: [{ type: "text", text: JSON.stringify(value) }],
              structuredContent: value,
            };
          }
          const result = await execute({
            connectionId,
            tool: request.params.name,
            args,
            env,
            store,
          });
          if (result.status === "website_required" || result.result?.status === "website_required") {
            const handoff = result.result?.status ? result.result : result;
            handoff.url = new URL(handoff.path, origin).href;
          }
          outcome = result.status || "completed";
          if (result.workspacePath || result.recordLinks?.length)
            result.links = [
              ...(result.workspacePath
                ? [
                    {
                      label: "Workspace",
                      url: new URL(result.workspacePath, origin).href,
                    },
                  ]
                : []),
              ...(result.recordLinks || []).map((link) => ({
                label: link.label,
                id: link.id,
                url: new URL(link.path, origin).href,
              })),
            ];
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: result,
          };
        } catch (e) {
          outcome = reason(e);
          return errorResult(toolError(outcome));
        } finally {
          await store("metric", {
            connectionId,
            tool: request.params.name,
            status: outcome,
            durationMs: Date.now() - started,
          }).catch(() => {
            console.warn("mcp_metric_unavailable");
          });
        }
      });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      res.on("close", () => {
        void transport.close().catch(() => {});
        void server.close().catch(() => {});
      });
      await transport.handleRequest(
        req,
        res,
        req.method === "POST" ? await body(req) : undefined,
      );
    } catch (error) {
      const status = error instanceof McpError ? error.status : 503;
      if (status === 401)
        res.setHeader(
          "WWW-Authenticate",
          `Bearer resource_metadata="${mcpOrigin(env)}/.well-known/oauth-protected-resource/api/mcp", scope="workspace:read workspace:write", error="invalid_token"`,
        );
      if (status === 429) res.setHeader("Retry-After", "60");
      if (!res.headersSent)
        json(res, status, { ok: false, reason: reason(error) });
    } finally {
      if (lease && connectionId)
        await store("release", { lease, connectionId }).catch(() => {});
    }
  };
}
export default createMcpHandler();
