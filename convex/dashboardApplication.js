import { executeDashboard } from "./blueDashboardState.js";
import { executeAudience } from "./blueAudienceState.js";
import { executeCampaigns } from "./blueCampaignState.js";
import { resolveTenant } from "./blueTenant.js";
import { planFor } from "./hasib/plans.js";
import { effectivePlan, capabilitiesFor } from "./hasib/capabilities.js";
import { actorWorkspace } from "./hasib/workspaceState.js";
import {
  dashboardGate,
  CAMPAIGN_OPERATIONS as CAMPAIGNS,
} from "./blueDashboardGate.js";
export async function executeAuthorizedDashboard(ctx, args) {
  const a = { ...args, hashSecret: process.env.CONVEX_SERVICE_SECRET };
  const tenant = await resolveTenant(ctx, args.sessionHash, Date.now());
  if (tenant.error) return { ok: false, reason: tenant.error };
  const rawPlan = await planFor(ctx, tenant.accountId),
    capabilities = capabilitiesFor(effectivePlan(rawPlan));
  if (!rawPlan) return { ok: false, reason: "access_required" };
  const actor = rawPlan
    ? await actorWorkspace(
        ctx,
        tenant.accountId,
        args.actorAccountId,
        Date.now(),
      )
    : { role: "manager" };
  if (!actor) return { ok: false, reason: "workspace_access_revoked" };
  const refused = dashboardGate(args.operation, capabilities, actor.role);
  if (refused) return { ok: false, reason: refused };
  if (args.operation === "import_contacts") return executeAudience(ctx, a);
  if (CAMPAIGNS.includes(args.operation)) return executeCampaigns(ctx, a);
  return executeDashboard(ctx, a);
}
