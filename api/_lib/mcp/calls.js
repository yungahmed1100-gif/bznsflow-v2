// One tools/call: argument checking with a readable error, tools_describe, the domain
// call itself, links the owner can open, and the activity metric. Never throws.
import { TOOL_BY_NAME } from '../../../config/mcp/contracts.js';
import { explain, normalizeKeys } from '../../../config/mcp/validation.js';
import { toolError } from '../../../config/mcp/errors.js';
import { describeTool, toolGroups } from './discovery.js';
import { McpError } from './store.js';

export const reason = e => (/^[a-z_]{3,60}$/.test(e?.code || '') ? e.code : 'mcp_unavailable');
const reply = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
const errorReply = error => ({
  isError: true,
  content: [{ type: 'text', text: JSON.stringify({ error }) }],
  structuredContent: { error },
});

/** Absolute links for the dashboard page and records a result touched. */
function withLinks(result, origin) {
  if (!result.workspacePath && !result.recordLinks?.length) return result;
  return {
    ...result,
    links: [
      ...(result.workspacePath ? [{ label: 'Workspace', url: new URL(result.workspacePath, origin).href }] : []),
      ...(result.recordLinks || []).map(link => ({
        label: link.label,
        id: link.id,
        url: new URL(link.path, origin).href,
      })),
    ],
  };
}

/** A handoff carries the absolute website address the owner opens. */
function withHandoffUrl(result, origin) {
  const inner = result.result?.status === 'website_required';
  if (!inner && result.status !== 'website_required') return result;
  const handoff = inner ? result.result : result;
  const located = { ...handoff, url: new URL(handoff.path, origin).href };
  return inner ? { ...result, result: located } : located;
}

/** The workspace summary counts only tools this connection sees (the email allow-list is applied here). */
function withVisibleGroups(result, tool, names) {
  if (tool.domain !== 'workspace' || !result.result?.toolGroups) return result;
  return { ...result, result: { ...result.result, toolGroups: toolGroups(names) } };
}

async function run({ tool, args, names, connectionId, env, store, execute, origin }) {
  // Answered from this connection's own tool list; no workspace data involved.
  if (tool.domain === 'tools') {
    const target = TOOL_BY_NAME.get(args.name);
    if (!target || !names.includes(target.name)) throw new McpError('tool_not_allowed', 403);
    return { status: 'completed', value: describeTool(target) };
  }
  const result = await execute({ connectionId, tool: tool.name, args, env, store });
  const shaped = withLinks(withHandoffUrl(withVisibleGroups(result, tool, names), origin), origin);
  return { status: shaped.status || 'completed', value: shaped };
}

export async function callTool(request, context) {
  const { names, connectionId, store } = context;
  const name = request.params.name;
  if (!names.includes(name)) return errorReply(toolError('tool_not_allowed'));
  const started = Date.now();
  const tool = TOOL_BY_NAME.get(name),
    args = normalizeKeys(request.params.arguments || {});
  let outcome = 'failed',
    response;
  const problem = explain(tool.inputSchema, args);
  if (problem) {
    outcome = 'invalid_arguments';
    response = errorReply(toolError(outcome, problem));
  } else {
    try {
      const done = await run({ ...context, tool, args });
      outcome = done.status;
      response = reply(done.value);
    } catch (e) {
      outcome = reason(e);
      response = errorReply(toolError(outcome));
    }
  }
  await store('metric', { connectionId, tool: name, status: outcome, durationMs: Date.now() - started }).catch(() =>
    console.warn('mcp_metric_unavailable'),
  );
  return response;
}
