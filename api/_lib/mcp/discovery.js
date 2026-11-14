// What a connection's tool list looks like to a client: which tools it may see,
// how each is advertised, and the full description bznsflow_tools_describe returns.
import { TOOL_BY_NAME } from '../../../config/mcp/contracts.js';
import { mcpIcons } from '../../../config/mcp/identity.js';
import { McpError } from './store.js';

// Bump when tool names, schemas or descriptions change, so clients refresh their cache.
export const SERVER_VERSION = '1.2.0';
export const TOOLS_PER_PAGE = 60;
// A schema above this size is advertised by its top-level fields only.
const ADVERTISED_SCHEMA_BYTES = 2500;
// Fields every sector call may need, kept when a shared sector schema is summarised.
const CORE_FIELDS = new Set(['requestId', 'idempotencyKey', 'version', 'cursor', 'limit', 'status']);

const brief = schema =>
  schema.type
    ? {
        type: schema.type,
        ...(schema.enum ? { enum: schema.enum } : {}),
        ...(schema.type === 'string' && schema.maxLength ? { maxLength: schema.maxLength } : {}),
      }
    : schema.enum
      ? { enum: schema.enum }
      : schema.const !== undefined
        ? { const: schema.const }
        : {};

/**
 * Sector tools share one large field set per sector. Advertise the fields every call uses;
 * the assistant reads the rest with bznsflow_tools_describe. Validation always uses the full schema.
 */
export function advertisedSchema(tool) {
  const full = tool.inputSchema;
  const shared = tool.domain === 'hasib' && !!tool.packs && Object.keys(full.properties).length > 8;
  if (!shared && JSON.stringify(full).length <= ADVERTISED_SCHEMA_BYTES) return full;
  const required = full.required || [];
  const keep = Object.entries(full.properties).filter(([k]) => !shared || required.includes(k) || CORE_FIELDS.has(k));
  return {
    type: 'object',
    properties: Object.fromEntries(keep.map(([k, v]) => [k, brief(v)])),
    required,
    additionalProperties: shared,
    ...(shared ? { description: "More fields: bznsflow_tools_describe with this tool's name." } : {}),
  };
}

export function describeTool(tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    category: tool.category,
    approvalCategories: tool.category === 'read' ? [] : tool.categories || [tool.category],
    required: tool.inputSchema.required || [],
    inputSchema: tool.inputSchema,
    ...(tool.disposition === 'handoff' ? { websitePath: tool.path } : {}),
  };
}

/**
 * The tools this connection may call. Convex and the website deploy separately, so a name
 * this build does not know (a newer backend) is skipped rather than failing every call.
 * Email campaigns stay limited to the accounts the website's Rasil switch admits.
 */
export function visibleTools(names, { canWrite, emailOpen }) {
  return names.filter(name => {
    const tool = TOOL_BY_NAME.get(name);
    return !!tool && (tool.category === 'read' || canWrite) && (emailOpen || tool.domain !== 'email');
  });
}

const annotations = t => ({
  readOnlyHint: t.category === 'read',
  destructiveHint:
    ['bulk', 'team'].includes(t.category) || /delete|archive|revoke|disconnect|void|cancel/.test(t.operation),
  // Reads repeat safely; writes dedupe on their requestId.
  idempotentHint: true,
  openWorldHint: ['messages', 'team'].includes(t.category) || (t.categories || []).includes('messages'),
});

/** One page of the tool list, as tools/list returns it. */
export function toolPage(names, cursor = '0', origin) {
  if (!/^(0|[1-9][0-9]{0,4})$/.test(cursor)) throw new McpError('invalid_cursor', 400);
  const start = Number(cursor);
  return {
    tools: names.slice(start, start + TOOLS_PER_PAGE).map(name => {
      const t = TOOL_BY_NAME.get(name);
      return {
        name: t.name,
        title: t.title,
        icons: mcpIcons(origin),
        description: t.description,
        inputSchema: advertisedSchema(t),
        annotations: annotations(t),
      };
    }),
    ...(start + TOOLS_PER_PAGE < names.length ? { nextCursor: String(start + TOOLS_PER_PAGE) } : {}),
  };
}

/** Tool counts by group for the tools this connection actually sees. */
export function toolGroups(names) {
  const groups = {};
  for (const name of names) {
    const domain = TOOL_BY_NAME.get(name).domain;
    groups[domain] = (groups[domain] || 0) + 1;
  }
  return groups;
}
