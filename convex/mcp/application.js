import { canonical, publicResult } from "../../config/mcp/validation.js";
import { createTransfer } from "./transfers.js";
import { resolveRun, finish } from "./state.js";
import { requestStatus } from "./requests.js";
import { demand } from "./access.js";
import { CORE_DOMAINS } from "./domains/core.js";
import { PRODUCT_DOMAINS } from "./domains/product.js";

const DOMAINS = { ...CORE_DOMAINS, ...PRODUCT_DOMAINS };
// Tables whose new rows are external effects this MCP request started.
const TRACKED_EFFECTS = ["blueMessages", "blueCampaigns", "emailCampaigns"];

// All domain writes and their MCP receipt share a Convex transaction. Only newly
// queued effects are stamped; unrelated browser/automation work is never adopted.
function effectContext(ctx, connectionId, runId, effects) {
  return {
    ...ctx,
    db: new Proxy(ctx.db, {
      get(target, key) {
        if (key === "insert")
          return async (table, row) => {
            const tracked = TRACKED_EFFECTS.includes(table);
            const id = await target.insert(
              table,
              tracked
                ? {
                    ...row,
                    mcpConnectionId: connectionId,
                    ...(runId ? { mcpRunId: runId } : {}),
                  }
                : row,
            );
            if (tracked) effects.push({ id, table });
            return id;
          };
        const value = target[key];
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
  };
}

/** An approved export is turned into a protected transfer only if its data still matches the preview. */
async function exportTransfer(ctx, { p, tool, state, now }, result) {
  demand(
    canonical(publicResult(result.value)) === canonical(state.run.exportPreview),
    "approval_stale",
  );
  const handle = await createTransfer(ctx, p, "export", result.value, now, tool.capability, tool.area);
  return { ok: true, value: { ...handle, cursor: result.value?.cursor ?? null } };
}

export async function executeApplication(ctx, a, services = {}, now = Date.now()) {
  const state = await resolveRun(ctx, a, now);
  if (state.replay)
    return { ...(await requestStatus(ctx, state.p, state.run._id, now)), replay: true };
  const { p, tool } = state;
  // Handoffs are answered before their domain: nothing runs for a browser-only step.
  const handler = tool.disposition === "handoff" ? DOMAINS.handoff : DOMAINS[tool.domain];
  if (!handler) throw Error("tool_not_allowed");
  const effects = [];
  const call = {
    ctx,
    domainCtx: effectContext(ctx, p.connection._id, state.run?._id, effects),
    p,
    tool,
    args: { ...state.args },
    // Request ids identify the MCP call; only existing domain operations accepting
    // them receive them. Their own dedupe behavior remains in place as well.
    base: {
      sessionHash: p.account.draftHash,
      actorAccountId: p.account._id,
      hashSecret: process.env.CONVEX_SERVICE_SECRET,
      workerFunction: services.workerFunction,
    },
    prepared: a.prepared || {},
    services,
    now,
    state,
    effects,
  };
  let result = await handler(call);
  if (result?.ok && tool.category === "exports") result = await exportTransfer(ctx, call, result);
  return finish(ctx, state, result, now, effects);
}
