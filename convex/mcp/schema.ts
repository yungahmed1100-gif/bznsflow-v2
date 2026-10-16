import { defineTable } from "convex/server";
import { v } from "convex/values";
export const mcpTables = {
  mcpTransfers: defineTable({
    accountId: v.id("accounts"),
    connectionId: v.id("mcpConnections"),
    kind: v.string(),
    capability: v.string(),
    sourceArea: v.string(),
    payload: v.any(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_connection_expiry", ["connectionId", "expiresAt"])
    .index("by_expiry", ["expiresAt"]),
  mcpOAuth: defineTable({
    model: v.string(),
    key: v.string(),
    payload: v.string(),
    grantId: v.optional(v.string()),
    uid: v.optional(v.string()),
    consumedAt: v.optional(v.number()),
    expiresAt: v.number(),
  })
    .index("by_key", ["model", "key"])
    .index("by_grant", ["grantId"])
    .index("by_uid", ["model", "uid"])
    .index("by_expiry", ["expiresAt"]),
  mcpConnections: defineTable({
    accountId: v.id("accounts"),
    grantId: v.optional(v.string()),
    clientId: v.string(),
    clientName: v.string(),
    scopes: v.array(v.string()),
    grantedScopes: v.array(v.string()),
    areas: v.array(v.string()),
    direct: v.array(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    version: v.number(),
  })
    .index("by_grant", ["grantId"])
    .index("by_account_active", ["accountId", "revokedAt", "expiresAt"])
    .index("by_account", ["accountId"])
    .index("by_expiry", ["expiresAt"]),
  mcpRuns: defineTable({
    connectionId: v.id("mcpConnections"),
    accountId: v.id("accounts"),
    requestId: v.string(),
    tool: v.string(),
    fingerprint: v.string(),
    args: v.optional(v.any()),
    snapshot: v.string(),
    exportPreview: v.optional(v.any()),
    preview: v.optional(v.any()),
    status: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    approvedAt: v.optional(v.number()),
    result: v.optional(v.any()),
    reason: v.optional(v.string()),
    effects: v.optional(
      v.array(v.object({ id: v.string(), table: v.string() })),
    ),
    finishedAt: v.optional(v.number()),
  })
    .index("by_request", ["connectionId", "requestId"])
    .index("by_connection", ["connectionId", "createdAt"])
    .index("by_account_status", ["accountId", "status", "createdAt"])
    .index("by_expiry", ["expiresAt"]),
  mcpAudit: defineTable({
    accountId: v.id("accounts"),
    connectionId: v.optional(v.id("mcpConnections")),
    tool: v.string(),
    status: v.string(),
    at: v.number(),
    durationMs: v.optional(v.number()),
    runId: v.optional(v.id("mcpRuns")),
    expiresAt: v.number(),
  })
    .index("by_account", ["accountId", "at"])
    .index("by_expiry", ["expiresAt"]),
  mcpLimits: defineTable({
    key: v.string(),
    count: v.number(),
    expiresAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_expiry", ["expiresAt"]),
  mcpLeases: defineTable({
    key: v.string(),
    connectionId: v.id("mcpConnections"),
    expiresAt: v.number(),
  })
    .index("by_connection", ["connectionId"])
    .index("by_key", ["key"])
    .index("by_expiry", ["expiresAt"]),
  mcpEffects: defineTable({
    connectionId: v.id("mcpConnections"),
    accountId: v.id("accounts"),
    runId: v.id("mcpRuns"),
    kind: v.literal("invitation"),
    payload: v.any(),
    status: v.string(),
    attempts: v.number(),
    providerId: v.optional(v.string()),
    expiresAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_connection", ["connectionId"])
    .index("by_expiry", ["expiresAt"]),
};
