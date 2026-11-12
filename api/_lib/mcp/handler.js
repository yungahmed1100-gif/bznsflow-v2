import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { rasilOpen } from '../rasil-api.js';
import { raceDeadline } from '../deadline.js';
import { SERVER_VERSION, advertisedSchema, describeTool, visibleTools, toolPage } from './discovery.js';
import { callTool, reason } from './calls.js';
import { MCP_NAME, MCP_DESCRIPTION, MCP_INSTRUCTIONS, mcpIcons } from '../../../config/mcp/identity.js';
import {
  createOAuth,
  protectedMetadata,
  accessToken,
  interactionView,
  completeInteraction,
  mcpOrigin,
  tokenHash,
  clientMetadataAllowed,
} from './oauth.js';
import { mcpStore, McpError } from './store.js';
import { runTool } from './application.js';
import { parseCookies, verifyCsrf, ensureCsrfToken } from '../cookies.js';
import { sendTeamInvitation } from '../hasib/hasib-api.js';
const json = (res, status, value) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(value));
};
async function body(req) {
  if (req.body !== undefined) {
    if (Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) > 500000)
      throw new McpError('body_too_large', 413);
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (Buffer.byteLength(data) > 500000) throw new McpError('body_too_large', 413);
  }
  return data ? JSON.parse(data) : {};
}
// Every MCP request answers before Vercel's 60-second limit, so a slow call can never
// be killed mid-flight while it holds a concurrency lease (each store call is capped at 20 s).
export const MCP_REQUEST_DEADLINE_MS = 45000;
// Stateless Streamable HTTP: no server-initiated stream and no sessions to delete.
const MCP_METHODS = 'POST, OPTIONS';
// Kept here for callers and tests that import them from the handler.
export { SERVER_VERSION, advertisedSchema, describeTool };
export function createMcpHandler({
  env = process.env,
  store = mcpStore({ env }),
  provider: provided,
  execute = runTool,
  deadlineMs = MCP_REQUEST_DEADLINE_MS,
} = {}) {
  let cached = provided;
  const provider = () => cached || (cached = createOAuth({ env, store }));
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const requestStarted = Date.now();
    let lease, connectionId;
    try {
      const origin = mcpOrigin(env),
        url = new URL(req.url, origin),
        route = req.query?.mcpRoute || url.searchParams.get('mcpRoute') || url.pathname;
      if (req.headers.host && req.headers.host !== new URL(origin).host) throw new McpError('invalid_host', 403);
      if (route.startsWith('/.well-known/oauth-protected-resource')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return json(res, 200, protectedMetadata(env));
      }
      if (route === '/api/mcp/worker') {
        const expected = Buffer.from(`Bearer ${env.MCP_WORKER_SECRET || ''}`),
          supplied = Buffer.from(req.headers.authorization || '');
        if (
          !env.MCP_WORKER_SECRET ||
          expected.length !== supplied.length ||
          !timingSafeEqual(expected, supplied) ||
          req.method !== 'POST'
        )
          throw new McpError('worker_auth', 401);
        const { effectId } = await body(req),
          effect = await store('effect_claim', { effectId });
        if (!effect) return json(res, 200, { ok: true, skipped: true });
        let status = 'submitted',
          providerId;
        try {
          ({ providerId } = await sendTeamInvitation({
            member: effect.payload,
            env,
          }));
        } catch {
          status = 'outcome_unknown';
        }
        await store('effect_result', {
          effectId,
          status,
          ...(providerId ? { providerId } : {}),
        });
        return json(res, 200, { ok: true, status });
      }
      if (route === '/api/mcp/transfer') {
        if (req.method !== 'GET') throw new McpError('method', 405);
        const file = await store('transfer_download', {
          tokenHash: tokenHash(req),
          transferId: url.searchParams.get('handle'),
        });
        res.setHeader('Content-Disposition', 'attachment; filename="bznsflow-export.json"');
        return json(res, 200, file.payload);
      }
      if (route === '/api/mcp/manage') {
        if (req.method !== 'GET' && req.method !== 'POST') throw new McpError('method', 405);
        if (req.headers.origin && req.headers.origin !== origin) throw new McpError('origin', 403);
        if (req.method === 'POST' && (req.headers.origin !== origin || !verifyCsrf(req)))
          throw new McpError('csrf', 403);
        const csrfToken = ensureCsrfToken(req, res);
        if (req.method === 'GET') {
          if (url.searchParams.get('interaction') === 'true') {
            const { view } = await interactionView(provider(), req, res);
            return json(res, 200, { ok: true, interaction: view, csrfToken });
          }
          const result = await store('manage', {
            operation: 'list',
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
        if (data.action === 'consent') {
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
        if (!['policy', 'revoke', 'approve', 'reject'].includes(data.action))
          throw new McpError('invalid_operation', 400);
        const result = await store('manage', {
          operation: data.action,
          tokenHash: tokenHash(req),
          connectionId: data.connectionId,
          ...(data.runId ? { runId: data.runId } : {}),
          ...(data.action === 'policy' ? { direct: data.direct, scopes: data.scopes, areas: data.areas } : {}),
        });
        return json(res, 200, { ok: true, ...result, csrfToken });
      }
      if (env.MCP_ENABLED !== 'true') throw new McpError('mcp_disabled', 503);
      if (route.startsWith('/oauth') || route === '/.well-known/oauth-authorization-server') {
        const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(
          ',',
        )[0];
        await store('rate', {
          key: `oauth:${createHash('sha256').update(ip).digest('hex')}`,
          max: 60,
          window: 60000,
        });
        if (route === '/oauth/reg' && req.method === 'POST') {
          await store('rate', {
            key: 'oauth:registration:global',
            max: 100,
            window: 3600000,
          });
          await store('rate', {
            key: `oauth:registration:${createHash('sha256').update(ip).digest('hex')}`,
            max: 10,
            window: 3600000,
          });
        }
        if (route === '/oauth/reg' && req.method === 'POST') {
          const metadata = await body(req);
          req.body = metadata;
          if (
            !clientMetadataAllowed(metadata) ||
            !Array.isArray(metadata.redirect_uris) ||
            !metadata.redirect_uris.length ||
            metadata.redirect_uris.length > 10 ||
            JSON.stringify(metadata).length > 16000
          )
            throw new McpError('invalid_client_metadata', 400);
          for (const uri of metadata.redirect_uris) {
            let u;
            try {
              u = new URL(uri);
            } catch {
              throw new McpError('invalid_redirect_uri', 400);
            }
            if (
              u.username ||
              u.password ||
              u.hash ||
              !(
                u.protocol === 'https:' ||
                (u.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(u.hostname))
              )
            )
              throw new McpError('invalid_redirect_uri', 400);
          }
        }
        const suffix = route.startsWith('/oauth') ? route.slice(6) : '/.well-known/oauth-authorization-server';
        url.searchParams.delete('mcpRoute');
        url.searchParams.delete('surface');
        req.originalUrl = `/oauth${suffix}${url.search}`;
        req.url = `${suffix || '/'}${url.search}`;
        return provider().callback()(req, res);
      }
      if (route !== '/api/mcp') throw new McpError('not_found', 404);
      // Origin is optional for native clients; any browser-supplied origin must be trusted.
      const allowedOrigins = new Set([origin, 'https://claude.ai', 'https://claude.com', 'https://chatgpt.com']);
      if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) throw new McpError('origin', 403);
      if (req.headers.origin) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Expose-Headers', 'WWW-Authenticate, MCP-Protocol-Version');
      }
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id',
        );
        res.setHeader('Access-Control-Allow-Methods', MCP_METHODS);
        res.statusCode = 204;
        return res.end();
      }
      // The MCP transport lets a stateless server refuse the optional GET stream with 405.
      // Accepting it held a function and a lease open until Vercel killed it at 60 s.
      if (req.method !== 'POST') {
        res.setHeader('Allow', MCP_METHODS);
        throw new McpError('method_not_allowed', 405);
      }
      const access = await accessToken(provider(), store, req, env);
      connectionId = access.connectionId;
      lease = randomUUID();
      const context = await store('admit', { connectionId, lease });
      const names = visibleTools(context.tools, {
        canWrite: access.scopes.includes('workspace:write'),
        emailOpen: rasilOpen(env, context.email),
      });
      const server = new Server(
        {
          name: 'bznsflow',
          title: MCP_NAME,
          description: MCP_DESCRIPTION,
          version: SERVER_VERSION,
          websiteUrl: origin,
          // Shown by clients next to the connector so the owner can recognise it.
          icons: mcpIcons(origin),
        },
        { capabilities: { tools: {} }, instructions: MCP_INSTRUCTIONS },
      );
      server.setRequestHandler(ListToolsRequestSchema, async request =>
        toolPage(names, request.params?.cursor || '0', origin),
      );
      server.setRequestHandler(CallToolRequestSchema, request =>
        callTool(request, { names, connectionId, env, store, execute, origin }),
      );
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      res.on('close', () => {
        void transport.close().catch(() => {});
        void server.close().catch(() => {});
      });
      // Counted from arrival, so token checks and admission share the same budget. After a
      // timeout the abandoned call may still settle; raceDeadline absorbs a late failure.
      await raceDeadline(
        transport.handleRequest(req, res, await body(req)),
        Math.max(1000, deadlineMs - (Date.now() - requestStarted)),
        'mcp',
      );
    } catch (error) {
      const status = error instanceof McpError ? error.status : 503;
      if (status === 401)
        res.setHeader(
          'WWW-Authenticate',
          `Bearer resource_metadata="${mcpOrigin(env)}/.well-known/oauth-protected-resource/api/mcp", scope="workspace:read workspace:write", error="invalid_token"`,
        );
      if (status === 429) res.setHeader('Retry-After', '60');
      if (error?.code === 'request_timeout' && !res.headersSent) {
        res.statusCode = 504;
        res.setHeader('Content-Type', 'application/json');
        return res.end(
          JSON.stringify({
            ok: false,
            reason: 'request_timeout',
            hint: 'The call took too long. Do not repeat a change; check bznsflow_requests_list or bznsflow_requests_status first.',
          }),
        );
      }
      if (!res.headersSent) json(res, status, { ok: false, reason: reason(error) });
    } finally {
      if (lease && connectionId) await store('release', { lease, connectionId }).catch(() => {});
    }
  };
}
export default createMcpHandler();
