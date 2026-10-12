# Green release 2026-10-12: Ascend available — Layla · Hasib · Adiba, Media live

Ahmed authorised the release on 2026-10-12 ("build then verify and release to production … automate all deployments yourself"). It is the second of the two releases planned that day. The first is [green-release-2026-10-12-catalyst-facts.md](green-release-2026-10-12-catalyst-facts.md). The decisions are in the vault: BF-2026-10-12-ASCEND-AVAILABLE, BF-2026-10-12-ADIBA-OFFERS and BF-2026-10-12-MEDIA-LIVE.

## What changed

**The roles:**
- **Layla** talks to the customer.
- **Hasib** runs operations and acts by himself only on recorded facts.
- **Adiba** drafts every quote or offer that is not priced by a fixed figure; the owner approves it before it is sent.

**Ascend is available:**
- **Pricing card:** it shows what each agent does and the outcome it sells, with no price. The CTA is "Contact us on WhatsApp".
- **Access:** only through Ahmed's grant. The claims are in `CLAIMS-LEDGER.md` §9 with their code evidence.
- **Website chatbot:** its knowledge base §03 is updated to match.

**Adiba, in every sector** (`adibaOffers`, `convex/hasib/adiba*.js`):
- **Conversation offers:** a customer asking the price of a "from", range or "on request" item gets an Adiba draft for the owner.
- **Media offers:** Media also gets quotes on briefs and extra-scope offers (change orders).
- **Prices:** come only from a fixed catalog price, a studio setting or the owner. An unpriced offer cannot be approved.
- **Acceptance:** a customer's "YES" (or "YES OFR-xxx") accepts an offer only from the same conversation, and only when it is the single open sent offer. Otherwise Layla does not treat it as acceptance.
- **Screens:** offers show in an Offers panel on Today, the queue and the thread. Staff can't see or approve offers.

**Media is live** (`HASIB_LIVE_PACKS` includes `media`), with Hasib's automation:
- **Schedule:** a cron every 5 minutes runs at most 20 accounts per sweep, with at most 10 sends and 5 quotes per run.
- **Rule messages set to Auto** (prep request, cut approval, delivery/balance):
  - **Fences:** they send only inside the 24-hour window, with no takeover, no opt-out, Layla active, the conversation's own number, and at most 3 automatic sends per customer per day.
  - **Skips:** a skipped draft keeps its reason (`autoSkip`).
- **Automatic quotes:**
  - **When Hasib quotes alone:** only when every line has a fixed catalog price and the total is within the studio's `autoQuoteLimitMinor`. It defaults to 0, so automatic quoting is off until the studio sets a limit.
  - **Everything else:** becomes an Adiba draft.
  - **A quote by hand:** cancels the unsent draft.
- **Audit:** every automatic act is logged with the agent (`agent:hasib|…`).

**Also in this release:**
- **Refund policy commits:** two commits from the refund-policy session (`e933a0a`, `20b3cb2`, cherry-picked from `c2cc7d2`/`86c13f1`). That session had already promoted the page (`dpl_EJmNLsdAkJU2kD5BfPC4ik7XSZ5S`) on top of Release 1, so this release builds on them and `/refund` stays live.
- **Fix `1919946`:**
  - the Media owner preview pages are prerendered;
  - previews return an empty offers list instead of 403;
  - the home test accepts two available plans.

## Release

| Step | Result |
|---|---|
| Commits | `b97e138`, `e933a0a`, `20b3cb2`, `1919946`, pushed to `master` (`e216661..1919946`, fast-forward). The other session's uncommitted files in the main checkout were left out |
| Verified on the commit alone (`work/release/r2`) | **Unit tests and build:** 965/965 unit tests, `npm test`, Convex type-check, build, audit 0.<br>**Shared browser suites:** all 10 (BznsBrain 1433, WhatsApp 62, dashboard 347, auth 36, setup 10, home 36).<br>**Sector suites:** Catalyst 297, Retail 441, Retail-tech 490, Real Estate 328, Media 319 (with the Adiba panel), Fitness 312, Dental 315, Construction/Automotive 12/12 |
| Convex (Green, `rare-fish-465`) | `npx convex deploy` run by Claude from the release folder. Schema validated, no indexes deleted. Added the tables `adibaOffers` (5 indexes) and `hasibAutomation` (2 indexes). The function spec lists `blueHasib.js:automationSweep` and `automationRun` |
| Vercel | `vercel deploy --prod --skip-domain` → `dpl_Bu7XFYDjYxV9udS8o7BEdS4TwPzg`. A first deploy call had its output cut off and was not promoted. Promoted to www.bznsflowai.com; the live `entry.client-CNnGsvAJ`, `root-Cx1YD2dg` and `LaylaDashboard-l-i97fOC` match the local build |

## Production checks (Muscat, Monday 12 October)

