import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mcpTables } from '../convex/mcp/schema.ts';
import { blueHarness, seedTenant } from './helpers/blue-tenant.mjs';
import { manage, prepare } from '../convex/mcp/state.js';
import { executeApplication } from '../convex/mcp/application.js';
function matches(value, v) {
  if (v.type === 'any') return value !== undefined;
  if (v.type === 'union') return v.value.some(s => matches(value, s));
  if (v.type === 'literal') return value === v.value;
  if (v.type === 'id') return typeof value === 'string' && value.startsWith(`${v.tableName}_`);
  if (v.type === 'array') return Array.isArray(value) && value.every(x => matches(x, v.value));
  if (v.type === 'object')
    return (
      !!value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).every(k => v.value[k]) &&
      Object.entries(v.value).every(([k, f]) => (value[k] === undefined ? f.optional : matches(value[k], f.fieldType)))
    );
  return typeof value === v.type;
}
test('actual MCP table validators accept the connection, proposal, transfer and receipt records', async () => {
  process.env.MCP_ENABLED = 'true';
  process.env.CONVEX_SERVICE_SECRET = '9'.repeat(64);
  const { m } = blueHarness({ start: Date.now() }),
    a = await seedTenant(m);
  await m.db.insert('sessions', {
    accountId: a.accountId,
    tokenHash: '1'.repeat(64),
    createdAt: m.now(),
    expiresAt: m.now() + 60000,
  });
  const c = await manage(
    m.ctx,
    {
      operation: 'connect',
      tokenHash: '1'.repeat(64),
      clientId: 'synthetic',
      clientName: 'Synthetic',
      scopes: ['workspace:read', 'workspace:write'],
    },
    m.now(),
  );
  const tool = 'bznsflow_files_upload_contacts',
    args = {
      requestId: randomUUID(),
      content: 'phone,name,country\n+96891234567,Synthetic,OM',
    };
  const p = await prepare(m.ctx, { connectionId: c.id, tool, args }, m.now());
  await executeApplication(m.ctx, { connectionId: c.id, runId: p.runId, tool, args }, {}, m.now());
  for (const row of m.rows.values())
    if (mcpTables[row.table]) {
      const { _id, _seq, table, ...data } = row;
      assert.ok(
        matches(JSON.parse(JSON.stringify(data)), mcpTables[table].validator.json),
        `${table} does not match its deployed validator`,
      );
    }
});
test('tool discovery stays within its size budget for every plan and sector', async () => {
  const { toolsFor } = await import('../config/mcp/contracts.js');
  const { advertisedSchema } = await import('../api/_lib/mcp/handler.js');
  const { capabilitiesFor } = await import('../convex/hasib/capabilities.js');
  const icon = [{ src: 'https://www.bznsflowai.com/mcp/bznsflow-icon.png', mimeType: 'image/png', sizes: ['256x256'] }];
  const budgets = { general: 65000 };
  for (const [plan, pack] of [
    ['catalyst', 'general'],
    ...['retail', 'retail-tech', 'real-estate', 'construction', 'automotive', 'media', 'fitness', 'dental', 'hvac'].map(
      p => ['ascend', p],
    ),
  ]) {
    const tools = toolsFor({
      plan,
      capabilities: capabilitiesFor(plan, 'manager'),
      packId: pack,
      scopes: ['workspace:read', 'workspace:write'],
      hasibAvailable: plan !== 'catalyst',
    });
    const bytes = JSON.stringify(
      tools.map(t => ({
        name: t.name,
        title: t.title,
        icons: icon,
        description: t.description,
        inputSchema: advertisedSchema(t),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      })),
    ).length;
    // Real estate was 384 KB before sector schemas were summarised (9 November 2026).
    assert.ok(bytes <= (budgets[pack] || 140000), `${plan}/${pack} discovery is ${bytes} bytes`);
    for (const t of tools) {
      assert.ok(t.description.length <= 320, `${t.name} description is short`);
      const advertised = advertisedSchema(t);
      for (const k of t.inputSchema.required || [])
        assert.ok(advertised.properties[k], `${t.name} advertises required ${k}`);
    }
  }
});
