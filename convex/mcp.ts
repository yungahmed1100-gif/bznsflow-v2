import { executeReview } from "./reviewState.js";
import { TOOL_BY_NAME } from "../config/mcp/contracts.js";
import { executeBrain } from "./brainState.js";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { manage, prepare, admit, rate, resolveRun } from "./mcp/state.js";
import { executeApplication } from "./mcp/application.js";
import { transfer } from "./mcp/transfers.js";
import {
  connectionOwner,
  mcpEffectAllowed,
  browserOwner,
  lookup,
  demand,
} from "./mcp/access.js";
const data = v.any();
export const execute = internalMutation({
  args: { operation: v.string(), input: data },
  handler: async (ctx, { operation, input }): Promise<any> => {
    const now = Date.now();
    if (operation === "run_failure") {
      const p = await connectionOwner(ctx, input.connectionId, now);
      const run = await ctx.db.get(ctx.db.normalizeId("mcpRuns", input.runId)!);
      demand(
        run &&
          run.connectionId === p.connection._id &&
          /^[a-z_]{3,60}$/.test(input.reason),
        "run_not_found",
      );
      if (run && ["ready", "approved"].includes(run.status))
        await ctx.db.patch(run._id, {
          status: "failed",
          reason: input.reason,
          args: undefined,
          exportPreview: undefined,
          finishedAt: now,
          expiresAt: now + 30 * 86400000,
        });
      return null;
    }
    if (operation === "metric") {
      const c = await ctx.db.get(
        ctx.db.normalizeId("mcpConnections", input.connectionId)!,
      );
      demand(
        c &&
          TOOL_BY_NAME.has(input.tool) &&
          /^[a-z_]{3,60}$/.test(input.status),
        "invalid_metric",
      );
      await ctx.db.insert("mcpAudit", {
        accountId: c!.accountId,
        connectionId: c!._id,
        tool: input.tool,
        status: input.status,
        durationMs: Math.max(0, Math.min(60000, Number(input.durationMs) || 0)),
        at: now,
        expiresAt: now + 30 * 86400000,
      });
      return null;
    }
    if (operation === "manage") return manage(ctx, input, now);
    if (operation === "prepare") return prepare(ctx, input, now);
    if (operation === "admit") return admit(ctx, input, now);
    if (operation === "release") {
      const lease = await lookup(
        ctx,
        "mcpLeases",
        "by_key",
        "key",
        input.lease,
      );
      if (lease && lease.connectionId === input.connectionId)
        await ctx.db.delete(lease._id);
      return null;
    }
    if (
      operation === "provider_refresh_claim" ||
      operation === "provider_refresh_failure" ||
      operation === "provider_refresh_complete"
    ) {
      const s = await resolveRun(ctx, input, now);
      demand(
        s.tool.domain === "messaging" &&
          ["activate", "check_connection"].includes(s.tool.operation),
        "tool_not_allowed",
      );
      const args =
        operation === "provider_refresh_claim"
          ? {
              operation: "claim_operation",
              operationId: input.operationId,
              effect: "refresh",
            }
          : {
              operation: "result",
              operationId: input.operationId,
              status:
                operation === "provider_refresh_complete"
                  ? "connected"
                  : "reconciliation_required",
              ...(operation === "provider_refresh_complete"
                ? { connectionChecks: input.connectionChecks }
                : {}),
            };
      const result = await executeReview(
        ctx,
        { ...args, sessionHash: s.p.account.draftHash },
        now,
      );
      if ("reason" in result)
        throw Error(result.reason || "connection_not_ready");
      return null;
    }
    if (operation === "brain_test_context") {
      const s = await resolveRun(ctx, input, now);
      demand(
        s.tool.domain === "brain" && s.tool.operation === "test",
        "tool_not_allowed",
      );
      const r = await executeBrain(
        ctx,
        {
          ...s.args,
          sessionHash: s.p.account.draftHash,
          operation: "test_context",
        },
        now,
      );
      if ("reason" in r) throw Error(r.reason || "test_unavailable");
      return r.value;
    }
    if (operation === "context") {
      const p = await connectionOwner(ctx, input.connectionId, now);
      return { ...p, accountId: p.account._id };
    }
    if (operation === "run_context") {
      const s = await resolveRun(ctx, input, now);
      let channel = s.args?.channel || "whatsapp";
      if (s.args?.conversationId) {
        const person = await ctx.db.get(
          ctx.db.normalizeId("blueConversations", s.args.conversationId)!,
        );
        demand(person?.accountId === s.p.account._id, "foreign_record");
        channel = person?.channel || "whatsapp";
      }
      return {
        channel,
        ...{
          accountId: s.p.account._id,
          row: s.p.row,
          args: s.args,
          tool: s.tool.name,
          replay: !!s.replay,
        },
      };
    }
    if (operation === "run")
      return executeApplication(
        ctx,
        input,
        {
          workerFunction: internal.blueMessaging.dispatch,
          replyFunction: internal.blueMessaging.respond,
          effectFunction: (internal as any).mcp.dispatchEffect,
        },
        now,
      );
    if (operation === "oauth") {
      const { model, key, action } = input;
      demand(
        typeof model === "string" &&
          model.length < 80 &&
          typeof key === "string" &&
          key.length <= 128,
        "invalid_oauth_record",
      );
      const row = await ctx.db
        .query("mcpOAuth")
        .withIndex("by_key", (q) => q.eq("model", model).eq("key", key))
        .unique();
      if (action === "find")
        return row && row.expiresAt > now
          ? { payload: row.payload, consumedAt: row.consumedAt }
          : null;
      if (action === "find_uid") {
        const r = await ctx.db
          .query("mcpOAuth")
          .withIndex("by_uid", (q) => q.eq("model", model).eq("uid", input.uid))
          .unique();
        return r && r.expiresAt > now
          ? { key: r.key, payload: r.payload, consumedAt: r.consumedAt }
          : null;
      }
      if (action === "upsert") {
        demand(
          typeof input.payload === "string" && input.payload.length < 100000,
          "invalid_oauth_record",
        );
        const value = {
          model,
          key,
          payload: input.payload,
          expiresAt: Math.min(
            input.expiresAt,
            now + (model === "Client" ? 365 : 30) * 86400000,
          ),
          ...(input.grantId ? { grantId: input.grantId } : {}),
          ...(input.uid ? { uid: input.uid } : {}),
        };
        if (row) await ctx.db.patch(row._id, value);
        else await ctx.db.insert("mcpOAuth", value);
        return null;
      }
      if (action === "consume") {
        demand(row && row.expiresAt > now && !row.consumedAt, "oauth_replay");
        await ctx.db.patch(row!._id, { consumedAt: now });
        return null;
      }
      if (action === "destroy") {
        if (row) await ctx.db.delete(row._id);
        return null;
      }
      if (action === "revoke_grant") {
        const grant = await ctx.db
          .query("mcpOAuth")
          .withIndex("by_key", (q) =>
            q.eq("model", "Grant").eq("key", input.grantId),
          )
          .unique();
        if (grant) await ctx.db.delete(grant._id);
        const connection = await ctx.db
          .query("mcpConnections")
          .withIndex("by_grant", (q) => q.eq("grantId", input.grantId))
          .unique();
        if (connection && !connection.revokedAt)
          await ctx.db.patch(connection._id, {
            revokedAt: now,
            version: connection.version + 1,
          });

        const rows = await ctx.db
          .query("mcpOAuth")
          .withIndex("by_grant", (q) => q.eq("grantId", input.grantId))
          .take(1000);
        for (const r of rows) await ctx.db.delete(r._id);
        return null;
      }
    }
    if (operation === "bind_grant") {
      const p = await connectionOwner(ctx, input.connectionId, now);
      demand(
        p.account._id === input.accountId && !p.connection.grantId,
        "invalid_grant",
      );
      await ctx.db.patch(p.connection._id, { grantId: input.grantId });
      return null;
    }
    if (operation === "grant_context") {
      const c = await lookup(
        ctx,
        "mcpConnections",
        "by_grant",
        "grantId",
        input.grantId,
      );
      demand(
        c && c.accountId === input.accountId && c.clientId === input.clientId,
        "invalid_token",
      );
      await connectionOwner(ctx, c._id, now);
      return { connectionId: c._id };
    }
    if (operation === "transfer_download") {
      const p = await browserOwner(ctx, input.tokenHash, now);
      const row = await ctx.db.get(
        ctx.db.normalizeId("mcpTransfers", input.transferId)!,
      );
      demand(row && row.accountId === p.account._id, "transfer_expired");
      const linked = await connectionOwner(ctx, row!.connectionId, now);
      return transfer(ctx, linked, input.transferId, now);
    }
    if (operation === "browser_identity") {
      const p = await browserOwner(ctx, input.tokenHash, now, !!input.fresh);
      return { accountId: p.account._id, email: p.account.email, plan: p.plan };
    }
    if (operation === "rate") {
      await rate(ctx, input.key, input.max, now, input.window);
      return null;
    }
    if (operation === "effect_claim") {
      const row = await ctx.db.get(
        ctx.db.normalizeId("mcpEffects", input.effectId)!,
      );
      if (!row) throw Error("effect_missing");
      demand(row && row.kind === "invitation", "effect_missing");
      if (row.status !== "queued") return null;
      try {
        demand(
          await mcpEffectAllowed(
            ctx,
            { ...row, mcpConnectionId: row.connectionId, mcpRunId: row.runId },
            now,
          ),
          "connection_revoked",
        );
        const member = await ctx.db.get(
          ctx.db.normalizeId("ascendWorkspaceMembers", row.payload.id)!,
        );
        demand(
          member?.status === "pending" && member.email === row.payload.email,
          "invitation_cancelled",
        );
      } catch {
        await ctx.db.patch(row._id, { status: "cancelled", updatedAt: now });
        return null;
      }
      await ctx.db.patch(row._id, {
        status: "attempting",
        attempts: row.attempts + 1,
        updatedAt: now,
      });
      return row;
    }
    if (operation === "effect_result") {
      const row = await ctx.db.get(
        ctx.db.normalizeId("mcpEffects", input.effectId)!,
      );
      if (!row) throw Error("effect_missing");
      demand(row && row.status === "attempting", "effect_missing");
      demand(
        ["submitted", "failed", "outcome_unknown"].includes(input.status),
        "invalid_status",
      );
      await ctx.db.patch(row._id, { status: input.status, updatedAt: now });
      return null;
    }
    throw Error("invalid_operation");
  },
});
export const dispatchEffect = internalAction({
  args: { effectId: v.id("mcpEffects") },
  handler: async (_ctx, args) => {
    const origin =
        process.env.PUBLIC_SITE_ORIGIN || "https://www.bznsflowai.com",
      secret = process.env.MCP_WORKER_SECRET;
    if (!secret) throw Error("mcp_worker_not_configured");
    const r = await fetch(new URL("/api/mcp/worker", origin), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (!r.ok) throw Error("mcp_effect_failed");
  },
});
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let more = false;
    for (const table of [
      "mcpTransfers",
      "mcpOAuth",
      "mcpRuns",
      "mcpAudit",
      "mcpLeases",
      "mcpLimits",
      "mcpEffects",
    ] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
        .take(100);
      if (rows.length === 100) more = true;
      for (const row of rows) await ctx.db.delete(row._id);
    }
    const oldConnections = await ctx.db
      .query("mcpConnections")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now - 30 * 86400000))
      .take(100);
    for (const connection of oldConnections)
      await ctx.db.delete(connection._id);
    if (more || oldConnections.length === 100)
      await ctx.scheduler.runAfter(1000, (internal as any).mcp.cleanup, {});
  },
});
