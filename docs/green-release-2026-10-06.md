# Green release — 2026-10-06 (Catalyst/Ascend setup)

Owner: Ahmed. He asked for this release ("commit changes and deploy to production so I can test myself"). This record separates what was observed from what is still pending.

## What shipped

Customer flow:
1. Ahmed grants an email at `/owner/access`.
2. The person signs up with that email.
3. **Setup Catalyst** and **Setup Ascend** appear in the home-page packages.
4. They lead to `/catalyst/setup` and `/ascend/setup`, which have saved progress, Add information (knowledge sources) and the human-handoff queue.

Signed-out visitors to Catalyst setup get a sign-in link. After sign-in it returns them to setup or the dashboard; the redirect only allows those paths.

## Release identity

| Item | Value |
|---|---|
| Source | `c5ac782` on `master`, built from a clean `git archive` (no env files, no `work/`) |
| Vercel | `dpl_8jUHs2uBrWxTmE4uxfPGd8rhgEHt`, promoted to www.bznsflowai.com |
| Rollback target | `dpl_8rYA2odgxGb9MUUbZZjiNg7JZ7cD` (source `a1c150c`) |
| Paused-messaging fallback | `dpl_H5t8aMZTgSqbKWPCDynU24Qroqxf` (still available) |
| Convex | `rare-fish-465`, deployed 2026-10-06T10:04:36Z |

**Convex changes:**
- Additive indexes only: product setup progress and audit, knowledge sources, drafts and audit, handoff audit, `blueMessages.by_conversation_direction_at`.
- New functions `productSetup:execute`, `knowledgeSources:execute` and `reviewMaintenance:downgradeJourneyStep` were confirmed in the function spec.
- The dry run reported an empty Node.js-actions version change. No Convex function uses `"use node"`.

**Rollback procedure:**
1. Promote `dpl_8rYA2o…`.
2. Run `npx convex run reviewMaintenance:downgradeJourneyStep '{}'` against `rare-fish-465` until it reports 0.
3. Never roll back the schema; fix forward.

## Local verification before release

**Clean archive:**
- 744/744 unit tests, including a new test: a grant made before signup applies at first sign-in by code and by OAuth with mixed-case email, and revoking removes it.
- Production build passed, with 12 API functions.

**Working tree:**
- Convex typecheck and `npm audit` passed with 0 vulnerabilities:
  - `source-map-js` bumped;
  - mammoth's CLI-only `argparse` pinned to 2.x, which drops `sprintf-js`; it is not part of the browser bundle.

**Browser suites:**

| Suite | Result |
|---|---|
| auth | 34 |
| owner | 44 |
| onboarding | 28 |
| review onboarding | 16 |
| WhatsApp setup | 62 |
| Instagram | 32 |
| dashboard | 334 |
| setup pages | 12 |
| Catalyst | 197 |
| retail | 441 |
| electronics | 490 |
| dental | 341 |
| real estate | 202 |
| construction/automotive | 12/12 scenarios |

- Dental timed out once inside the full run and passed alone (341). Treated as load flakiness.
- All browser suites use mocked APIs. They are implementation evidence, not live-provider evidence.

## Production observations (unauthenticated)

| Check | Result |
|---|---|
| `/api/product-setup?product=bogus` | 400 `invalid_product` |
| `?product=catalyst`, no cookie | 401 (the query survives the rewrite) |
| knowledge GET, no cookie | 401 |
| POST, foreign Origin | 403 `origin` |
| POST, `operation: nope` | 400 |
| setup POST, invalid body | 400 |
| Home, setup pages (EN/AR), sign-in, dashboard, owner access | 200; setup pages noindex |
| Apex | 308 to www |
| Webhook GET/POST, unsigned | 403 |

- `tests/layla-https.mjs` expects 401 for bare `/api/layla-meta` and `/api/layla-meta-readiness`, but both return 410 `pilot_retired`. The previous production deployment returns the same, so this is a stale script expectation, not a regression.
- Runtime logs since promotion show no 5xx. The only error-level lines are the known `url.parse()` deprecation warnings.

## Not yet observed

- Authenticated use on production. Ahmed is testing himself.
- A real inbound WhatsApp message on this deployment. No inbound webhook traffic arrived during the check window. The binding now reads published knowledge; that read is bounded and covered by unit tests.
- Invitation email delivery.
- New-customer WhatsApp connection. It still needs Meta's Cloud-API-only Embedded Signup configuration. Customers can complete facts, knowledge, preview, handoffs and Ascend operations without it.

## Remaining engineering

