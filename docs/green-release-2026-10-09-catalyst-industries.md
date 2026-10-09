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

## Automated release verification

The complete release checklist passed in stages. The initial `npm run test:release` passed the unit, typecheck, build, audit and shared browser stages, then stopped on outdated Catalyst browser expectations. After correcting those expectations and waiting for BznsBrain tab transitions, the Catalyst and remaining sector browser stages passed. This was not one uninterrupted passing invocation of the full command.

| Check | Observed result |
| --- | --- |
| Unit inventory | 882 passed, 0 failed, including 54 Catalyst industry cases. |
| Convex typecheck, working-tree build and isolated-source build | Passed. |
| Dependency audit | 0 vulnerabilities at moderate threshold. |
| Shared browser suites | Auth 34; owner 47; review onboarding 22; synthetic WhatsApp connection 53; synthetic Instagram 40; Layla switch 152; dashboard 354; product setup 8; BznsBrain 1,403 checks passed. |
| Real-state sector browser suites | Catalyst 297; retail 441; retail-tech 490; dental 341; real estate 202 checks passed. Construction/automotive: 12/12 bilingual viewport scenarios passed. |
| Generated onboarding suggestions | Generation consistency and onboarding coverage checks passed. |
| Synthetic-input live Qwen evaluation | 59/60 quality checks passed across real estate, retail and dental. The remaining prompt-leak injection was blocked with `fallback:prompt_leak` and a safe team-contact fallback. This is not a 60/60 quality result or a model evaluation of every new industry. |

Qwen Plus timing: p50 1,769 ms, p95 3,026 ms; average 770 input / 71 output tokens. Local report: `work/eval/layla-ai-2026-10-09T12-33-24-032Z.json`.

Before promotion, the existing authenticated owner session returned Catalyst plan access and successful dashboard/customer read actions. WhatsApp and Instagram surfaces returned active state; that is readiness evidence, not delivery evidence.

## Deployment

- Runtime source: `d085b5b7d7e26a6f432f9c365ebbcceb8b2ad72a`, following implementation commit `52cea9c`.
- Isolated source archive: `work/release/d085b5b`; no environment files, cookies or private work artifacts included in the deployment.
- Convex production deployment to `rare-fish-465` succeeded after dry-run and typecheck. No schema or index deletion was required.
- Vercel production candidate: `dpl_EN6PZLjgbcUnRmWF9FQZQt93HoKw`, built successfully with source-commit metadata and initially deployed with `--skip-domain`.
- Candidate URL: `https://bznsflow-main-lq2a8jpka-yungahmed1100-7330s-projects.vercel.app`.
- Promotion succeeded; inspection of `https://www.bznsflowai.com` resolved to the new deployment with status Ready.
- Candidate setup returned 200. Authenticated candidate-host API probes were rejected by the configured canonical-host guard; it was left intact. Authenticated checks use the canonical production domain after promotion.
- The live industry and BznsBrain assets matched the isolated committed build byte-for-byte, including Media labels and the production-quote starter: `industries-DGIsnDyW.js` and `brain-CrwfOtnI.js`.

## Live verification and limits

Post-promotion verification passed:

- 27 HTTP/API checks: public bilingual setup/dashboard/sign-in routes, legacy redirects, unauthenticated access denial, unsigned webhook rejection, existing owner session and authenticated dashboard/customer read actions.
- 24 authenticated Catalyst page cases: chats, broadcasts, customers and settings × English/Arabic × 320/768/1440 px. Four Catalyst tabs, selected-tab state, BznsBrain rendering, no horizontal overflow, no browser exceptions and no unexpected mutating UI requests were verified. The first smoke attempt used a visibility wait on the intentionally hidden mobile desktop navigation; changing the harness wait to element attachment allowed the existing responsive UI to be checked correctly. No runtime change was needed.
- Short post-release HTTP monitoring: three rounds, 12/12 expected responses across setup, dashboard, auth-session and unauthenticated dashboard access. This is a bounded observation window, not evidence of long-term availability.
- Zero outbound messages. Browser traffic was restricted to the canonical site and permitted read actions; other mutations and external requests were blocked.

Sanitized local evidence: `work/catalyst-production/live-smoke.json`, `live-assets.json` and `monitor.json`.

The implementation and release evidence were pushed to `origin/master`. A subsequent public setup fetch still returned 200 with the expected `manifest-c4c544a2.js` release bundle. The final redundant Vercel CLI inspection could not resolve `api.vercel.com` (`ENOTFOUND`); the earlier successful canonical-domain deployment inspection and direct live checks remain the deployment evidence. This CLI DNS failure is not a measured application outage.

No live WhatsApp/Instagram message, channel connection/disconnection, provider consent flow or real campaign was performed. Those provider interactions are not newly verified under Ahmed's automated-only instruction. Automated synthetic tests cover their application behavior; they cannot prove end-to-end provider delivery. The real owner smoke covers an existing authorized Catalyst account, not every customer account or fresh production signup.

Private artifacts and logs remain ignored under `work/catalyst-production/` and `/tmp`; no cookies, credentials or customer records are committed. UI rollback remains the previous deployment listed above with the additive Media backend retained.
