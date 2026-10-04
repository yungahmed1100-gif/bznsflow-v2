---
name: bznsflow-dashboard-engineering
description: Build or fix BznsFlow React dashboards, sector workflows, responsive layouts and access states. Use for dashboard implementation, not marketing copy.
---

# Dashboard Engineering

Start with the current project map in `.codex/references/project-map.md`; read the affected sector only. Inspect the deployed entry point as well as domain helpers. This is React 18 + React Router static prerendering, not Next.js.

Trace route → page → API → Convex wrapper → domain executor. Reuse real sector components and the live registry; keep synthetic owner previews separate from real workspace data. Never use a preview selector to update the account's actual sector. Preserve server-side grant, role and tenant checks even when controls are hidden.

Define the user outcome and failure state before editing. Account for loading, empty, denied, expired-session, validation and save/reload behavior. Mutations must survive duplicate clicks and must not leak another workspace through IDs. Keep currency/totals deterministic and auditable.

Verify the changed flow in EN/AR at 320, 768 and 1440, including keyboard/focus, overflow, browser errors, direct deep links and reload. Use Playwright MCP for exploration; keep repeatable regressions in the existing Playwright/Node suites. Exercise real Convex wrappers when changing gates; helper-only tests previously missed a blanket Catalyst denial. Reuse authorized test accounts; reading a screen does not authorize sending messages.

For speed work, measure the actual bottleneck before memoization or dependency changes. Do not introduce SSR-only/Next.js APIs into this static application. Report the behavior changed, evidence, and any untested production dependency.
