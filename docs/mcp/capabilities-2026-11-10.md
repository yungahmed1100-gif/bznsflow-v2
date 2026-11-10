# MCP function inventory — 10 November 2026

Computed from `config/mcp/contracts.js` on branch `release/mcp-control-2026-11-10`. This is a source inventory. MCP `tools/list` is authoritative for a real token; it pages at 60 tools. Execution rechecks current plan, sector, permissions and record versions. Supersedes [the 8 November inventory](capabilities-2026-11-08.md).

## Registry

433 dispositions: **383 executable tools**, **26 website handoffs**, **24 unavailable operations** (clinic preview). Handoffs return an absolute website link and one sentence on what the owner does there.

| Area | Tools | Handoffs | What is new on 10 November |
| --- | ---: | ---: | --- |
| Workspace | 1 | 0 | `workspace_summary`: plan, sector, permissions, setup, waiting approvals, tool groups |
| Tools | 1 | 0 | `tools_describe`: full schema of any tool this connection may call |
| Requests | 3 | 0 | `requests_list`, `requests_cancel`; `requests_status` now reports `approval_expired` and a `next` step |
| Setup progress | 2 | 0 | `onboarding_get` / `onboarding_save` were handoffs; save cannot change sector or VAT |
| Website (Ascend) | 3 | 4 | `website_state`, `website_save_draft`, `website_domain_check`; file upload, submit and resend stay on the website |
| Email — Rasil (Ascend) | 12 | 1 | State, subscribers, import, unsubscribe, sender, AI draft, preview, campaigns, create, cancel, domain check. Only accounts on the Rasil allow-list see them |
| Billing | 1 | 1 | `billing_state`; payment stays on Paymob's page |
| BznsBrain, Business, Catalog, Knowledge, Messaging, Files, Dashboard | 57 | 3 | Per-tool schemas with required fields; unchanged behaviour |
| Hasib | 298 | 2 | Required id fields declared; sector tools advertise key fields only |
| Channel setup, Instagram | 0 | 15 | Unchanged provider handoffs |

## Discovery per plan

Manager, every area granted, read/write token. Email tools are counted but hidden unless the account is on the Rasil allow-list.

| Plan / sector | Read token | Read/write token | Discovery size |
| --- | ---: | ---: | ---: |
| Catalyst | 47 | 87 | ~60 KB |
| Ascend retail | 79 | 156 | ~109 KB |
| Ascend retail-tech | 83 | 165 | ~114 KB |
| Ascend real estate | 90 | 178 | ~123 KB (was 384 KB) |
| Ascend construction | 94 | 195 | ~136 KB |
| Ascend automotive | 93 | 194 | ~135 KB |
| Ascend media | 84 | 178 | ~123 KB |
| Ascend fitness | 90 | 186 | ~127 KB |
| Ascend dental | 87 | 177 | ~122 KB |
| Ascend HVAC | 86 | 176 | ~121 KB |

`tests/mcp-schema.test.mjs` fails if Catalyst exceeds 65 KB or any sector 140 KB.

## Behaviour

- Errors return `{ error: { code, message, hint, field } }`. Argument errors name the field, for example `conversationId is required.`
- Upper-case request ids are accepted and stored lower-case.
- Rejected, cancelled and expired approvals refuse a retry with an explanation instead of returning a bare record.
- Email campaigns created over MCP are tagged effects. `requests_status` derives their outcome from delivery counts; the Rasil worker blocks the campaign if the connection is revoked or MCP is switched off.
- Unchanged: approval categories, 15-minute approvals, rate and concurrency limits, 30-day connections, no arbitrary query, code or URL tool.
