import { parseDelimited } from "../../src/lib/dashboard/csv.js";
import {
  normalizePhone,
  isMobileNumber,
} from "../../src/lib/dashboard/phone.js";
import { demand } from "./access.js";
import {
  publicResult,
  canonical,
  encodedSize,
} from "../../config/mcp/validation.js";
export async function transfer(ctx, p, id, now = Date.now()) {
  const row = await ctx.db.get(id);
  demand(
    row &&
      row.accountId === p.account._id &&
      row.connectionId === p.connection._id &&
      row.expiresAt > now,
    "transfer_expired",
  );
  demand(
    p.capabilities[row.capability] &&
      p.connection.areas.includes("files") &&
      p.connection.areas.includes(row.sourceArea) &&
      p.connection.scopes.includes("workspace:write"),
    "access_required",
  );
  return row;
}
export async function createTransfer(
  ctx,
  p,
  kind,
  payload,
  now = Date.now(),
  capability = "imports",
  sourceArea = "customers",
) {
  const active = await ctx.db
    .query("mcpTransfers")
    .withIndex("by_connection_expiry", (q) =>
      q.eq("connectionId", p.connection._id).gt("expiresAt", now),
    )
    .take(20);
  demand(active.length < 20, "transfer_limit");
  const clean = publicResult(payload);
  demand(encodedSize(clean) <= 450000, "transfer_too_large");
  const id = await ctx.db.insert("mcpTransfers", {
    accountId: p.account._id,
    connectionId: p.connection._id,
    kind,
    capability,
    sourceArea,
    payload: clean,
    createdAt: now,
    expiresAt: now + 15 * 60000,
  });
  return {
    transferId: id,
    kind,
    expiresAt: now + 15 * 60000,
    downloadPath: `/api/mcp/transfer?handle=${encodeURIComponent(id)}`,
  };
}
export function contactCsv(content, countryIso = "") {
  demand(
    typeof content === "string" && content.length <= 100000,
    "invalid_import",
  );
  const records = parseDelimited(content, { maxRows: 101 });
  demand(records.length > 1 && records.length <= 101, "invalid_import");
  const headers = records.shift().map((v) => v.toLowerCase());
  demand(
    headers.includes("phone") &&
      headers.every((v) => ["phone", "name", "country"].includes(v)) &&
      new Set(headers).size === headers.length,
    "invalid_csv_headers",
  );
  const index = (key) => headers.indexOf(key);
  return records.map((row, i) => {
    demand(row.length === headers.length, "invalid_csv_row");
    const phone = normalizePhone(
      row[index("phone")],
      row[index("country")] || countryIso,
    );
    demand(
      !phone.error && isMobileNumber(phone.waId) !== false,
      "invalid_phone",
    );
    const name = row[index("name")] || "";
    demand(name.length <= 80, "invalid_contact_name");
    return { ...phone, ...(name ? { name } : {}), line: i + 2 };
  });
}
