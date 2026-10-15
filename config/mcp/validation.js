// Deliberately small JSON Schema subset shared with the Convex mutation boundary.
export function valid(schema, value, depth = 0) {
  if (depth > 20) return false;
  if (schema.const !== undefined) return value === schema.const;
  if (schema.enum) return schema.enum.includes(value);
  if (schema.anyOf) return schema.anyOf.some((s) => valid(s, value, depth + 1));
  if (schema.type === "null") return value === null;
  if (schema.type === "object")
    return (
      !!value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).every(
        (k) =>
          Object.hasOwn(schema.properties, k) &&
          valid(schema.properties[k], value[k], depth + 1),
      ) &&
      (schema.required || []).every((k) => Object.hasOwn(value, k))
    );
  if (schema.type === "array")
    return (
      Array.isArray(value) &&
      value.length <= (schema.maxItems ?? 500) &&
      value.every((v) => valid(schema.items, v, depth + 1))
    );
  if (schema.type === "string")
    return (
      typeof value === "string" &&
      value.length <= (schema.maxLength ?? 100000) &&
      (!schema.pattern || new RegExp(schema.pattern).test(value))
    );
  if (schema.type === "boolean") return typeof value === "boolean";
  if (schema.type === "number" || schema.type === "integer")
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      (schema.type !== "integer" || Number.isSafeInteger(value)) &&
      value >= (schema.minimum ?? -Number.MAX_SAFE_INTEGER) &&
      value <= (schema.maximum ?? Number.MAX_SAFE_INTEGER)
    );
  return false;
}
export function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
const PRIVATE_KEYS = new Set([
  "credential",
  "encryptedCredential",
  "sessionHash",
  "draftHash",
  "workspaceDraftHash",
  "tokenHash",
  "ownerKey",
  "hashSecret",
  "csrfToken",
  "access_token",
  "refresh_token",
  "pendingSelection",
  "attempt",
]);
export function publicResult(value, depth = 0) {
  if (depth > 20) return null;
  if (Array.isArray(value)) return value.map((v) => publicResult(v, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k, v]) => !PRIVATE_KEYS.has(k) && v !== undefined)
        .map(([k, v]) => [k, publicResult(v, depth + 1)]),
    );
  return value ?? null;
}

export const encodedSize = (value) =>
  new TextEncoder().encode(canonical(value)).length;
