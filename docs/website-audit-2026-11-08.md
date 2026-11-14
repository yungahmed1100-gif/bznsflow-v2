# Website audit and motion preview — 8 November 2026

Local source baseline: `aecd3f2`. Changes are uncommitted. Green production was not deployed, queried for customer data, or mutated by this work. Provider, email, payment and messaging effects in tests are synthetic.

## User direction

Bold public pages within the existing BznsFlow identity; familiar dashboards. The first preview pairs a cinematic five-step scroll-highlight story with cuboids that reorganize at each step. Loading dots appear only for real loading states. The user selected Motion's scroll-highlight, jumping-dots and particle-orb examples as references and authorized original SVG/visual design. The implementation is original and uses the free installed Motion package; gated example source was not obtained.

## Implementation

- The hero retains existing approved copy, conversion links and labeled example. Natural scroll selects the step; keyboard controls also select and scroll to a step.
- Original WebGL2 instanced cuboids use the existing five annotation colors, with a deterministic SVG fallback. Small screens use fewer cuboids. The renderer pauses offscreen/hidden and retains its fallback on context loss.
- A live `useSyncExternalStore` media listener controls reduced motion. The installed Motion 14 hook held its initial preference during a runtime preference change; an instrumented browser regression demonstrated this behavior.
- A shared delayed, localized loading status now serves dashboard/setup loading. The dots remain still under reduced motion and unmount on completion/error.
- The closed mobile chat launcher yields while the story is visible; focused launchers and open chat remain available.

## Reproduced defects and corrections

| Defect | Correction and acceptance |
| --- | --- |
| A spoken STOP left consent active | Recognized speech/captions pass through the deterministic opt-out rule before automation; English/Arabic regression cases verify revoked consent and no pending reply. |
| Paused ingress created replies when media completed | Initial suppression is retained on message media and reapplied when the reading attaches. |
| An old generation could consume a newly completed reading | Each media completion gets a fresh pending key, preserving accumulated facts and latest inbound context while fencing the old generation. |
| Media after the twentieth file stayed pending | The existing 20-download bound is retained; overflow receives explicit `failed` / `media_batch_limit` results. Overflow files are not downloaded. |
| A receipt arriving before the worker result prevented a broadcast chat | Chat creation runs for accepted outcomes regardless of that ordering and remains idempotent. |
| Mobile dashboard collapsed in the production build | The final mobile layout selector now outranks base layout declarations independent of extracted CSS order; the browser suite asserts usable pane height. |
| Dashboard keyboard focus fell back to a thinner base rule | Shared loading CSS is imported globally and the dashboard focus selector preserves the intended 3px ring in the extracted production CSS. |
| Mobile privacy tables could not be keyboard-scrolled | Shared `LegalTable` removes duplicate renderers and provides a named, focusable scroll region with visible focus. |

The media schema adds an optional `suppressAutomation` boolean. A future authorized release must include this additive Convex schema change before website/API promotion.

## Verification and evidence

- 1,233 unit tests passed, including six new messaging/broadcast cases that failed before their fixes.
- 130 new hero/loading browser checks passed: Arabic/English, 320–1440px, short screens, scroll/reverse, keyboard, actual WebGL draw counts, SVG fallback, live reduced-motion changes, hidden/offscreen rendering, context loss, hydration and hero accessibility.
- 364 existing home-page checks passed. Accessibility collection now samples settled reveal states instead of transient fade opacity.
- The route sweep covered 56 paths at 1440px and 390px, finding the privacy-table issue. The final repeat passed all 112 route/viewport audits with zero page findings, failed local assets or broken internal links. Its protected-route scope is **signed-out render smoke**, not proof of backend authorization. Dedicated auth, plan, employee, tenant, MCP and workflow suites supply the complementary coverage.
- The final `npm run test:release` exited 0: all 1,233 unit tests, Convex typecheck, production build, dependency audit (zero vulnerabilities), all 17 shared browser suites, Catalyst, retail, retail-tech, real-estate, media, fitness, dental, HVAC, 12 construction/automotive scenarios and the 107-check Ascend end-to-end suite passed. Raw output: `work/hero-preview/release-final.log`.
- The final test review corrected a report-writing edge case: hash validation now tolerates a target page that failed before collecting IDs, preserving the original page failure in the report. The route suite passed again after that correction. `git diff --check` passed.

Repeatable entry points: `npm run test:release`; `node tests/hero-motion-browser.mjs <local-origin>`; `node tests/site-pages-browser.mjs <local-origin> --capture`.

`npm run test:cross-browser -- <local-origin>` prepares a Firefox/WebKit smoke pass across EN/AR desktop/mobile: story controls, layout overflow, legal-table keyboard access and signed-out routes. The script passed syntax check and independent review, but those engines were **not executed**: the isolated Firefox runtime download was stopped after prolonged slow transfer (the diagnostic ranged request transferred 457,948 bytes in about 14 seconds before timing out). Chromium evidence above does not establish Firefox or Safari acceptance. Install the matching Playwright engines into `work/playwright-browsers` before running this optional command.

Ignored evidence: `work/hero-preview/` (logs, baseline captures, direction contract); `work/site-audit/` (route report and public-page capture galleries). Preview captures also live under `.impeccable/review/`.

Independent reviews: code and JS reviewers found no remaining confirmed source issues after fixes. The finish reviewer scored mobile launcher overlap and sculpture scale resolved; that verdict covers those fixes, not a claim that the whole site has been redesigned. The documenter confirmed an ordinary Ledger extension and preserved existing system files.

## Release limits and follow-up

- This is local evidence. No live sign-in return, payment, Meta consent, WhatsApp delivery, email delivery or real model accuracy is claimed.
- The prior release recorded Qwen speech/vision quota refusal. This work has not rechecked or changed that account.
- Firefox/WebKit execution, physical-device keyboards/zoom and field performance remain unverified.
- Existing PRODUCT/Impeccable sidecar drift was reported without changing historical business facts or canonizing the preview into the design system.
- Production deployment and outbound effects require separate explicit authorization. Rollback is scoped to these runtime/test changes; preserve the user's Motion installation, agent configuration, untracked PDFs and logo.
