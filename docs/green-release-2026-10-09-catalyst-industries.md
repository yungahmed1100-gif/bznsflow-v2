# Green release — Catalyst industries, 2026-10-09

Ahmed authorized automated end-to-end verification followed by deployment and production promotion. He explicitly chose automated tests only. Scope is Catalyst; no Ascend operational pack is released.

## Change

24 dedicated bilingual industry starters plus Other (50 language variants), including the new Media & production sector. Media is carried through profile validation, routing, inquiry capture and generated onboarding suggestions. Existing owner documents are preserved. See `docs/catalyst-industries-2026-10-09.md` for template and test detail.

The real-state Catalyst browser suite had stale expectations for the pre-BznsBrain Settings menu and setup-reminder links. Its assertions now check BznsBrain/Channels and the actual bzns.md/Catalog tabs, without weakening error, accessibility, layout or messaging assertions.

## Release boundary

- Baseline: `095e16e`, including the already-released mixed-country broadcast changes. Only the industry preparation and browser-test correction are new.
- Previous production: `dpl_CcvFtRnmhU7hCJWwzUiLnbKq8qM3`, verified Ready on `www.bznsflowai.com` before release.
- Convex target: `rare-fish-465`; Vercel project: `bznsflow-main`.
- No schema change, channel reconnection, credential change, broadcast switch change or outbound message.
- Build from committed source in an isolated archive; deploy backend before the website candidate and promote only after verification.
- UI rollback: promote the previous deployment above and retain the additive Media backend support and stored data.

## Verification in progress

Full release command, synthetic end-to-end journeys, real-state browser journeys, authenticated read-only production probes and a synthetic-input live Qwen evaluation are being checked. Final results and deployment identifiers will be recorded below. Real WhatsApp/Instagram delivery and provider consent flows are excluded by Ahmed's automated-only instruction and must not be represented as newly verified.
