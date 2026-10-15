import { randomUUID } from "node:crypto";
import { aiTurn } from "../../../config/layla-ai.js";
import { qwenGenerator } from "../../../config/qwen-client.js";
import { previewOutcome } from "../../../config/brain-preview.js";
import { credentialContext, openToken } from "../layla/customer-meta.js";
import {
  fetchApprovedTemplates,
  fetchMessagingAllowance,
} from "../layla/templates.js";
import { inspectReviewConnection } from "../layla/review-api.js";
import { verifyInstagram } from "../layla/blue-messaging.js";
import { instagramStore } from "../convex.js";
import { validTimezone, zonedLocalToUtc } from "../layla/timezone.js";
import { importRows } from "../layla/dashboard-api.js";
import {
  whatsappMessagingEnabled,
  instagramMessagingEnabled,
  broadcastMessagingEnabled,
} from "../green-config.js";
import { TOOL_BY_NAME } from "../../../config/mcp/contracts.js";
import { McpError, mcpStore } from "./store.js";
import { mcpOrigin } from "./oauth.js";
export function runtimeGate(tool, args, env) {
  if (env.MCP_ENABLED !== "true") throw new McpError("mcp_disabled", 503);
  if (env.BLUE_DASHBOARD_ENABLED === "false")
    throw new McpError("dashboard_unavailable", 503);
  if (tool.domain === "hasib" && env.BLUE_HASIB_ENABLED === "false")
    throw new McpError("hasib_unavailable", 503);
  if (
    tool.domain === "messaging" &&
    ["activate", "manual_reply"].includes(tool.operation) &&
    args.channel !== "defer" &&
    !(args.channel === "instagram"
      ? instagramMessagingEnabled(env)
      : whatsappMessagingEnabled(env))
  )
    throw new McpError("messaging_unavailable", 503);
  if (
    tool.domain === "dashboard" &&
    ["campaign_create", "campaign_cancel"].includes(tool.operation) &&
    !broadcastMessagingEnabled(env)
  )
    throw new McpError("broadcast_unavailable", 503);
}
export async function runTool({
  connectionId,
  tool: name,
  args = {},
  env = process.env,
  store = mcpStore({ env }),
  fetcher = fetch,
  generate = qwenGenerator(env, fetcher),
}) {
  const tool = TOOL_BY_NAME.get(name);
  if (!tool) throw new McpError("tool_not_allowed", 403);
  runtimeGate(
    tool,
    tool.operation === "manual_reply" ? { ...args, channel: "defer" } : args,
    env,
  );
  const preparedRun = await store("prepare", {
    connectionId,
    tool: name,
    args,
  });
  if (preparedRun.status === "approval_required")
    return {
      ...preparedRun,
      approvalUrl: `${mcpOrigin(env)}/mcp?approval=${encodeURIComponent(preparedRun.runId)}`,
      message:
        "Review this exact action in BznsFlow. After approval, retry the same tool and requestId.",
    };
  if (!["ready", "approved"].includes(preparedRun.status))
    return preparedRun.runId &&
      ["completed", "pending", "failed", "outcome_unknown"].includes(
        preparedRun.status,
      )
      ? store("run", { connectionId, tool: name, runId: preparedRun.runId })
      : preparedRun;
  const input = {
    connectionId,
    tool: name,
    args,
    ...(preparedRun.runId ? { runId: preparedRun.runId } : {}),
  };
  let prepared = {};
  if (tool.domain === "messaging" && tool.operation === "manual_reply") {
    const context = await store("run_context", input);
    runtimeGate(tool, { ...args, channel: context.channel }, env);
  }
  if (tool.service) {
    const context = await store("run_context", input);
    if (context.replay) return store("run", input);
    const row = context.row,
      callArgs = context.args;
    if (tool.domain === "brain" && tool.operation === "test") {
      const latest = callArgs.history
        .filter((h) => h.role === "customer")
        .at(-1)
        ?.text?.trim();
      if (!latest) throw new McpError("invalid_text", 400);
      const test = await store("brain_test_context", input),
        turn = await aiTurn(test.context, generate);
      const outcome = previewOutcome(test.sim, turn, {
        sectorId: test.sectorId,
        catalog: test.context.catalog || [],
        reception: test.reception,
        latest,
      });
      prepared = {
        test: {
          variant: test.variant,
          reply: turn.reply,
          noReply: !!turn.noReply,
          intent: turn.intent,
          needsTeam: !!turn.needsTeam,
          sources: turn.sources || [],
          fallback: turn.ai?.fallback || null,
          captured: outcome.captured,
          sim: outcome.sim,
        },
      };
    } else if (tool.domain === "dashboard") {
      if (!row.integration || !["connected", "paused"].includes(row.status))
        throw new McpError("connection_not_ready");
      const token = openToken(
          row.integration.credential,
          credentialContext(row.sessionHash, row.integration),
          env,
        ),
        c = {
          app: "1388038082832745",
          version: "v25.0",
          secret: env.LAYLA_META_APP_SECRET,
        };
      if (tool.operation === "sync_templates")
        prepared = {
          integrationId: row.integration.id,
          templates: await fetchApprovedTemplates({
            c,
            integration: row.integration,
            token,
            fetcher,
          }),
        };
      else {
        const allowance = await fetchMessagingAllowance({
          c,
          integration: row.integration,
          token,
          fetcher,
        });
        prepared = {
          allowance: Number.isFinite(allowance)
            ? Math.min(allowance, 1e9)
            : 1e9,
        };
        if (tool.operation === "campaign_create") {
          const schedule = callArgs.schedule;
          if (!validTimezone(schedule.timezone))
            throw new McpError("invalid_timezone", 400);
          prepared.timezone = schedule.timezone;
          prepared.scheduledAt =
            schedule.mode === "later"
              ? zonedLocalToUtc(schedule.local, schedule.timezone)
              : Date.now();
        }
      }
    } else if (tool.domain === "messaging") {
      if (callArgs.channel === "instagram") {
        await verifyInstagram({
          sessionHash: row.sessionHash,
          env,
          fetcher,
          instagram: instagramStore({ env, fetcher }),
        });
        prepared = { connectionVerified: true };
      } else {
        if (!row.integration) throw new McpError("connection_not_ready");
        const fresh =
          tool.operation === "activate" &&
          Date.now() - (row.checkedAt || 0) < 5000 &&
          row.connectionChecks?.routing &&
          row.connectionChecks?.registered &&
          row.connectionChecks?.path;
        if (fresh) prepared = { connectionVerified: true };
        else {
          const operationId = randomUUID();
          await store("provider_refresh_claim", { ...input, operationId });
          try {
            const token = openToken(
              row.integration.credential,
              credentialContext(row.sessionHash, row.integration),
              env,
            );
            const proof = await inspectReviewConnection({
              c: {
                app: row.integration.app,
                version: "v25.0",
                secret: env.LAYLA_META_APP_SECRET,
              },
              integration: row.integration,
              token,
              fetcher,
            });
            if (!proof.connected) throw new McpError("connection_not_ready");
            prepared = {
              operationId,
              connectionVerified: true,
              connectionChecks: {
                routing: !!proof.isolated,
                registered: !!proof.registered,
                path: !!proof.pathVerified,
                nameStatus: proof.nameStatus || "UNKNOWN",
              },
            };
            await store("provider_refresh_complete", {
              ...input,
              operationId,
              connectionChecks: prepared.connectionChecks,
            });
            prepared = { connectionVerified: true };
          } catch (error) {
            await store("provider_refresh_failure", {
              ...input,
              operationId,
            }).catch(() => {});
            throw error;
          }
        }
      }
    }
  }
  if (tool.domain === "dashboard" && tool.operation === "import_contacts")
    prepared.rows = importRows(args.rows);
  try {
    return await store("run", { ...input, prepared });
  } catch (error) {
    if (input.runId && error.status === 503)
      return {
        status: "outcome_unknown",
        runId: input.runId,
        message:
          "The commit could not be confirmed. Retry this exact request and idempotency key to recover its durable outcome.",
      };
    if (input.runId && /^[a-z_]{3,60}$/.test(error.code || ""))
      await store("run_failure", {
        connectionId,
        runId: input.runId,
        reason: error.code,
      }).catch(() => {});
    throw error;
  }
}