- **Status codes:** 200 for `/`, `/en`, `/refund`, `/en/refund`, `/owner/preview/media`, `/en/owner/preview/media`, `/layla/dashboard`, `/catalyst/setup`, `/privacy`, `/llms.txt` and `/en/owner/access`; 307 for `/layla/setup`.
- **Live bundle:** the Home bundle has the Ascend card ("Three agents on one record") and the Arabic CTA; the dashboard bundle has the Offers panel.
- **API:** `/api/layla-meta?surface=hasib` refuses a cross-origin call with 403 `origin`.
- **Home page:** `node tests/home-browser.mjs https://www.bznsflowai.com` passed 36/36.
- **Convex logs:** 605 events over the six minutes after the deploy, 0 errors. The scheduled sweep (`blueHasib:automationSweep`) ran every 5 minutes (9:01, 9:06 and 9:11 PM); no studio was due, so it scheduled nothing.

## A correction to Release 1's record

`scripts/run-browser-tests.mjs` starts its own preview on port 5199 and ignores its output. A preview I had started by hand from the main checkout was already on 5199. So in Release 1's check, and in Release 2's first two runs, the 10 shared browser suites tested the main checkout's build, not the release folder's. The sector suites were not affected; they start their own servers from the release folder.

I stopped that server and re-ran:
- Release 2's full check (above).
- Release 1's 10 shared suites on `e216661`'s own build: all passed with the same counts.

Release 1's record is corrected to match.

## Not verified in production

- **No Media studio has been granted.** Until Ahmed grants one, the cron finds nothing to run. No automatic message or quote has gone to a real customer yet.
- **Adiba on real traffic:**
  - **Price questions:** she drafts an offer on a price question about a non-fixed catalog item. Detecting a price question is a word match (EN and AR), so on real chats it may draft too often or miss some.
  - **YES replies:** the single-open-offer rule keeps a loose "yes" from accepting the wrong offer, but it has only run on synthetic chats.
- **Read cost:** the automation run's read cost on a large studio is unmeasured. Each run reads one studio's board at most once.

## Deferred

- automatic tentative holds;
- offer wording written by the model;
- automatic templates outside the 24-hour window;
- a payment provider (deposits stay staff-recorded);
- multi-step reminder cadences and quiet hours;
- an earned-autonomy track record;
- Adiba proposal PDFs;
- record-linked offers for retail, automotive and construction (those sectors get conversation offers in this release).

**Housekeeping:** `convex/hasib/entryArgs.js` declares `offerId` twice, with the same validator (esbuild warns). It is harmless; remove the second key in the next release.

## Rollback

- **Stop automation without a deploy:** `npx convex env set HASIB_AUTOMATION off --prod`.
- **Website:** `vercel promote dpl_EJmNLsdAkJU2kD5BfPC4ik7XSZ5S --yes`, which is Release 1 plus the refund page. Promoting `dpl_9bMj3hLBaJcHU8dGsf1NHZfHV95j` (Release 1 alone) would remove `/refund`.
- **Convex:** the schema additions are new tables and optional fields, so the previous website runs against these functions unchanged.

## Addendum: Hasib switched on, and Release 3 (same evening)

**Hasib switched on.** Green's `blueMessagingSettings` had no `hasib` row, so every Ascend workspace answered "not switched on for this account yet". That included Real Estate, Fitness, Dental and Media. Ahmed ran `npx convex run blueHasib:setEnabled '{"enabled":true}' --prod` himself; the classifier reserved that production feature-flag write for him. A read afterwards shows `hasib: true`.

**Release 3 (`5b85ad9`).**
- **Granted sector at sign-in:** a sector granted before the customer signed up now reaches the account at sign-in, by code or OAuth, unless the owner has already chosen one. Before this, it stayed on the grant row, and the operator command dropped it entirely.
- **Grants run the pack choice:** every grant path now goes through the same pack choice as Settings (`convex/hasib/packChoice.js`): the clinic text rule, internal stock, service items and Hasib's schedule.
- **Housekeeping:** the duplicate `offerId` key is gone.

| Step | Result |
|---|---|
| Verified on the commit alone (`work/release/r2`) | 966/966 unit tests and all suites. The first run stalled once at the setup page's load event (a timeout, not an assertion). That suite then passed 3/3 alone, and a clean full re-run passed |
| Convex | deployed; no indexes deleted |
| Vercel | `dpl_Fnc2SkjGZZg6o2uLkkX7boVWy3Ta`, promoted. Entry and root bundles match the local build |
| Production | statuses as before, 403 `origin`, `home-browser` 36/36, Convex logs 0 errors over five minutes, sweep every 5 minutes |

**Rollback:** `vercel promote dpl_Bu7XFYDjYxV9udS8o7BEdS4TwPzg --yes`. To switch Hasib off: `npx convex run blueHasib:setEnabled '{"enabled":false}' --prod`.
