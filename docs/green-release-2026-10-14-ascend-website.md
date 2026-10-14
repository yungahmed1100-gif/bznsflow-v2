# Green website release — 14 October 2026

Authorization: Ahmed requested “great now push it all to production” after reviewing the website changes in this conversation.

## Release scope

- Arabic and English Catalyst/Ascend cards describe owner outcomes and saved work.
- Layla appears with her portrait in Catalyst; Ascend includes Layla, Hasib, Adiba and Rasil with portraits. Rasil remains explicitly coming soon.
- Ascend includes a free lead capture website as a gift, with a gift icon and localized badge. Services, structured data and llms.txt agree.
- Remove the industry list from the Ascend card.
- Replace the About illustration with the supplied team meeting artwork; lossless WebP conversion preserves the source image, with uncropped responsive sizing and localized alternative text.

No Rasil backend, email sending, authentication, Convex, webhook, scheduler or credential changes are included. No outbound messages are sent.

## Baseline and rollback

Verified production on 14 October: `dpl_FaKxRMzrzxDp3ZBdHvHqFwbp5JBa`, READY, project `bznsflow-main` (`prj_4UheWOGFd6uC8yEgsM9J7eEcmu9t`), source metadata `a692f76e7f98e1414156770c52275702766a847c`.

The isolated `copy/ascend-rasil-website` worktree starts at `8e94b12`, which adds only the previous release record to that source. Preserve the baseline deployment for rollback. The main checkout's unrelated edits remain untouched.

## Verification before release

- Production build passes.
- 38 homepage browser checks pass across Arabic/English, 320–1440 pixels, accessibility, reduced motion and browser errors.
- Four SEO/static HTML regression tests pass.
- Local visual inspection confirms portraits, team artwork and gift badge.
- Impeccable detector findings are confined to existing status/colour rules and an existing text-size advisory; no new finding is attributed to the changed styles.

Build and deploy from a committed archive with private environment files, local tools and work artifacts excluded. Verify the READY candidate and recheck the live baseline immediately before promotion. Deployment and production observations will be recorded below.

Evidence directory: ignored `work/release-2026-10-14/` in the isolated worktree.

## Production outcome

Published to **https://www.bznsflowai.com** on 14 October 2026.

- Runtime source: `8386b3cc816277226ba2f1ee80d215f72c81956f`, committed and pushed on `copy/ascend-rasil-website`.
- Deployment: `dpl_5Fxg7TV41m9vaVSemypenn5kGJMW`, READY.
- Deployment URL: https://bznsflow-main-f521bbtfc-yungahmed1100-7330s-projects.vercel.app
- Built from a clean Git archive with `npm ci` (zero reported vulnerabilities), deployed with `--prod --skip-domain`, verified, then promoted. Deployment API source metadata matches the runtime commit. The custom domain inspection confirms the new READY deployment.
- Immediately before promotion, the production deployment still matched the baseline recorded above.
- Rollback retained: `dpl_FaKxRMzrzxDp3ZBdHvHqFwbp5JBa` at https://bznsflow-main-8pzn75ta9-yungahmed1100-7330s-projects.vercel.app.

### Completed checks

- Archived source: successful production build; 4 SEO/static HTML tests, 38 homepage checks and 46 discovery checks passed. All 47 generated HTML files decode as strict UTF-8 without NUL bytes; all 27 JSON-LD blocks parse.
- Candidate and live domain: 18 public pages and 5 private entry pages pass content, language, canonical/schema and private-page noindex checks. All 5 unique portrait/team images match built asset hashes. Gift copy, Rasil coming-soon labeling, services, llms.txt, robots.txt and sitemap pass.
- Live anonymous `/api/auth-session` returns `account: null`, `needsProfile: false`.
- Live browser regression: 38 checks pass for EN/AR, widths 320–1440, reduced motion, accessibility and page errors. Browser visual inspection confirms the live portraits and Ascend gift badge.
- Source allowlist comparison confirms no changes to API, Convex, authentication, dashboard, package dependencies or deployment configuration relative to the previous production runtime.

### Observations and limits

Initial live HTTP and browser runs encountered connection timeouts. Both DNS-returned IPv4 addresses subsequently returned HTTP 200. All live HTTP checks then passed with normal DNS and bounded connection retries. A diagnostic run pinned the hostname to one current DNS-returned address and passed the same content/asset/session checks.

The live browser harness also exposed an initial-frame timing assumption: the animation had already advanced by page load. The ignored diagnostic copy checks that the currently visible animation step advances, and keeps the other assertions unchanged. That run passed all 38 checks, with the hostname pinned to the current DNS-returned address. No production code or DNS settings were changed for these observations.

These are immediate release checks, not extended uptime monitoring. Private entry-page and anonymous-session checks do not establish signed-in customer/owner workflow correctness. No live Meta messages, customer data writes or Rasil functionality were exercised.

Evidence: `live/results.json`, `live-retry.log`, `live-routed/results.json`, `live-browser-routed.log`, `live-deployment.json`, `candidate/results.json`, `source-check.json`, archive test logs and `live-ascend-gift.jpg` under the ignored evidence directory above. This release-record update is documentation only; the deployed runtime remains the source commit recorded above.
