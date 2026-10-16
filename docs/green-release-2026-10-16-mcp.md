# Green release 2026-10-16 — AI Connections (MCP) and restored website pages

Status: **verified on the isolated candidate; ready to deploy to Green.** Ahmed authorized the production push on 16 October 2026. The permission system blocks Claude from Green writes and Green Convex reads, so Ahmed runs the steps under "Deploy".

## What ships

- **Restored website work.** Releases A and B were built from `origin/master`, which lacked the 13–14 October website line. In production, `/services`, `/support` and `/contact` returned 404. This release brings back the restored business pages and GEO updates, the Ascend website copy and the global-reliability changes (local fonts, monitoring).
- **AI Connections (MCP).** `/api/mcp`, OAuth at `/oauth/*`, and `/mcp` and `/en/mcp`. See [docs/mcp/engineering-pack.md](mcp/engineering-pack.md) and [docs/mcp/release.md](mcp/release.md). It ships **disabled**, then pilot-only for `ahmed@bznsflowai.com`.

Source: branch `release/mcp-integration-2026-10-16`. It is a merge of `feat/bznsflow-mcp` onto `origin/master` (`e4c0f88`, Release B).

## Changes made during integration

- **Codex refresh fix (`4036ea1`).** Codex refreshes with `openid workspace:read workspace:write` even after `mcp login --scopes workspace:read,workspace:write`, which is the command our setup guide shows. The server answered `invalid_scope`, so every Codex connection would have dropped after its first 15-minute token. The token endpoint now drops requested scopes the refresh token does not hold, and never adds any.
- **15 sector operations had no MCP policy.** The Release A/B automotive, construction and store context/approve/follow-up/task operations had none. They now match their sibling sectors: context, follow-ups and overview are read; task resolve and snooze are edit; draft approve is messages, which needs approval. Store tools are limited to the retail and retail-tech packs. A new coverage test fails if a validator-accepted Hasib operation has no policy.
- **Dashboard tab flash fixed.** In six-tab sectors, old links such as `?tab=today` briefly rendered Chats before Hasib loaded. The dashboard now waits for Hasib before it resolves the tab. Found by `retail-browser` on the merged build.
- **Conflicts resolved as unions.**
  - `blueMessages` keeps the retail, construction and automotive draft links and gains the optional MCP origin fields.
  - Routes, the prerender list and the page manifest keep every production route. They add `/mcp` and the business pages.

## Evidence (16 October 2026)

- `npm run test:release` on the integrated tree:
  - unit tests, Convex typecheck, production build and audit;
  - the 11 shared browser suites, including 188 MCP browser checks;
  - every sector suite.
- MCP unit tests: 35, including Codex-shaped refresh, read-only non-escalation and Hasib policy coverage.
- Isolated candidate (`bznsflow-mcp-acceptance`, `dpl_3fj7jW3SacU2icg5yEa5n5McQwFW`, Convex `quaint-monitor-641`) running the integrated source:
  - **91 real Convex checks**:
    - ownership;
    - stale, expired and concurrent approvals (4 concurrent approvals → 1 accepted);
    - approve-versus-execute races;
    - exact 120/minute connection and 300/minute workspace limits;
    - five-call concurrency leases;
    - Arabic CSV import/export round trip;
    - queued invitation cancelled by revocation (0 attempts);
    - plan and integration changes.
  - **Synthetic load:** 60 calls at concurrency 5, measured from Muscat to the Ireland deployment, each with three round trips. p50 1,007 ms, p95 2,052 ms, max 2,434 ms.
  - **37 HTTPS checks:** deployed rewrites, the signed account session, OAuth PKCE, SDK discovery/read/write/approval, refresh in Codex's exact scope shape, rotation and replay, and revocation. 150 permitted tools for the real-estate fixture.
  - **Claude Code 2.1.285, real model run on Sonnet 5.5:**
    - OAuth login and Arabic consent;
    - an Arabic read, write and approval preview;
    - an English export approved on the website;
    - an automatic refresh after forced token expiry;
    - disconnection from the website.

    All passed. The model cost was $0.34.

## Not verified

- **Codex model-driven run.** Its account is usage-limited until 22 October 10:30. Codex's refresh request was reproduced exactly against the local provider and in the HTTPS checks.
- **The Claude.ai web connector.** It needs Ahmed signed in to claude.ai.
- **Real email-code and social sign-in returns.** The candidate's email endpoint is disabled on purpose.

## Known issue before opening MCP beyond the pilot

**Tool discovery is very large.** A real-estate owner sees about 130 tools, about 108k tokens of schemas. The cause: each sector's Hasib tools reuse the whole sector input shape, about 9.4k characters each, instead of their own fields. Clients work, but every conversation pays for the full list. Narrow each tool's schema to `HASIB_FIELDS_BY_OPERATION` before enabling customers.

## Deploy (Ahmed)

Follow this order. Stop at any failed check.

1. Push the source: `git push origin release/mcp-integration-2026-10-16:master`. This is a fast-forward from `e4c0f88`.
2. Generate the production MCP secrets and set them with MCP **off**: `node scripts/mcp-provision.mjs`. It writes nothing to Git and prints no secrets.
3. Deploy Convex to Green from the release worktree. First run `cp "/Users/ramsis21/Desktop/bznsflow web/.env.green-convex.local" .env.local`, then `npx convex deploy`. The CLI must name `rare-fish-465` before it pushes. All schema changes are additive: new `mcp*` tables and optional fields.
   - **Never use `dev:quaint-nightingale-675` here.** That selector belongs to the Blue project, and its production is `valuable-mandrill-296`. On 16 October this release was pushed there by mistake. Green was not affected.
4. Deploy the website: `npx vercel deploy --prod --skip-domain` in a checkout linked to `bznsflow-main`. Then promote it once the smoke checks below pass on the deployment URL.
5. Smoke checks, with MCP off:
   - `/`, `/en`, `/services`, `/en/services`, `/support`, `/contact`, `/refund`, `/en/layla/dashboard` return 200;
   - `/api/mcp` returns 503 `mcp_disabled`;
   - `home-browser` passes against production.
6. Enable the pilot: set `MCP_ENABLED=true` in Vercel production **and** Convex prod. Then redeploy the website from the same commit so the Vercel variable applies.
7. Ahmed connects Claude or Codex from `/en/mcp` using the guide.

## Rollback

- **Disable MCP:** set `MCP_ENABLED=false` in Vercel and Convex, then revoke pilot connections on `/en/mcp`.
- **Website:** promote `dpl_G7Yhchk1vpk3scx1GHCzFfgPyqyG` (Release B). That restores the page 404s as well.
- **Schema:** keep the additive MCP tables and the MCP-aware worker guards while any MCP-tagged job exists. See [docs/mcp/release.md](mcp/release.md).
