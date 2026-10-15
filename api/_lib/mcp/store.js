import { convexEndpoints, convexServiceSecret } from "../green-config.js";
export class McpError extends Error {
  constructor(code, status = 409) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export function mcpStore({ env = process.env, fetcher = fetch } = {}) {
  return async (operation, input = {}) => {
    const { site } = convexEndpoints(env);
    let r;
    try {
      r = await fetcher(`${site}/mcp-internal`, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${convexServiceSecret(env)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operation, input }),
      });
    } catch {
      throw new McpError("mcp_unavailable", 503);
    }
    if (!r.ok) throw new McpError("mcp_unavailable", 503);
    const body = await r.json();
    if (!body.ok) {
      const reason = /^[a-z_]{3,60}$/.test(body.reason || "")
        ? body.reason
        : "mcp_unavailable";
      throw new McpError(
        reason,
        ["sign_in_required", "connection_revoked", "invalid_token"].includes(
          reason,
        )
          ? 401
          : reason.includes("limited")
            ? 429
            : [
                  "manager_required",
                  "access_required",
                  "tool_not_allowed",
                  "mcp_pilot_only",
                ].includes(reason)
              ? 403
              : reason === "mcp_unavailable"
                ? 503
                : 409,
      );
    }
    return body.value;
  };
}
