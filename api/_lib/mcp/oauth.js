import Provider from "oidc-provider";
import { parse as parseForm } from "node:querystring";
import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { mcpStore, McpError } from "./store.js";
import { parseCookies, appendCookie, serializeCookie } from "../cookies.js";
import { hashAccountToken } from "../blue-auth.js";
export const tokenHash = (req) =>
  hashAccountToken(parseCookies(req).bf_session || "");
export function mcpOrigin(env = process.env) {
  const u = new URL(env.PUBLIC_SITE_ORIGIN || "https://www.bznsflowai.com");
  if (
    u.protocol !== "https:" &&
    !(env.NODE_ENV === "test" && u.hostname === "127.0.0.1")
  )
    throw new McpError("invalid_mcp_origin", 503);
  return u.origin;
}
export function protectedMetadata(env = process.env) {
  const origin = mcpOrigin(env);
  return {
    resource: `${origin}/api/mcp`,
    authorization_servers: [`${origin}/oauth`],
    scopes_supported: ["workspace:read", "workspace:write"],
    bearer_methods_supported: ["header"],
    resource_name: "BznsFlow",
  };
}
const hash = (v) => createHash("sha256").update(v).digest("hex");
export function oauthAdapter(store, secret) {
  if (!/^[a-f0-9]{64}$/i.test(secret || ""))
    throw new McpError("mcp_oauth_not_configured", 503);
  const key = Buffer.from(secret, "hex");
  function seal(model, id, value) {
    const iv = randomBytes(12),
      c = createCipheriv("aes-256-gcm", key, iv);
    c.setAAD(Buffer.from(`${model}:${id}`));
    const bytes = Buffer.concat([c.update(JSON.stringify(value)), c.final()]);
    return [
      iv.toString("base64url"),
      c.getAuthTag().toString("base64url"),
      bytes.toString("base64url"),
    ].join(".");
  }
  function open(model, id, value) {
    const [iv, tag, bytes] = value
      .split(".")
      .map((x) => Buffer.from(x, "base64url"));
    const c = createDecipheriv("aes-256-gcm", key, iv);
    c.setAAD(Buffer.from(`${model}:${id}`));
    c.setAuthTag(tag);
    return JSON.parse(Buffer.concat([c.update(bytes), c.final()]).toString());
  }
  return class ConvexOAuthAdapter {
    constructor(model) {
      this.model = model;
    }
    async upsert(id, payload, expiresIn) {
      const k = hash(id);
      return store("oauth", {
        action: "upsert",
        model: this.model,
        key: k,
        payload: seal(this.model, k, payload),
        expiresAt:
          Date.now() +
          Math.min(
            expiresIn || 30 * 86400,
            this.model === "Client" ? 365 * 86400 : 30 * 86400,
          ) *
            1000,
        ...(payload.grantId ? { grantId: hash(payload.grantId) } : {}),
        ...(payload.uid ? { uid: hash(payload.uid) } : {}),
      });
    }
    async find(id) {
      const k = hash(id),
        r = await store("oauth", { action: "find", model: this.model, key: k });
      return r
        ? {
            ...open(this.model, k, r.payload),
            ...(r.consumedAt
              ? { consumed: Math.floor(r.consumedAt / 1000) }
              : {}),
          }
        : undefined;
    }
    async findByUid(uid) {
      const r = await store("oauth", {
        action: "find_uid",
        model: this.model,
        key: hash(uid),
        uid: hash(uid),
      });
      return r
        ? {
            ...open(this.model, r.key, r.payload),
            ...(r.consumedAt
              ? { consumed: Math.floor(r.consumedAt / 1000) }
              : {}),
          }
        : undefined;
    }
    async destroy(id) {
      await store("oauth", {
        action: "destroy",
        model: this.model,
        key: hash(id),
      });
    }
    async consume(id) {
      await store("oauth", {
        action: "consume",
        model: this.model,
        key: hash(id),
      });
    }
    async revokeByGrantId(grantId) {
      await store("oauth", {
        action: "revoke_grant",
        model: this.model,
        key: hash(grantId),
        grantId: hash(grantId),
      });
    }
  };
}
export function clientMetadataAllowed(metadata) {
  const uris = metadata.redirect_uris || metadata.redirectUris;
  if (!Array.isArray(uris) || !uris.length || uris.length > 10) return false;
  const grants = metadata.grant_types ||
    metadata.grantTypes || ["authorization_code", "refresh_token"];
  const responses = metadata.response_types ||
    metadata.responseTypes || ["code"];
  if (
    !Array.isArray(grants) ||
    grants.some((v) => !["authorization_code", "refresh_token"].includes(v)) ||
    !Array.isArray(responses) ||
    responses.some((v) => v !== "code")
  )
    return false;
  return uris.every((uri) => {
    try {
      const u = new URL(uri);
      return (
        !u.username &&
        !u.password &&
        !u.hash &&
        (u.protocol === "https:" ||
          (u.protocol === "http:" &&
            ["127.0.0.1", "[::1]", "localhost"].includes(u.hostname)))
      );
    } catch {
      return false;
    }
  });
}
// Same cap oidc-provider applies when it reads the body itself.
const TOKEN_BODY_LIMIT = 56 * 1024;
async function tokenForm(req) {
  if (!req.readable)
    return typeof req.body === "string" ? parseForm(req.body) : { ...req.body };
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > TOKEN_BODY_LIMIT) throw new McpError("request_too_large", 413);
    chunks.push(chunk);
  }
  return parseForm(Buffer.concat(chunks).toString("utf8"));
}
// Clients may resend a broader scope on refresh: Codex adds `openid` after
// `mcp login --scopes workspace:read,workspace:write`. Drop scopes the presented
// refresh token does not hold; never add any. With no overlap the request is
// left unchanged and oidc-provider still answers invalid_scope.
export async function narrowRefreshScope(provider, ctx) {
  const form = await tokenForm(ctx.req);
  ctx.req.body = form;
  if (
    form.grant_type !== "refresh_token" ||
    typeof form.scope !== "string" ||
    typeof form.refresh_token !== "string"
  )
    return;
  const token = await provider.RefreshToken.find(form.refresh_token).catch(
    () => undefined,
  );
  if (!token) return;
  const requested = form.scope.split(" ").filter(Boolean),
    held = requested.filter((s) => token.scopes.has(s));
  if (held.length && held.length < requested.length)
    ctx.req.body = { ...form, scope: held.join(" ") };
}
export function createOAuth({
  env = process.env,
  store = mcpStore({ env }),
} = {}) {
  const origin = mcpOrigin(env),
    resource = `${origin}/api/mcp`;
  const cookieKeys = (env.MCP_COOKIE_KEYS || "")
    .split(",")
    .filter((k) => k.length >= 32);
  if (!env.MCP_OAUTH_JWKS && env.NODE_ENV !== "test")
    throw new McpError("mcp_oauth_not_configured", 503);
  if (!cookieKeys.length) throw new McpError("mcp_oauth_not_configured", 503);
  const allowed = new Set([
    "https://claude.ai",
    "https://claude.com",
    "https://chatgpt.com",
  ]);
  const provider = new Provider(`${origin}/oauth`, {
    adapter: oauthAdapter(store, env.MCP_OAUTH_ENCRYPTION_KEY),
    ...(env.MCP_OAUTH_JWKS ? { jwks: JSON.parse(env.MCP_OAUTH_JWKS) } : {}),
    cookies: {
      keys: cookieKeys,
      names: {
        session: "bf_mcp_session",
        interaction: "bf_mcp_interaction",
        resume: "bf_mcp_auth_resume",
      },
      long: {
        httpOnly: true,
        sameSite: "lax",
        secure: origin.startsWith("https:"),
      },
      short: {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: origin.startsWith("https:"),
      },
    },
    features: {
      devInteractions: { enabled: false },
      registration: { enabled: true },
      revocation: { enabled: true },
      userinfo: { enabled: false },
      clientIdMetadataDocument: {
        enabled: true,
        ack: "draft-02",
        allowFetch: (_ctx, id) => {
          try {
            const u = new URL(id);
            return (
              allowed.has(u.origin) &&
              !u.username &&
              !u.password &&
              !u.search &&
              !u.hash
            );
          } catch {
            return false;
          }
        },
        allowClient: (_ctx, client) => clientMetadataAllowed(client),
      },
      resourceIndicators: {
        enabled: true,
        getResourceServerInfo: (_ctx, url) => {
          if (url !== resource) throw new McpError("invalid_resource", 400);
          return {
            scope: "workspace:read workspace:write",
            audience: resource,
            accessTokenFormat: "opaque",
            accessTokenTTL: 900,
          };
        },
      },
    },
    clientDefaults: {
      // OAuth CIMD clients omit OIDC's application_type. Native defaults permit
      // ephemeral loopback ports (RFC 8252) while HTTPS redirects remain exact.
      application_type: "native",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    pkce: { required: () => true, methods: ["S256"] },
    rotateRefreshToken: true,
    issueRefreshToken: async (_ctx, client, source) =>
      client.grantTypeAllowed("refresh_token") &&
      source.scopes.has("workspace:read"),
    ttl: {
      IdToken: 900,
      AccessToken: 900,
      AuthorizationCode: 300,
      RefreshToken: (_ctx, token) =>
        Math.max(
          1,
          Math.min(
            30 * 86400,
            30 * 86400 +
              (token.iiat || token.iat || Math.floor(Date.now() / 1000)) -
              Math.floor(Date.now() / 1000),
          ),
        ),
      Grant: 30 * 86400,
      Session: 30 * 86400,
      Interaction: 900,
    },
    scopes: ["openid", "offline_access", "workspace:read", "workspace:write"],
    interactions: {
      url: (ctx, interaction) => {
        ctx.cookies.set("bf_mcp_resume", interaction.uid, {
          httpOnly: true,
          sameSite: "lax",
          secure: origin.startsWith("https:"),
          path: "/",
          maxAge: 900000,
        });
        return `${origin}/mcp?interaction=${encodeURIComponent(interaction.uid)}`;
      },
    },
    findAccount: async (_ctx, id) => ({
      accountId: id,
      claims: async () => ({ sub: id }),
    }),
    renderError: async (ctx) => {
      ctx.type = "html";
      ctx.body =
        '<!doctype html><html lang="en"><title>Connection could not be completed</title><p>Connection could not be completed. Return to BznsFlow and try again.</p></html>';
    },
  });
  provider.proxy = true;
  provider.use(async (ctx, next) => {
    if (
      ctx.method === "POST" &&
      ctx.path === "/token" &&
      ctx.is("application/x-www-form-urlencoded")
    )
      await narrowRefreshScope(provider, ctx);
    return next();
  });
  return provider;
}
export async function accessToken(provider, store, req, env) {
  const match = /^Bearer ([A-Za-z0-9._~-]{20,4096})$/.exec(
    req.headers.authorization || "",
  );
  if (!match) throw new McpError("invalid_token", 401);
  const token = await provider.AccessToken.find(match[1]);
  if (
    !token ||
    token.isExpired ||
    !token.grantId ||
    !token.accountId ||
    token.aud !== `${mcpOrigin(env)}/api/mcp` ||
    !(token.scope || "").split(" ").includes("workspace:read")
  )
    throw new McpError("invalid_token", 401);
  const p = await store("grant_context", {
    grantId: hash(token.grantId),
    accountId: token.accountId,
    clientId: token.clientId,
  });
  return {
    connectionId: p.connectionId,
    scopes: (token.scope || "").split(" "),
  };
}
export async function interactionView(provider, req, res) {
  let interaction;
  try {
    interaction = await provider.interactionDetails(req, res);
  } catch (error) {
    if (error.name === "SessionNotFound") {
      appendCookie(
        res,
        serializeCookie("bf_mcp_resume", "", { maxAge: 0, httpOnly: true }),
      );
      throw new McpError("authorization_expired", 410);
    }
    throw error;
  }
  const client = await provider.Client.find(interaction.params.client_id);
  return {
    interaction,
    client,
    view: {
      uid: interaction.uid,
      clientName: String(client.clientName || "AI assistant").slice(0, 120),
      clientId: client.clientId,
      scopes: String(interaction.params.scope || "workspace:read")
        .split(" ")
        .filter((s) => ["workspace:read", "workspace:write"].includes(s)),
    },
  };
}
export async function completeInteraction(
  provider,
  store,
  req,
  res,
  allow,
  areas,
  interactionUid,
) {
  const { interaction, client, view } = await interactionView(
    provider,
    req,
    res,
  );
  if (interaction.uid !== interactionUid)
    throw new McpError("authorization_changed", 409);
  // One owner decision finishes the request: the page never shows it again.
  appendCookie(
    res,
    serializeCookie("bf_mcp_resume", "", { maxAge: 0, httpOnly: true }),
  );
  if (!allow) {
    return provider.interactionResult(
      req,
      res,
      { error: "access_denied", error_description: "Owner declined access" },
      { mergeWithLastSubmission: false },
    );
  }
  const identity = await store("browser_identity", {
    tokenHash: tokenHash(req),
    fresh: true,
  });
  // The owner signs in and grants access with the same click, so the login
  // and consent prompts are answered together rather than as two pages.
  const signingIn = interaction.prompt.name === "login";
  if (!signingIn && interaction.session?.accountId !== identity.accountId)
    throw new McpError("account_changed", 409);
  const connection = await store("manage", {
    operation: "connect",
    tokenHash: tokenHash(req),
    clientId: client.clientId,
    clientName: view.clientName,
    ...(areas ? { areas } : {}),
    scopes: [...new Set(["workspace:read", ...view.scopes])],
  });
  const grant = new provider.Grant({
    accountId: identity.accountId,
    clientId: client.clientId,
  });
  grant.addOIDCScope(
    String(interaction.params.scope || "")
      .split(" ")
      .filter((s) =>
        [
          "openid",
          "offline_access",
          "workspace:read",
          "workspace:write",
        ].includes(s),
      )
      .join(" "),
  );
  grant.addResourceScope(
    `${new URL(provider.issuer).origin}/api/mcp`,
    view.scopes.join(" ") || "workspace:read",
  );
  const grantId = await grant.save();
  await store("bind_grant", {
    connectionId: connection.id,
    accountId: identity.accountId,
    grantId: hash(grantId),
  });
  return provider.interactionResult(
    req,
    res,
    {
      ...(signingIn
        ? { login: { accountId: identity.accountId, remember: true } }
        : {}),
      consent: { grantId },
    },
    { mergeWithLastSubmission: !signingIn },
  );
}