The following still remain:
- Step 5 should-fix items, chiefly distinct bilingual refusal messages for not granted, upgrade needed and manager needed, plus handoff badge wiring.
- The step 6 scenario E2E suite.
- `docs/product-redesign-verification.md`.

The tracker is in `docs/SESSION-CHECKPOINT.md`.

Legacy handoff rows marked `takeover` show as "Waiting for team" and can inflate the badge. Resolve clears them.

## Post-release health (Vercel connector, ~15:50 UTC)

- Runtime error clusters since 10:00 UTC show only the existing `url.parse()` deprecation warning (first seen 2026-09-11). There are no 5xx responses.
- Real sign-in, setup and access-admin requests returned 200.
- Green Convex `blueMessaging:dispatch` runs every 5–6 minutes. Every run succeeds, and the matching worker requests return 200.
- **Existing noise, not caused by this release:** about one request per minute to `/api/layla-meta-worker` returns 401 `worker_auth`.
  - The source is the Supabase-era Cloudflare scheduler `ops/layla-minute-worker.js`. It still sends the old `LAYLA_META_WORKER_SECRET`, while Green accepts only `GREEN_MESSAGING_WORKER_SECRET`.
  - Convex crons now drive the queue, so this third scheduler is redundant. `docs/backend-migration-state.md` lists it under "three schedulers for one queue".
  - Recommendation: Ahmed disables the Cloudflare cron trigger. Do not give it the Green secret.

## Second release, 2026-10-07: bzns.md, Layla tones, guardrails (`0184dba`)

Ahmed asked for this release ("push to production after stress and smoke testing"). He ran `work/release/ship.sh` himself after the agent's own deploy command was refused by the permission check.

### Release identity

| Item | Value |
|---|---|
| Source | `0184dba` on `master` (with `d37c848`), built from a clean `git archive`; 12 API functions |
| Vercel | `dpl_27LnDpq8mkPtfYekcmhbLV7a83Zu`, promoted to www.bznsflowai.com 2026-10-07 05:44 UTC |
| Rollback target | `dpl_8jUHs2uBrWxTmE4uxfPGd8rhgEHt` |
| Convex | `rare-fish-465`, deployed before promotion |

All Convex changes are additive optional fields:
- `profile.tone`;
- `blueReviewSessions.bznsDraft`/`bznsPublished`;
- the ingest event `handoffReason`.

The new module `laylaReply` contains no functions.

**Rollback:** promote the target above and keep Convex. The old build works against the new backend.

### What shipped

- One `bzns.md` business document with sector templates, an editor and server-side publish.
- Three Layla styles: Professional & sharp, Helpful & sweet, Informative & nice.
- A welcome naming the business and Layla that asks for the name and interest first.
- Answers quoted word for word from the owner's FAQ (including reworded questions) and sector sections.
- Small talk ("thanks", "ok", emoji) never handed to the team.
- Guardrails, each with its own reason: negotiation, abuse, legal/finance advice, media and long text, the per-chat loop and flood guard.
- Bursts paced rather than dropped.

### Verification before release

- **Unit tests:** 873/873.
- **Quality rubric:** checked on every reply across 24 conversation types in three tones.
- **Stress:** 300 customers × 4 messages, webhook replays, a double worker hand-off, a republish mid-burst, a bot ping-pong.
- **Convex typecheck, build and audit:** clean.
- **Browser suites:** all passed, including editor 136, dashboard 338, Catalyst 197, retail 441, electronics 490, dental 341, real estate 202, and construction/automotive 12/12.

### Production observations (2026-10-07, unauthenticated)

- **Pages:** EN and AR home, sign-in, setup (Catalyst and Ascend), the Layla dashboard, privacy, data deletion and owner access all return 200. The apex returns 308.
- **API checks:**

  | Request | Result |
  |---|---|
  | product setup, bogus product | 400 |
  | product setup, no cookie | 401 |
  | foreign Origin | 403 |
  | customer `bzns_publish`, no session | 401 |
  | knowledge, no session | 401 |
  | dashboard, no session | 401 |
  | webhook GET, wrong token | 403 |
  | webhook POST, unsigned | 403 |
  | signed-out customer GET | an empty synthetic draft, no data |

- **Concurrency:** 25 parallel home-page requests all returned 200; 25 parallel unsigned webhook POSTs all returned 403; no 5xx.
- **Vercel runtime errors since promotion:** only the known `url.parse()` deprecation warning.
- **Convex:** `blueMessaging:maintain`, `blueCampaign:maintain` and `blueHasib:sweepPhotos` run every minute without errors.

### Not yet observed

- An authenticated owner publishing a `bzns.md` in production.
- A real inbound WhatsApp message answered by this build.
