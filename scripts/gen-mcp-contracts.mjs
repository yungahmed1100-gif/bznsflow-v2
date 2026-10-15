import { writeFileSync, readFileSync } from "node:fs";
import { hasibEntryArgs } from "../convex/hasib/entryArgs.js";
import { hasibInputFields } from "../api/_lib/hasib/validate.js";
import { HASIB_OPERATIONS } from "../convex/hasib/hasibState.js";
export function schema(v) {
  if (v.type === "object")
    return {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(v.value).map(([k, f]) => [k, schema(f.fieldType)]),
      ),
      required: Object.entries(v.value)
        .filter(([, f]) => !f.optional)
        .map(([k]) => k),
      additionalProperties: false,
    };
  if (v.type === "union") return { anyOf: v.value.map(schema) };
  if (v.type === "array")
    return { type: "array", items: schema(v.value), maxItems: 500 };
  if (v.type === "literal") return { const: v.value };
  if (v.type === "id" || v.type === "string")
    return { type: "string", maxLength: 100000 };
  if (v.type === "number") return { type: "number" };
  if (["boolean", "null"].includes(v.type)) return { type: v.type };
  throw Error(`unsupported_validator:${v.type}`);
}
const fields = Object.fromEntries(
  Object.entries(hasibEntryArgs)
    .filter(
      ([k]) =>
        ![
          "operation",
          "sessionHash",
          "actorAccountId",
          "photoCheck",
          "packId",
        ].includes(k),
    )
    .map(([k, v]) => [k, schema(v.json)]),
);
const operations = Object.fromEntries(
  [...HASIB_OPERATIONS]
    .sort()
    .map((op) => [op, hasibInputFields(op).filter((k) => k in fields)]),
);
const output =
  "// Generated from the existing Hasib validators. Run npm run gen:mcp.\nexport const HASIB_FIELDS = " +
  JSON.stringify(fields, null, 2) +
  ";\nexport const HASIB_FIELDS_BY_OPERATION = " +
  JSON.stringify(operations, null, 2) +
  ";\n";
const path = new URL("../config/mcp/hasib-contracts.js", import.meta.url);
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output) throw Error("mcp_contracts_stale");
} else writeFileSync(path, output);
