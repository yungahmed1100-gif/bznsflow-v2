import { TOOL_BY_NAME } from "../../config/mcp/contracts.js";
import { hasibEnabled } from "../hasib/gate.js";
import { planFor, HASIB_PLANS } from "../hasib/plans.js";
import { capabilitiesFor } from "../hasib/capabilities.js";
import { isLivePack } from "../../config/hasib-packs.js";
import { settingsFor, packFor } from "../hasib/shared.js";
export const lookup = (ctx, table, index, key, value) =>
  ctx.db
    .query(table)
    .withIndex(index, (q) => q.eq(key, value))
    .unique();
export function demand(condition, reason) {
  if (!condition) throw Error(reason);
}
export async function owner(ctx, accountId, now = Date.now()) {
  const account = await ctx.db.get(accountId);
  demand(account, "sign_in_required");
  const member = await lookup(
    ctx,
    "ascendWorkspaceMembers",
    "by_account",
    "accountId",
    accountId,
  );
  demand(member?.status !== "active", "manager_required");
  const plan = await planFor(ctx, accountId);
  demand(["catalyst", "ascend", "apex"].includes(plan), "access_required");
  const row = account.draftHash
    ? await lookup(
        ctx,
        "blueReviewSessions",
        "by_hash",
        "sessionHash",
        account.draftHash,
      )
    : null;
  demand(row?.accountId === accountId && row.expiresAt > now, "setup_required");
  const settings = await settingsFor(ctx, accountId);
  const pack = await packFor(ctx, { accountId, row });
  const hasibAvailable =
    HASIB_PLANS.includes(plan) && (await hasibEnabled(ctx));
  return {
    account,
    row,
    settings,
    plan,
    hasibAvailable,
    packId: pack?.id,
    capabilities: capabilitiesFor(plan, "manager"),
  };
}
export async function browserOwner(
  ctx,
  tokenHash,
  now = Date.now(),
  fresh = false,
) {
  demand(/^[a-f0-9]{64}$/.test(tokenHash || ""), "sign_in_required");
  const session = await lookup(
    ctx,
    "sessions",
    "by_token_hash",
    "tokenHash",
    tokenHash,
  );
  demand(session && session.expiresAt > now, "sign_in_required");
  if (fresh)
    demand(session.createdAt > now - 5 * 60000, "fresh_sign_in_required");
  return { ...(await owner(ctx, session.accountId, now)), session };
}
export async function connectionOwner(ctx, connectionId, now = Date.now()) {
  demand(process.env.MCP_ENABLED === "true", "mcp_disabled");
  const connection = await ctx.db.get(connectionId);
  demand(
    connection && !connection.revokedAt && connection.expiresAt > now,
    "connection_revoked",
  );
  const principal = await owner(ctx, connection.accountId, now);
  const pilot = process.env.MCP_PILOT_EMAIL;
  demand(
    !pilot || principal.account.email.toLowerCase() === pilot.toLowerCase(),
    "mcp_pilot_only",
  );
  return { ...principal, connection };
}
export function toolAllowed(tool, p) {
  return (
    tool &&
    (!tool.area || p.connection.areas?.includes(tool.area)) &&
    (tool.requiredAreas || []).every((a) => p.connection.areas?.includes(a)) &&
    tool.disposition !== "unavailable" &&
    p.capabilities[tool.capability] &&
    (!tool.packs || tool.packs.includes(p.packId)) &&
    (tool.domain !== "hasib" || (p.hasibAvailable && isLivePack(p.packId))) &&
    (tool.category === "read" ||
      p.connection.scopes.includes("workspace:write"))
  );
}
export async function mcpEffectAllowed(ctx, record, now = Date.now()) {
  if (!record?.mcpConnectionId) return true;
  try {
    const p = await connectionOwner(ctx, record.mcpConnectionId, now);
    if (
      p.account._id !== record.accountId ||
      !p.connection.scopes.includes("workspace:write")
    )
      return false;
    if (record.mcpRunId) {
      const run = await ctx.db.get(record.mcpRunId);
      return !!run && toolAllowed(TOOL_BY_NAME.get(run.tool), p);
    }
    return true;
  } catch {
    return false;
  }
}
