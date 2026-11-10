// MCP tool handlers for the workspace domains that existed before the product tools:
// files, Hasib, dashboard, messaging, catalog, knowledge, BznsBrain and business.
// Each receives one call context and returns the domain's { ok, value | reason }.
import { createTransfer, transfer, contactCsv } from "../transfers.js";
import { executeHasib } from "../../hasib/hasibState.js";
import { hasibArgs } from "../../../api/_lib/hasib/validate.js";
import { executeAuthorizedDashboard } from "../../dashboardApplication.js";
import { executeMessaging } from "../../blueMessagingState.js";
import { executeCatalog } from "../../blueCatalogState.js";
import { executeBrain } from "../../brainState.js";
import { executeReview } from "../../reviewState.js";
import { executeKnowledgeForAccount } from "../../knowledgeSourceState.js";
import { prepareForPublish } from "../../../src/lib/bzns-doc.js";
import { demand } from "../access.js";

const INVITATION_TTL_MS = 86400000;
// Values the API may compute before a dashboard commit; anything else is refused.
const DASHBOARD_PREPARED = ["allowance", "templates", "integrationId", "scheduledAt", "timezone", "rows"];

async function files({ ctx, domainCtx, p, tool, args, base, now }) {
  if (tool.operation === "upload_contacts")
    return { ok: true, value: await createTransfer(ctx, p, "contacts", contactCsv(args.content, args.countryIso), now) };
  const file = await transfer(ctx, p, args.transferId, now);
  if (tool.operation === "read")
    return { ok: true, value: { kind: file.kind, data: file.payload, expiresAt: file.expiresAt } };
  demand(file.kind === "contacts", "invalid_transfer");
  return executeAuthorizedDashboard(domainCtx, {
    ...base,
    operation: "import_contacts",
    requestId: args.requestId,
    origin: "import",
    rows: file.payload.map(({ line, ...row }) => row),
    requireConsent: args.requireConsent,
    ...(args.consent ? { consent: args.consent } : {}),
  });
}

/** A browser-only step: the assistant gets the website path, nothing runs. */
function handoff({ tool }) {
  return { ok: true, value: { status: "website_required", path: tool.path, action: tool.operation } };
}

async function hasib({ ctx, domainCtx, p, tool, args, base, services, now, state, effects }) {
  const input = tool.operation === "overview" ? {} : hasibArgs(tool.operation, args);
  const result = await executeHasib(domainCtx, { ...input, ...base, operation: tool.operation }, now);
  if (!result.ok || !["team_invite", "team_resend"].includes(tool.operation)) return result;
  // Invitation email is a durable effect, sent by the worker after this commit.
  const effectId = await ctx.db.insert("mcpEffects", {
    accountId: p.account._id,
    connectionId: p.connection._id,
    runId: state.run._id,
    kind: "invitation",
    payload: result.value,
    status: "queued",
    attempts: 0,
    updatedAt: now,
    expiresAt: now + INVITATION_TTL_MS,
  });
  effects.push({ id: effectId, table: "mcpEffects" });
  if (services.effectFunction) await ctx.scheduler.runAfter(0, services.effectFunction, { effectId });
  return { ok: true, value: { ...result.value, invitationDelivery: "pending", effectId } };
}

function dashboard({ domainCtx, tool, args, base, prepared }) {
  demand(!Object.keys(prepared).some((k) => !DASHBOARD_PREPARED.includes(k)), "invalid_preparation");
  const { schedule: _schedule, ...rest } = args;
  return executeAuthorizedDashboard(domainCtx, {
    ...rest,
    ...prepared,
    ...base,
    operation: tool.operation === "sync_templates" ? "replace_templates" : tool.operation,
  });
}

function messaging({ domainCtx, tool, args, base, prepared, services, now }) {
  const operation = tool.operation === "check_connection" ? "state" : tool.operation;
  demand(operation !== "activate" || prepared.connectionVerified === true, "connection_not_ready");
  return executeMessaging(domainCtx, { ...args, ...base, operation, replyFunction: services.replyFunction }, now);
}

function catalog({ domainCtx, p, tool, args, now }) {
  const { requestId: _requestId, ...rest } = args;
  return executeCatalog(domainCtx, { ...rest, ownerKey: String(p.account._id), operation: tool.operation }, now);
}

function knowledge({ domainCtx, p, tool, args, now }) {
  return executeKnowledgeForAccount(domainCtx, { ...args, operation: tool.operation }, p.account._id, now);
}

/** Publishing BznsBrain publishes a changed bzns.md draft and the catalog, then settles. */
async function publishBrain({ domainCtx, p, args, base, now }) {
  const draft = p.row.bznsDraft;
  if (draft && draft.markdown !== p.row.bznsPublished?.markdown) {
    const published = await executeReview(
      domainCtx,
      {
        sessionHash: base.sessionHash,
        operation: "bzns_publish",
        markdown: prepareForPublish(draft.markdown).markdown,
        version: draft.version || 0,
      },
      now,
    );
    demand(published.ok, published.reason || "publish_failed");
  }
  if (args.catalog !== false) {
    const published = await executeCatalog(domainCtx, { ownerKey: String(p.account._id), operation: "publish" }, now);
    demand(published.ok, published.reason || "publish_failed");
  }
  return executeBrain(domainCtx, { sessionHash: base.sessionHash, operation: "settle_publish" }, now);
}

function brain(call) {
  const { domainCtx, tool, args, base, prepared, now } = call;
  if (tool.operation === "test") {
    demand(prepared.test, "test_unavailable");
    return { ok: true, value: prepared.test };
  }
  if (tool.operation === "publish") return publishBrain(call);
  const { requestId: _requestId, ...rest } = args;
  return executeBrain(domainCtx, { ...rest, sessionHash: base.sessionHash, operation: tool.operation }, now);
}

function business({ domainCtx, p, tool, args, base, now }) {
  if (tool.operation === "state")
    return {
      ok: true,
      value: {
        profile: p.row.profile,
        bznsDraft: p.row.bznsDraft,
        bznsPublished: p.row.bznsPublished,
        profileVersion: p.row.profileVersion,
      },
    };
  const { requestId: _requestId, ...rest } = args;
  const markdown = tool.operation === "bzns_publish" ? { markdown: prepareForPublish(rest.markdown).markdown } : {};
  return executeReview(domainCtx, { ...rest, ...markdown, sessionHash: base.sessionHash, operation: tool.operation }, now);
}

export const CORE_DOMAINS = { files, handoff, hasib, dashboard, messaging, catalog, knowledge, brain, business };
