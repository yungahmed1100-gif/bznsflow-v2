// The life of a request after it is prepared: its status (with delivery receipts for
// queued messages and campaigns), this connection's request list, and cancellation.
import { TOOL_BY_NAME } from "../../config/mcp/contracts.js";
import { demand, toolAllowed } from "./access.js";
import { audit } from "./audit.js";

const PENDING_EFFECTS = new Set([
  "queued", "pending", "scheduled", "starting", "processing", "attempting",
  "submitted", "sending", "sent",
]);
const FAILED_EFFECTS = new Set(["failed", "blocked", "cancelled", "bounced"]);
// A complaint is reported after delivery; it is a delivered email marked as spam.
const COMPLETED_EFFECTS = new Set(["completed", "delivered", "read", "complained"]);
function effectOutcome(statuses) {
  if (statuses.some(status =>
    !PENDING_EFFECTS.has(status) && !FAILED_EFFECTS.has(status) && !COMPLETED_EFFECTS.has(status)
  )) return "outcome_unknown";
  if (statuses.some(status => PENDING_EFFECTS.has(status))) return "pending";
  if (statuses.some(status => FAILED_EFFECTS.has(status))) return "failed";
  return "completed";
}

async function campaignOutcome(ctx, campaign) {
  // Campaigns admit at most 100 recipients. Read one extra to detect drift,
  // rather than reporting success from a truncated or expired receipt set.
  const recipients = await ctx.db.query("blueCampaignRecipients")
    .withIndex("by_campaign_status", q => q.eq("campaignId", campaign._id))
    .take(101);
  const counts = Object.fromEntries([...new Set(recipients.map(r => r.status))]
    .map(status => [status, recipients.filter(r => r.status === status).length]));
  const completeEvidence = Number.isInteger(campaign.recipientCount) &&
    campaign.recipientCount > 0 && campaign.recipientCount <= 100 &&
    recipients.length === campaign.recipientCount;
  // "completed" means the worker has no more attempts, not that Meta delivered.
  const statuses = recipients.map(r => r.status);
  if (campaign.status !== "completed") statuses.push(campaign.status);
  return {
    status: completeEvidence ? effectOutcome(statuses) : "outcome_unknown",
    processingStatus: campaign.status,
    counts,
  };
}

// Email campaigns reach up to 2,000 people, so their receipts are the campaign's own counts.
function emailCampaignOutcome(campaign) {
  const counts = campaign.counts || {};
  const statuses = Object.keys(counts).filter((k) => counts[k] > 0);
  const total = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  if (campaign.status !== "completed") statuses.push(campaign.status);
  return {
    status: total === campaign.recipientCount ? effectOutcome(statuses) : "outcome_unknown",
    processingStatus: campaign.status,
    counts,
  };
}
export async function requestStatus(ctx, p, runId, now = Date.now()) {
  let run;
  try {
    run = await ctx.db.get(runId);
  } catch {
    run = null;
  }
  demand(
    run &&
      run.connectionId === p.connection._id &&
      run.accountId === p.account._id,
    "run_not_found",
  );
  if (run.expiresAt <= now) {
    // Waiting approvals expire in 15 minutes but stay readable until cleanup.
    demand(["approval_required", "approved", "ready"].includes(run.status), "run_not_found");
    return {
      runId: run._id,
      tool: run.tool,
      status: "approval_expired",
      reason: null,
      result: null,
      effects: [],
      expiresAt: run.expiresAt,
      next: NEXT.approval_expired,
    };
  }
  demand(toolAllowed(TOOL_BY_NAME.get(run.tool), p), "tool_not_allowed");
  const effects = [];
  for (const ref of run.effects || []) {
    const row = await ctx.db.get(ref.id);
    const status =
      row?.status === "attempting" &&
      ref.table === "mcpEffects" &&
      row.updatedAt < now - 65000
        ? "outcome_unknown"
        : row?.status || "outcome_unknown";
    effects.push({
      id: ref.id,
      kind:
        ref.table === "blueMessages"
          ? "message"
          : ref.table === "blueCampaigns"
            ? "campaign"
            : ref.table === "emailCampaigns"
              ? "email_campaign"
              : "invitation",
      status,
      ...(row && ref.table === "blueCampaigns" ? await campaignOutcome(ctx, row) : {}),
      ...(row && ref.table === "emailCampaigns" ? emailCampaignOutcome(row) : {}),
      reason: row?.reason || null,
    });
  }
  let status = run.status;
  if (effects.length) status = effectOutcome(effects.map(e => e.status));
  return {
    runId: run._id,
    tool: run.tool,
    reason: run.reason || null,
    status,
    result: run.result ?? null,
    effects,
    expiresAt: run.expiresAt,
    ...(NEXT[status] ? { next: NEXT[status] } : {}),
  };
}
const NEXT = {
  approval_required: "Waiting for the owner to approve it on the BznsFlow website.",
  approved: "Approved. Retry the same tool with the same arguments and requestId now.",
  ready: "Prepared. Retry the same tool with the same arguments and requestId to run it.",
  pending: "Accepted and queued. Delivery is not confirmed yet; check again later.",
  outcome_unknown: "The result could not be confirmed. Do not repeat the action; ask the owner to check the workspace.",
  approval_expired: "The approval window passed. Prepare a new request with a new requestId.",
  rejected: "The owner rejected it. Do not retry.",
  cancelled: "Cancelled. Nothing ran.",
};
const LISTED_STATUSES = ["approval_required", "approved", "ready", "pending", "completed", "failed", "outcome_unknown", "rejected", "cancelled"];
/** This connection's recent requests, newest first, without their stored arguments. */
export async function listRequests(ctx, p, args, now = Date.now()) {
  demand(!args.status || LISTED_STATUSES.includes(args.status), "invalid_arguments");
  const limit = Math.min(50, args.limit || 20);
  const rows = await ctx.db
    .query("mcpRuns")
    .withIndex("by_connection", (q) => q.eq("connectionId", p.connection._id))
    .order("desc")
    .take(200);
  const items = [];
  for (const run of rows) {
    if (args.status && run.status !== args.status) continue;
    const expired = run.expiresAt <= now && ["approval_required", "approved", "ready"].includes(run.status);
    if (run.expiresAt <= now && !expired) continue;
    const status = expired ? "approval_expired" : run.status;
    items.push({
      runId: run._id,
      tool: run.tool,
      status,
      createdAt: run.createdAt,
      expiresAt: run.expiresAt,
      ...(NEXT[status] ? { next: NEXT[status] } : {}),
    });
    if (items.length >= limit) break;
  }
  return { items };
}
/** Withdraw one of this connection's own requests that has not run. */
export async function cancelRequest(ctx, p, runId, now = Date.now()) {
  let run;
  try {
    run = await ctx.db.get(runId);
  } catch {
    run = null;
  }
  demand(run && run.connectionId === p.connection._id && run.accountId === p.account._id, "run_not_found");
  if (run.status === "cancelled") return { runId: run._id, status: "cancelled", replay: true };
  demand(["approval_required", "approved", "ready"].includes(run.status), "request_not_cancellable");
  await ctx.db.patch(run._id, { status: "cancelled", args: undefined, exportPreview: undefined, finishedAt: now });
  await audit(ctx, p, run.tool, "cancelled", now, run._id);
  return { runId: run._id, status: "cancelled", tool: run.tool };
}
