# Green release — Apex pricing cards, 2026-10-27

## Authorization and scope

Ahmed requested the Apex visual polish, distinct portraits, niche outcomes and ROI copy, equal card sizes and a disclosure button, then instructed: “great refactor then push to live production” and “Implement the plan.”

Frontend only. Preserve payment, account-routing and analytics behavior; no Convex deployment, migration, credential change, production request submission or outbound message.

## Changes

- Apex uses Raqib, Haris, Rashid and Hatif, with no portrait repeated from Catalyst or Ascend.
- Arabic and English examples address building-material suppliers, multi-branch garages, fit-out contractors and car-rental businesses. Outcomes and ROI are scoping targets using the owner's numbers, not guaranteed results.
- Equal desktop card heights, consistent portrait sizes, and a collapsed-by-default disclosure for examples, metrics and ROI. Outcomes remain visible.
- Private feature-row/action-link components, explicit footer branches, localized disclosure labels, stable controlled IDs, and consolidated portrait styles.

## Local evidence

- Production build and `git diff --check`: pass.
- Targeted Apex, plan, Paymob and frontend API contract tests: 37 pass.
- Homepage browser suite: 364 checks pass, including English/Arabic, 320–1440px, disclosure click/Enter/Space, controlled content, image loading, distinct portraits, equal desktop heights, overflow, accessibility, visitor checkout and synthetic Apex-holder routing.
- Apex request browser suite: 30 checks pass; synthetic API only, no real request sent.
- Screenshots reviewed for English desktop and Arabic mobile. Full-card screenshots include existing fixed navigation/chat overlays.
- The initial homepage run tried to decode off-screen lazy images too early. The test now scrolls each image into view and waits for a successful load before asserting it; the complete rerun passed.
- The manual design scan reports existing status-accent rules and the approved 0.85/0.95rem typography as warnings/advisories. These do not represent new functional defects; the relevant browser accessibility checks pass.

## Release baseline and rollback

Vercel inspection confirms the current READY Green production deployment is `dpl_HKxh1Y6QevjENmuikgwz3iMb9rZo`, project `bznsflow-main`, serving `www.bznsflowai.com` and `bznsflowai.com`. Recheck immediately before promotion and retain that deployment for frontend rollback. No backend rollback is required.

## Deployment evidence

The isolated committed archive passed a clean lockfile install and production build. The upload-manifest review found tracked Claude development tools in the legacy upload set; `.claude/` and `.impeccable/` are now excluded alongside the existing Codex exclusions.

A fresh dependency audit reports 6 vulnerable packages (1 moderate, 5 high), from the already-recorded body-parser, fast-uri and zod advisories and their Vercel dependency chains. The lockfile is unchanged. These remain a follow-up; this release does not claim a clean dependency audit.

- Runtime refactor commit: `eaf95255d4da6fa6cd4c2b07b4b3fae251ad8cf4`.
- Released source commit, including upload exclusions: `cbbd0638002e803bf222f8b6ea5a52484e350fd4`. Vercel's deployment API confirms the same `sourceCommit` metadata.
- READY candidate and promoted deployment: `dpl_EGoay5ckiEsLtiH5AY3u99Y6xj23`, `https://bznsflow-main-5bm63tgx9-yungahmed1100-7330s-projects.vercel.app`.
- The final upload manifest contained 1,036 regular files, with no private env files, local tooling, work/test artifacts or the unrelated untracked logo.
- Anonymous candidate inspection stopped at Vercel deployment protection. Authenticated CLI access supplied a temporary candidate cookie for browser verification; protection stayed enabled and the local cookie file was removed afterward.
- Candidate browser checks passed for Arabic and English at 375, 768 and 1280px: four portraits loaded, disclosure expanded/collapsed, equal desktop heights, no horizontal overflow, request routes opened, and zero page errors.
- The production baseline was rechecked immediately before promotion and still matched `dpl_HKxh1Y6QevjENmuikgwz3iMb9rZo`. Promotion succeeded, and inspection of `https://www.bznsflowai.com` resolves to the new READY deployment.
- The same signed-out browser checks passed on the public domain without a protection cookie. No forms were submitted and no outbound messages or payments were made. Apex-holder routing was verified synthetically in the local suite, not by changing a real account.
- Short post-release monitoring: 12/12 GETs returned HTTP 200 for `/`, `/en`, `/apex` and `/en/apex`, sampled three times from 11:07:38–11:07:58 UTC on 2026-10-27. This is a short smoke window, not a sustained uptime claim.
- Logs, screenshots, deployment metadata and monitoring results are retained in ignored `work/apex-cards-release/`. Rollback remains the previous deployment identified above; no backend state changed.
