# Green release 2026-10-12: Catalyst onboarding fixes and fact-based outcomes

Ahmed authorised the release on 2026-10-12 ("build then verify and release to production … automate all deployments yourself"). The scope is in [catalyst-onboarding-audit-2026-10-12.md](catalyst-onboarding-audit-2026-10-12.md) (A1–A10) plus the fact-based outcomes below. This release also carries the six-tab kit refactor's website (`751e451`), whose Convex part went live on 2026-10-11.

## What changed

**Onboarding (A1–A10):**
- **Publishing:** leaves out unreplaced template hints. Only the name, what you offer and the team contact block, and they are entered in "The essentials".
- **No grant:** a signed-in account without a grant sees "Your setup is saved" with the free-audit link.
- **Granted owners:** land in setup or the dashboard after sign-in. Each grant row can send the setup link on WhatsApp.
- **Channels:**
  - WhatsApp says first when Meta's connection is paused;
  - the ready checklist pre-ticks what the account proves;
  - Instagram says when it is off;
  - "Stuck?" links to WhatsApp.
- **Dashboard:** with no channel it shows "Connect a channel"; the empty inbox says how to try Layla now.
- **Docs:** the review script is rewritten for today's flow.

**Facts:**
- **Prices:** Layla's prices are tied to the item they are said about and keep "from" and ranges (`config/layla-prices.js`).
- **Outcomes:** conversations record when they became qualified and when Layla gave the team contact, with the required, captured and missing details. There is no queue; Layla keeps replying.
- **First-time stamps:** published, activated, first reply sent, qualified and referral.
- **Setup completion:** setup is recorded "completed" on the first live channel.
- **Access page:** a Stage column on `/owner/access`.

## Release

| Step | Result |
|---|---|
| Commit | `e216661` on `master`, pushed (`751e451..e216661`). The other session's files (`src/routes.ts`, `ascend/`, `design/`, `docs/ascend-*`, `docs/seo-audit-*`, `src/components/ascend-draft/`) were left out |
| Verified on the commit alone (`work/release/e216661`) | 947/947 unit tests, `npm test`, Convex type-check, build, audit 0, all 10 shared browser suites (BznsBrain 1433, WhatsApp 62, dashboard 347, auth 36, setup 10), Catalyst 297, Retail 441, Retail-tech 490, Real Estate 328, Media 314, Fitness 312, Dental 315, Construction/Automotive 12/12 |
| Local smoke | `work/onboarding-audit/walk-after.mjs` on the build: Publish now blocks only on the 3 essentials (was 13 bracket sections); paused WhatsApp, Instagram off, no-grant, no-channel and empty-inbox states all show |
| Convex (Green, `rare-fish-465`) | `npx convex deploy` run by Claude from the release folder. Schema validated, no indexes deleted |
| Vercel | `vercel deploy --prod --skip-domain` → `dpl_9bMj3hLBaJcHU8dGsf1NHZfHV95j`. Bundle names match the local build (`LaylaDashboard-BCRJcq2n`, `SignIn-Cmz_Ird4`, `AccessAdmin-Dpn4h1BR`). Promoted to www.bznsflowai.com |

## Production checks (Muscat, Monday 12 October)

- **Status codes:** 200 for `/`, `/en`, both dashboards, `/catalyst/setup`, `/privacy`, `/llms.txt` and `/en/owner/access`; 307 for `/layla/setup`.
- **Live bundle:** it contains the no-channel state, the "Qualified" count, the sign-in workspace redirect and the empty-inbox line.
- **API:** the Hasib surface refuses a cross-origin call with 403 `origin`.
- **Home page:** `node tests/home-browser.mjs https://www.bznsflowai.com` passed 36/36.
- **Convex logs:** 300 events after the deploy, 0 errors.
- **Name resolution on this machine:** curl intermittently could not resolve www.bznsflowai.com (exit code 6), while `dig` and public DNS resolved it. The checks were run pinned to Vercel's anycast address (`--resolve …:76.76.21.21`); the site answered normally.

## Not verified in production

- **Real owners:** no real owner has walked the new setup yet, and no signed-in session was exercised.
- **Price check on real traffic:** the stricter price check is proven on synthetic catalogs. On real traffic it may send more replies to the honest fallback, where a price was phrased loosely. Watch `ai.fallback = untraced_price` in `blueMessages`.

## Rollback

- **Website:** `vercel promote dpl_9hH6fwPK233PVSvypEgrVEnHcu8b --yes`, the Fitness and Dental release.
- **Convex:** the schema additions are optional fields, so the previous website runs against these functions unchanged.
