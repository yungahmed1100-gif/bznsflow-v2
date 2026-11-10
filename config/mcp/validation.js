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
      Object.keys(value).length <= 200 &&
      Object.keys(value).every((k) =>
        schema.properties && Object.hasOwn(schema.properties, k)
          ? valid(schema.properties[k], value[k], depth + 1)
          : typeof schema.additionalProperties === "object" &&
            k.length <= 80 &&
            valid(schema.additionalProperties, value[k], depth + 1),
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
const typeName = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
/**
 * The first reason `value` fails `schema`, as { field, problem }, so an assistant can
 * correct its call. Mirrors `valid`; returns null when the value is valid.
 */
export function explain(schema, value, path = "", depth = 0) {
  if (valid(schema, value, depth)) return null;
  const at = (problem, field = path) => ({ field: field || "(arguments)", problem });
  if (schema.const !== undefined) return at(`must be ${JSON.stringify(schema.const)}`);
  if (schema.enum) return at(`must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}`);
  if (schema.anyOf) return at("does not match any accepted form");
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return at(`must be an object, got ${typeName(value)}`);
    for (const k of schema.required || [])
      if (!Object.hasOwn(value, k)) return at("is required", path ? `${path}.${k}` : k);
    for (const [k, v] of Object.entries(value)) {
      const field = path ? `${path}.${k}` : k;
      const inner = schema.properties && Object.hasOwn(schema.properties, k)
        ? schema.properties[k]
        : typeof schema.additionalProperties === "object" ? schema.additionalProperties : null;
      if (!inner) return at("is not an accepted field", field);
      const found = explain(inner, v, field, depth + 1);
      if (found) return found;
    }
    return at("has too many fields");
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) return at(`must be an array, got ${typeName(value)}`);
    if (value.length > (schema.maxItems ?? 500)) return at(`allows at most ${schema.maxItems ?? 500} items`);
    for (const [i, v] of value.entries()) {
      const found = explain(schema.items, v, `${path}[${i}]`, depth + 1);
      if (found) return found;
    }
  }
  if (schema.type === "string") {
    if (typeof value !== "string") return at(`must be a string, got ${typeName(value)}`);
    if (value.length > (schema.maxLength ?? 100000)) return at(`allows at most ${schema.maxLength ?? 100000} characters`);
    if (schema.pattern) return at(schema.pattern === "^[a-f0-9-]{36}$" ? "must be a UUID" : "has an invalid format");
  }
  if (schema.type === "integer" || schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return at(`must be a number, got ${typeName(value)}`);
    if (schema.type === "integer" && !Number.isSafeInteger(value)) return at("must be a whole number (money is in minor units, e.g. baisa)");
    return at(`must be between ${schema.minimum ?? "-∞"} and ${schema.maximum ?? "∞"}`);
  }
  if (schema.type === "boolean") return at(`must be true or false, got ${typeName(value)}`);
  return at("is invalid");
}
const UUID_ANY_CASE = /^[A-Fa-f0-9-]{36}$/;
/** Assistants often send upper-case UUIDs; ids are stored lower-case. */
export function normalizeKeys(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return args;
  const out = { ...args };
  for (const k of ["requestId", "idempotencyKey"])
    if (typeof out[k] === "string" && UUID_ANY_CASE.test(out[k])) out[k] = out[k].toLowerCase();
  return out;
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
