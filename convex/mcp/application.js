import { canonical, publicResult } from "../../config/mcp/validation.js";
import { createTransfer, transfer, contactCsv } from "./transfers.js";
import { executeHasib } from "../hasib/hasibState.js";
import { hasibArgs } from "../../api/_lib/hasib/validate.js";
import { executeAuthorizedDashboard } from "../dashboardApplication.js";
import { executeMessaging } from "../blueMessagingState.js";
import { executeCatalog } from "../blueCatalogState.js";
import { executeBrain } from "../brainState.js";
import { executeReview } from "../reviewState.js";
import { executeKnowledgeForAccount } from "../knowledgeSourceState.js";
import { prepareForPublish } from "../../src/lib/bzns-doc.js";
import { resolveRun, finish, requestStatus } from "./state.js";
import { demand } from "./access.js";

// All domain writes and their MCP receipt share a Convex transaction. Only newly
// queued effects are stamped; unrelated browser/automation work is never adopted.
function effectContext(ctx, connectionId, runId, effects) {
  return {
    ...ctx,
    db: new Proxy(ctx.db, {
      get(target, key) {
        if (key === "insert")
          return async (table, row) => {
            const tracked = ["blueMessages", "blueCampaigns"].includes(table);
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
export async function executeApplication(
  ctx,
  a,
  services = {},
  now = Date.now(),
) {
  const state = await resolveRun(ctx, a, now);
  if (state.replay)
    return {
      ...(await requestStatus(ctx, state.p, state.run._id, now)),
      replay: true,
    };
  const { p, tool } = state,
    args = { ...state.args };
  // Request ids identify the MCP call; only existing domain operations accepting
  // them receive them. Their own dedupe behavior remains in place as well.
  const sessionHash = p.account.draftHash,
    actorAccountId = p.account._id;
  const effects = [];
  const domainCtx = effectContext(
    ctx,
    p.connection._id,
    state.run?._id,
    effects,
  );
  const base = {
    sessionHash,
    actorAccountId,
    hashSecret: process.env.CONVEX_SERVICE_SECRET,
    workerFunction: services.workerFunction,
  };
  let result;
  if (tool.domain === "requests")
    result = { ok: true, value: await requestStatus(ctx, p, args.runId, now) };
  else if (tool.domain === "files" && tool.disposition === "tool") {
    if (tool.operation === "upload_contacts")
      result = {
        ok: true,
        value: await createTransfer(
          ctx,
          p,
          "contacts",
          contactCsv(args.content, args.countryIso),
          now,
        ),
      };
    else {
      const file = await transfer(ctx, p, args.transferId, now);
      if (tool.operation === "read")
        result = {
          ok: true,
          value: {
            kind: file.kind,
            data: file.payload,
            expiresAt: file.expiresAt,
          },
        };
      else {
        demand(file.kind === "contacts", "invalid_transfer");
        result = await executeAuthorizedDashboard(domainCtx, {
          ...base,
          operation: "import_contacts",
          requestId: args.requestId,
          origin: "import",
          rows: file.payload.map(({ line, ...row }) => row),
          requireConsent: args.requireConsent,
          ...(args.consent ? { consent: args.consent } : {}),
        });
      }
    }
  } else if (tool.disposition === "handoff")
    result = {
      ok: true,
      value: {
        status: "website_required",
        path: tool.path,
        action: tool.operation,
      },
    };
  else if (tool.domain === "hasib") {
    const input =
      tool.operation === "overview" ? {} : hasibArgs(tool.operation, args);
    result = await executeHasib(
      domainCtx,
      { ...input, ...base, operation: tool.operation },
      now,
    );
    if (result.ok && ["team_invite", "team_resend"].includes(tool.operation)) {
      const effectId = await ctx.db.insert("mcpEffects", {
        accountId: p.account._id,
        connectionId: p.connection._id,
        runId: state.run._id,
        kind: "invitation",
        payload: result.value,
        status: "queued",
        attempts: 0,
        updatedAt: now,
        expiresAt: now + 86400000,
      });
      effects.push({ id: effectId, table: "mcpEffects" });
      if (services.effectFunction)
        await ctx.scheduler.runAfter(0, services.effectFunction, { effectId });
      result = {
        ok: true,
        value: { ...result.value, invitationDelivery: "pending", effectId },
      };
    }
  } else if (tool.domain === "dashboard") {
    const prepared = a.prepared || {};
    demand(
      !Object.keys(prepared).some(
        (k) =>
          ![
            "allowance",
            "templates",
            "integrationId",
            "scheduledAt",
            "timezone",
            "rows",
          ].includes(k),
      ),
      "invalid_preparation",
    );
    const operation =
      tool.operation === "sync_templates"
        ? "replace_templates"
        : tool.operation;
    delete args.schedule;
    result = await executeAuthorizedDashboard(domainCtx, {
      ...args,
      ...prepared,
      ...base,
      operation,
    });
  } else if (tool.domain === "messaging") {
    const operation =
      tool.operation === "check_connection" ? "state" : tool.operation;
    demand(
      operation !== "activate" || a.prepared?.connectionVerified === true,
      "connection_not_ready",
    );
    result = await executeMessaging(
      domainCtx,
      { ...args, ...base, operation, replyFunction: services.replyFunction },
      now,
    );
  } else if (tool.domain === "catalog") {
    delete args.requestId;
    result = await executeCatalog(
      domainCtx,
      { ...args, ownerKey: String(p.account._id), operation: tool.operation },
      now,
    );
  } else if (tool.domain === "knowledge")
    result = await executeKnowledgeForAccount(
      domainCtx,
      { ...args, operation: tool.operation },
      p.account._id,
      now,
    );
  else if (tool.domain === "brain") {
    delete args.requestId;
    if (tool.operation === "test") {
      demand(a.prepared?.test, "test_unavailable");
      result = { ok: true, value: a.prepared.test };
    } else if (tool.operation === "publish") {
      const draft = p.row.bznsDraft;
      if (draft && draft.markdown !== p.row.bznsPublished?.markdown) {
        const published = await executeReview(
          domainCtx,
          {
            sessionHash,
            operation: "bzns_publish",
            markdown: prepareForPublish(draft.markdown).markdown,
            version: draft.version || 0,
          },
          now,
        );
        demand(published.ok, published.reason || "publish_failed");
      }
      if (args.catalog !== false) {
        const catalog = await executeCatalog(
          domainCtx,
          { ownerKey: String(p.account._id), operation: "publish" },
          now,
        );
        demand(catalog.ok, catalog.reason || "publish_failed");
      }
      result = await executeBrain(
        domainCtx,
        { sessionHash, operation: "settle_publish" },
        now,
      );
    } else
      result = await executeBrain(
        domainCtx,
        { ...args, sessionHash, operation: tool.operation },
        now,
      );
  } else if (tool.domain === "business") {
    if (tool.operation === "state")
      result = {
        ok: true,
        value: {
          profile: p.row.profile,
          bznsDraft: p.row.bznsDraft,
          bznsPublished: p.row.bznsPublished,
          profileVersion: p.row.profileVersion,
        },
      };
    else {
      delete args.requestId;
      if (tool.operation === "bzns_publish")
        args.markdown = prepareForPublish(args.markdown).markdown;
      result = await executeReview(
        domainCtx,
        { ...args, sessionHash, operation: tool.operation },
        now,
      );
    }
  } else throw Error("tool_not_allowed");
  if (result?.ok && tool.category === "exports") {
    demand(
      canonical(publicResult(result.value)) ===
        canonical(state.run.exportPreview),
      "approval_stale",
    );
    result = {
      ok: true,
      value: {
        ...(await createTransfer(
          ctx,
          p,
          "export",
          result.value,
          now,
          tool.capability,
          tool.area,
        )),
        cursor: result.value?.cursor ?? null,
      },
    };
  }
  return finish(ctx, state, result, now, effects);
}
