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
    if (operation === "rebind") {
      // Re-attach fresh browser sessions to an already seeded candidate when the
      // previous run's session file (kept outside Git) is gone.
      const accounts = await ctx.db.query("accounts").collect();
      const bind = async (email: string, tokenHash: string) => {
        const account = accounts.find((a) => a.email === email);
        if (!account || !/^[a-f0-9]{64}$/.test(tokenHash))
          throw Error("fixture_record");
        const grant = await ctx.db
          .query("blueAccessGrants")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first();
        const row = (await ctx.db.query("blueReviewSessions").collect()).find(
          (r) => r.accountId === account._id,
        );
        if (!grant || !row) throw Error("fixture_record");
        const sessionId = await ctx.db.insert("sessions", {
          accountId: account._id,
          tokenHash,
          createdAt: now,
          expiresAt: now + 86400000,
        });
        return {
          accountId: account._id,
          rowId: row._id,
          sessionId,
          grantId: grant._id,
        };
      };
      return {
        owner: await bind("mcp-synthetic@example.com", input.ownerHash),
        foreign: await bind("mcp-foreign@example.com", input.foreignHash),
        employee: await bind("mcp-employee@example.com", input.employeeHash),
      };
    }
    if (operation === "reset_oauth") {
      // OAuth rows sealed with a previous candidate key can no longer be opened.
      const rows = await ctx.db.query("mcpOAuth").collect();
      for (const row of rows) await ctx.db.delete(row._id);
      return rows.length;
    }
    if (operation === "limits") {
      // Synthetic-only setup for exact boundary checks; never present in Green.
      for (const [key, count] of Object.entries(input.counts || {})) {
        if (!/^(connection|workspace):/.test(key)) throw Error("fixture_key");
        const row = await ctx.db
          .query("mcpLimits")
          .withIndex("by_key", (q) => q.eq("key", key))
          .unique();
        const value = { key, count: Number(count), expiresAt: now + 60000 };
        if (row) await ctx.db.patch(row._id, value);
        else await ctx.db.insert("mcpLimits", value);
      }
    } else if (operation === "expire_access_tokens") {
      const rows = await ctx.db.query("mcpOAuth").collect();
      let count = 0;
      for (const row of rows)
        if (row.model === "AccessToken" && row.expiresAt > now) {
          await ctx.db.patch(row._id, { expiresAt: now - 1 });
          count++;
        }
      return count;
    } else if (operation === "queued_effect") {
      const connectionId = ctx.db.normalizeId(
        "mcpConnections",
        input.connectionId,
      );
      const runId = ctx.db.normalizeId("mcpRuns", input.runId);
      if (!connectionId || !runId) throw Error("fixture_record");
      const connection = await ctx.db.get(connectionId);
      const run = await ctx.db.get(runId);
      if (
        !connection ||
        !run ||
        !("accountId" in connection) ||
        !("connectionId" in run) ||
        run.connectionId !== connection._id
      )
        throw Error("fixture_record");
      return ctx.db.insert("mcpEffects", {
        connectionId: input.connectionId,
        accountId: connection.accountId,
        runId: input.runId,
        kind: "invitation",
        payload: { email: "synthetic@example.invalid" },
        status: "queued",
        attempts: 0,
        expiresAt: now + 86400000,
        updatedAt: now,
      });
    } else if (operation === "effect_status") {
      const effectId = ctx.db.normalizeId("mcpEffects", input.effectId);
      if (!effectId) throw Error("fixture_record");
      const row = await ctx.db.get(effectId);
      if (!row || !("attempts" in row)) throw Error("fixture_record");
      return { status: row.status, attempts: row.attempts };
    } else if (operation === "touch_profile") {
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
