# GEO and Search Console setup — 12 October 2026

Release update: the owner subsequently authorised production deployment of the website changes and business pages. The setup/audit record below describes local preparation; see `docs/green-release-2026-10-12-geo-pages.md` for the release outcome. The Google credential setup remains pending and is not deployed to the website.

## Outcome and boundaries

The requested repositories have been read, pinned and applied locally. The homepage design remains intact. No production deployment, sitemap submission, Google property mutation or customer communication is part of this work.

- GEO Optimizer 4.19.0: [Auriti-Labs source](https://github.com/Auriti-Labs/geo-optimizer-skill/tree/a630a954578a8a4af445a7a28e326b065ff172d0).
- GSC MCP 0.4.1: [AminForou source](https://github.com/AminForou/mcp-gsc/tree/d49eea9e5efb5eb645b722249303179b2c150b49).
- Exact Python dependencies: `.codex/tools/seo/requirements.lock`; isolated environment: `.codex/tools/seo/.venv/` (ignored).
- Discoverable project skill: `.agents/skills/geo-optimizer/SKILL.md`; upstream skill and MIT license retained alongside it.
- Read-only GSC adapter: `.codex/scripts/gsc_readonly.py`; registration: `.codex/config.toml`.

User confirmed that credentials are not ready. MCP registration and a successful offline startup do **not** establish Google authentication, site verification, indexing, search traffic or AI citations.

## Changes to the site

- Replaced stale `llms.txt` availability with current Catalyst/Ascend scope and Apex preparation status. Removed unconfirmed blanket commercial terms from this summary. Linked the bilingual service, contact, support and policy pages.
- Added explicit search-crawler entries for OAI-SearchBot and Claude-SearchBot, plus Claude-User. Kept the existing training policy. Wildcard access already permitted them; this clarifies intent rather than claiming a newly removed block.
- Linked Organization, WebSite, WebPage and service entities with stable IDs. Added Ascend with owner approval and sector-specific automation limits. Added page-specific schema generated from the visible bilingual business-page content. No address, price, ratings, success figures or new credentials were invented.
- Changed homepage language destinations to real anchors with native navigation to prerendered routes, retaining the locale cookie and modified-click browser behavior.
- Supplied the advertised 1200×630 `/og-image.jpg`. Regenerate with `node scripts/gen-social-preview.mjs`; this social artwork does not replace the homepage visuals.
- Updated the homepage sitemap modification date to the actual change date.
- Fixed local hreflang auditing to rebase only the expected production origin. Wrong domains and missing reciprocal paths still fail. Added social-image HTTP/MIME/signature verification because a meta tag alone cannot prove an image exists.

The contact/services/support pages and terms from the earlier task still await the owner's outstanding legal and commercial details before publishing. Their inclusion here is local release preparation, not approval of those unresolved facts.

## Install or recreate the local tools

Run from the project root with `uv` installed:

```sh
uv venv .codex/tools/seo/.venv
uv pip sync --python .codex/tools/seo/.venv/bin/python .codex/tools/seo/requirements.lock
```

Do not use a remote shell installer, floating package version or upstream auto-fix against the working tree. The app's npm dependencies are unchanged. After setup, restart/reopen this trusted Codex workspace to load the `gsc` MCP registration. `codex mcp list` shows transport registration, not Google authentication; its `unsupported` auth label refers to Codex-managed MCP OAuth, not the server's Google OAuth flow.

## Finish Google authentication when credentials are ready

1. In [Google Cloud Console](https://console.cloud.google.com/), choose the intended business-owned project and [enable the Search Console API](https://console.cloud.google.com/apis/library/searchconsole.googleapis.com).
2. Configure its OAuth consent screen and create a **Desktop app** OAuth client. For an external app in testing, add the Google account that has BznsFlow Search Console access as a test user. Download the client JSON locally; do not paste its contents into chat.
3. Store it as `/Users/ramsis21/.config/bznsflow/gsc/client-secrets.json`. The directory already exists with mode 700. Set the JSON file to mode 600. Credentials and the generated token stay outside the project.
4. Run the following from the project root to open Google's sign-in flow. Choose the authorised account and review the read-only Search Console scope:

```sh
chmod 600 '/Users/ramsis21/.config/bznsflow/gsc/client-secrets.json'
GSC_CONFIG_DIR='/Users/ramsis21/.config/bznsflow/gsc' \
GSC_OAUTH_CLIENT_SECRETS_FILE='/Users/ramsis21/.config/bznsflow/gsc/client-secrets.json' \
  .codex/tools/seo/.venv/bin/python .codex/scripts/gsc_readonly.py --authenticate
```

5. Reload the Codex workspace. Call `get_capabilities`, then `list_properties`. The first reports file presence; only a successful `list_properties` call verifies access. Use the exact returned property, which may be `sc-domain:bznsflowai.com` or a URL-prefix property. Neither is assumed or created here.
6. If the property is absent, verify it in Search Console using the owner's approved method or grant this Google account access. Do not change DNS automatically. If Google revokes/expires a testing token, rerun the explicit authentication command; do not grant extra scopes to work around it.

Service-account alternative: create/download a business-owned service-account credential locally and grant that identity the necessary Search Console property access. In the project's GSC environment section, **remove** `GSC_OAUTH_CLIENT_SECRETS_FILE`, set `GSC_CREDENTIALS_PATH` to its absolute external file path and `GSC_SKIP_OAUTH = "true"`. Keep the adapter and read-only tool list. Upstream fails fast when an explicitly configured credential path is missing, so do not leave both methods configured with a nonexistent file.

## Reporting workflow after authentication

1. `list_properties`: identify the exact authorised property.
2. `get_sitemaps` / `list_sitemaps_enhanced`: inspect Google's existing sitemap state. Submission is not enabled.
3. `get_performance_overview` and `get_search_analytics`: last 28 days, separating branded/non-branded queries and Arabic/English landing pages. The registration requests `GSC_DATA_STATE=final`; final data can lag recent traffic.
4. `get_advanced_search_analytics`: inspect country, device, query and page opportunities. Prioritise relevant impressions and low-CTR pages, rather than inventing demand for sectors with no data.
5. `compare_search_periods`: compare equivalent complete periods. Record which is baseline and which is current; avoid comparing partial recent periods as if complete.
6. `inspect_url_enhanced` / `batch_url_inspection`: inspect published canonical URLs only, with a maximum of ten per batch. This reads Google's last known index state; it is not a live indexing request.
7. Keep private query exports and reports under ignored `work/`. GSC search metrics cannot independently establish lead quality, sales or AI citations. Measure customer outcomes separately with consent and an agreed attribution method.

The adapter uses the `webmasters.readonly` OAuth scope, removes all tools except thirteen reporting/inspection tools plus its accurate `get_capabilities`, and uses restrictive permissions for new token files. Add/delete property, sitemap submission/deletion and general management tools are absent. Google authentication is a deliberate terminal step. Tool selection does not restrict the account's underlying access to just one property: always use the confirmed BznsFlow property.

## Audit decisions

The first production audit returned **77/100, rubric v2**, stored at `work/geo-research/production-before.json`. This is the tool's heuristic checklist, not a measured ranking or citation rate. The toolkit's CLI intentionally refuses localhost; its network protections were preserved. Local verification uses the repository audit and browser checks. No post-deployment score is claimed.

Recommendations deliberately not applied: adding invented Wikipedia/Crunchbase identities, a SearchAction without functional site search, RSS without an editorial feed, blanket dates/bylines on a commercial homepage, redundant AI-discovery endpoints, fabricated statistics/quotes, or descriptive alt text for purely decorative artwork.

Corrections to upstream advice:

- Google Search uses Googlebot for AI Overviews/AI Mode. Google-Extended is a separate control; Google does not require `llms.txt`, special AI files or special schema. [Google Search guidance](https://developers.google.com/search/docs/appearance/ai-features).
- OAI-SearchBot supports search discovery; GPTBot's purpose is different. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).
- Claude-SearchBot handles search; ClaudeBot serves model development. [Anthropic crawler documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler).

## Acceptance, failure handling and rollback

Verified locally on 12 October 2026:

- `npm run build` passed after the final runtime changes.
- Two SEO audit regression tests passed, including wrong-domain/missing reciprocal hreflang and broken social-file detection.
- 46 bilingual browser checks passed: default HTML without JavaScript, truthful service schema, real language links, keyboard navigation, visible business-page dates and decoded 1200×630 social image.
- 38 existing homepage checks passed after updating the obsolete single-available-plan assertion to reflect Catalyst and Ascend: original pipeline behavior, reduced motion, accessibility, colour meanings and EN/AR layouts at 320–1440 pixels.
- The 18-page local SEO audit completed with **0 errors and 51 warnings**: 10 short titles, 2 short descriptions, 2 long descriptions, 36 image-oversizing findings and 1 local CLS warning. The sampled English homepage CLS was 0.1375; this is a local lab observation, not field Core Web Vitals data. These remaining issues were not silently marked fixed.
- MCP stdio initialized successfully, listed exactly 14 allowed tools, enforced read-only OAuth scope even when a test environment attempted to enable destructive actions, and returned an explicit missing-credential result. No Google API access was exercised.
- Codex accepted the GSC registration. The broader `.codex/scripts/validate.py` passes the new GSC configuration checks but still stops on the pre-existing missing `api/_lib/layla/rag-engine.js` reference in another project skill. That unrelated documentation gap remains open.

Evidence files: `work/geo-research/build.log`, `local-seo-after.json`, `local-seo-after.log`, `geo-browser.log`, `home-test.log`, `gsc-test.log`. These are local ignored artifacts, not published customer data.

Required evidence: build success; parseable prerendered bilingual schema; accurate availability; crawlable language destinations; working 1200×630 social image; offline MCP initialization and read-only tool/scope checks; explicit missing-credential state. Audit warnings and remaining availability gates must remain visible.

```sh
node --test tests/seo-discovery.test.mjs
.codex/tools/seo/.venv/bin/python .codex/scripts/test_gsc_readonly.py
npm run build
node scripts/preview.mjs --port 5207
# In another terminal:
node tests/geo-browser.mjs http://127.0.0.1:5207
node tests/home-browser.mjs http://127.0.0.1:5207
npm run seo:audit -- --base http://127.0.0.1:5207 --json work/geo-research/local-seo-after.json
```

If credentials are missing, stop GSC-dependent conclusions and continue public/local checks. If a dependency cannot install, keep the source pins and report that startup is unverified. Rollback only this task's patches and added assets/configuration. Earlier refund, business-page, Ascend and authentication work must remain intact; do not restore whole shared files from HEAD.
