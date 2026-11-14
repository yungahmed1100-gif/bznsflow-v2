# Green release: AI Connections run directly (14 November 2026)

**Authorization:** Ahmed, 14 November 2026, answering "Do you want every AI Connections permission set to run directly, without your approval?": "yes no need for approval and email just the authentication page via a connected bznsflow account". He also confirmed that AI Connections sign-in works ("ai connection resolves"). This release was cut ahead of refactor Phase 3 because it is a behaviour change with its own rollback.

| | |
|---|---|
| Source | `d3006d7` on `feat/mcp-direct`, fast-forwarded to `master`, tag `green-mcp-direct` |
| Convex | `prod:rare-fish-465`, deployed 10:05:31Z, before the website |
| Website | `dpl_5FG9Eb6ELb4vVPhKQ638w8F5bkN1`, promoted to www.bznsflowai.com at 10:08:05Z |
| Rollback, website | Promote `dpl_AWH1iBRYfqeDnxw8Xqb7MBYqgxbc` (`green-p2`) |
| Rollback, Convex | Deploy `convex/` from `green-p2` to `prod:rare-fish-465`. Do this before the website rollback, because the `green-p2` page expects the emailed-code step. |

## What changed for people

- **Connecting an assistant.** The assistant opens the BznsFlow page; the owner continues with the signed-in account. There is no emailed code.
- **Changing permissions.** Save works the first time, whatever the age of the sign-in.
- **Approvals.** A new connection runs every kind of action directly. On /mcp the owner can still set any category to ask first: messages, money or prices, bulk or delete, data export, team access, goes live. Requests in those categories then wait for approval as before.
- **Wording.** The setup guide, the walkthrough, the help answers and the consent card no longer say that important actions need approval by default.

Connections made before this release keep the categories they have saved. Ticking every category and pressing Save once makes such a connection run directly; reconnecting does the same.

## Engineering

- `convex/mcp/access.js`: `browserOwner` no longer takes `fresh`. The five-minute recent-sign-in rule is gone; any live session may connect or change permissions.
- `convex/mcp/state.js`: `connect` stores `direct: [...CATEGORIES]`. The approval path is unchanged for categories the owner removes from `direct`.
- `api/_lib/mcp/oauth.js`: consent no longer asks Convex for a recent sign-in.
- **Removed:** `ConfirmIdentity.jsx`, `pending-policy.js`, its styles and the `fresh_sign_in_required` copy. The replay of a permission change saved before re-verifying went with them. That replay used the first render's empty CSRF token, so the server refused it and the change was lost. This was the Phase 3 bug "MCP pending-policy stale CSRF/account"; it is now resolved by removal.
- Tool descriptions read "Direct unless owner approval is on (…); retry same requestId." Discovery `SERVER_VERSION` is `1.2.0`, so clients refresh descriptions.
- **Dependencies:** `npm audit` flagged moderate advisories published after `green-p2` in `hono` 4.13.13 and `@hono/node-server` 2.1.5. They come in through the MCP SDK's Streamable HTTP transport, and none affects the paths it uses. They are pinned to the earliest fixed versions, 4.13.16 and 2.1.6, through `overrides`. Those versions are 12 to 13 days old, a little under the usual two-week minimum, an exception made because they are fixes for known advisories.
- **Trade-off:** someone with a stolen BznsFlow session could connect an assistant that acts directly. The session cookie is HttpOnly, and the owner can disconnect any assistant on /mcp.

## Evidence

- **Tests first:** two new tests failed before the change and pass after it.
  - "a new connection runs every kind of action directly"
  - "connecting and changing permissions accept any live sign-in, however old"
- **Other updated tests:**
  - `tests/mcp-flow-e2e.test.mjs`: through the real OAuth flow, pausing messages completes with no approval; once the owner turns asking back on, the list, cancel and reject path is unchanged.
  - `tests/mcp-browser.mjs`: consent and Save work without a code, and no code is ever emailed.
- **`npm run test:release` on a clean archive of `d3006d7`:** passed.
  - Formatting passes. The lint ratchet shows 349 findings, 3 fewer.
  - 1,230 unit tests passed, 0 failed, 1 to-do.
  - The Convex typecheck and the build pass, and `npm audit` found 0 vulnerabilities.
  - All 18 browser suites passed: AI Connections ran 278 checks, and the navigation crawl ran 4,716 checks with 0 known problems.
  - Sector suites passed, and Ascend end-to-end passed 107 checks.
  - The first run, on `4cf7d06`, stopped at the audit gate, which led to the dependency pin.
- **Visual diff against `green-p2`:** 172 screens, 8 differences, all expected: `/mcp` and `/en/mcp`, desktop and phone, pixels and accessibility tree (`tests/fixtures/visual-mcp-direct.json`).
- **Lineage:** the release contains `green-p2`, which was live at release time; `master` had not moved.
- **Convex dry run:** no index deletions, schema validation complete, and only the empty Node-actions version line.
- **Staged:** 12 key pages returned 200, and `/en/mcp` served the new wording. `/api/mcp` answered `invalid_host` 403 on the deployment URL, the same as the live deployment.
- **Production:**
  - Health passed 16 of 16, and all 56 prerendered pages returned 200 (`/contact` passed on a retry after one connection timeout).
  - `/en/mcp` serves the new wording.
  - No runtime errors after promotion.

## Not verified

Production data was not read, so it is unknown whether any existing connection has categories set to ask first.
