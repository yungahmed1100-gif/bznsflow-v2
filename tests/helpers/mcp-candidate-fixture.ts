// Candidate-only fixture. Copy to convex/mcpAcceptance.ts in an isolated archive,
// then remove it and redeploy before handing off the candidate. Never ship to Green.
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
export const fixture = internalMutation({
  args: { operation: v.string(), input: v.any() },
  handler: async (ctx, { operation, input }) => {
    if (
      process.env.MCP_ACCEPTANCE_FIXTURES !== "true" ||
      process.env.MCP_PILOT_EMAIL !== "mcp-synthetic@example.com"
    )
      throw Error("fixture_disabled");
    const now = Date.now();
    if (operation === "seed") {
      if (await ctx.db.query("accounts").first())
        throw Error("fixture_already_seeded");
      const seed = async (
        email: string,
        tokenHash: string,
        draftHash: string,
      ) => {
        const accountId = await ctx.db.insert("accounts", {
          email,
          role: "customer",
          name: "MCP Synthetic",
          profileComplete: true,
          createdAt: now,
          draftHash,
        });
        const grantId = await ctx.db.insert("blueAccessGrants", {
          email,
          plan: "ascend",
          status: "active",
          grantedAt: now,
          grantedBy: "fixture@example.com",
        });
        const rowId = await ctx.db.insert("blueReviewSessions", {
          accountId,
          sessionHash: draftHash,
          expiresAt: now + 86400000,
          status: "connected",
          profile: {
            businessName: "MCP Synthetic",
            sector: "Real estate",
            services: "Synthetic service",
            prices: "From 500 OMR",
            hours: "9–5",
            location: "Muscat",
            humanContact: "fixture@example.com",
            reviewed: true,
          },
          profileVersion: 1,
          checkedAt: now,
          connectionChecks: { routing: true, registered: true, path: true },
          integration: {
            id: draftHash,
            app: "1111",
            waba: "2222",
            phone: "3333",
            sender: "96890000000",
            path: "new_number",
            credential: {
              v: 1,
              iv: "synthetic",
              data: "synthetic",
              tag: "synthetic",
            },
          },
          phone: "3333",
          waba: "2222",
          createdAt: now,
          updatedAt: now,
          attempts: 0,
        });
        const sessionId = await ctx.db.insert("sessions", {
          accountId,
          tokenHash,
          createdAt: now,
          expiresAt: now + 86400000,
        });
        return { accountId, rowId, sessionId, grantId };
      };
      const owner = await seed(
        "mcp-synthetic@example.com",
        input.ownerHash,
        "1".repeat(64),
      );
      const foreign = await seed(
        "mcp-foreign@example.com",
        input.foreignHash,
        "2".repeat(64),
      );
      const employee = await seed(
        "mcp-employee@example.com",
        input.employeeHash,
        "3".repeat(64),
      );
      const workspaceId = await ctx.db.insert("ascendWorkspaces", {
        managerAccountId: owner.accountId,
        employeeLimit: 10,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("ascendWorkspaceMembers", {
        workspaceId,
        accountId: employee.accountId,
        email: "mcp-employee@example.com",
        status: "active",
        invitedAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("blueMessagingSettings", {
        key: "hasib",
        enabled: true,
      });
      // No messaging rollout, providers, credentials or outbound transport is enabled.
      return { owner, foreign, employee };
    }
    if (operation === "touch_profile") {
      const row = await ctx.db.get(input.rowId);
      if (!row || !("profileVersion" in row)) throw Error("fixture_record");
      await ctx.db.patch(row._id, {
        profileVersion: (row.profileVersion || 1) + 1,
        updatedAt: now,
      });
    } else if (operation === "set_plan") {
      await ctx.db.patch(input.grantId, {
        plan: input.plan,
        status: input.status || "active",
      });
    } else if (operation === "expire_connection") {
      await ctx.db.patch(input.connectionId, { expiresAt: now - 1 });
    } else if (operation === "expire_run") {
      await ctx.db.patch(input.runId, { expiresAt: now - 1 });
    } else if (operation === "refresh_session") {
      await ctx.db.patch(input.sessionId, {
        createdAt: now,
        expiresAt: now + 86400000,
      });
    } else if (operation === "disable_hasib") {
      const row = await ctx.db
        .query("blueMessagingSettings")
        .withIndex("by_key", (q) => q.eq("key", "hasib"))
        .unique();
      if (row) await ctx.db.patch(row._id, { enabled: !input.disabled });
    } else throw Error("fixture_operation");
    return null;
  },
});
