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

Pending: production candidate, promotion and public-domain checks. No deployment is claimed by this source record yet.
