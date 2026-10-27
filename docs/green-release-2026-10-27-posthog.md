# Green release 2026-10-27: PostHog analytics on the public site

## Decision
Ahmed asked for PostHog on www.bznsflowai.com and chose:
- the US project the PostHog wizard linked (project 691003);
- public pages only;
- commit now and deploy when he says go.

The wizard only set up PostHog's MCP connection for Claude Code and Codex. It didn't change the website, so the site code was written by hand.

## What records
- **Page views** on every route change, and when visitors leave a page.
- **Autocapture** of clicks.
- **Session replay**, with every input masked.
- **Named site events:** `trackEvent()` (`src/lib/analytics.js`) now sends each event to PostHog under its own name, as well as to the Meta pixel. The events are `WhatsAppClick`, `HeroCallClick`, `AboutCallClick`, `StickyCTAClick`, `CheckoutClick`, `ChatOpen`, `ChatMessageSent`, `ChatHandoff`, `EmailClick` and `PlaybookSubmit`. Their properties are where the click came from and the plan; there are no names, emails or phone numbers.
- **No `identify` call.** Visitors stay anonymous (`person_profiles: 'identified_only'`).

## What never records
- **Private pages:** `/owner*`, `/layla*`, `/catalyst*`, `/reviewer*`, `/mcp*` and `/signin`, in Arabic and English.
  - Opened directly, they never load PostHog.
  - Reached inside the app, every event is dropped by `before_send` and replay is paused.
- **Any other host:** localhost, 127.0.0.1, `*.vercel.app` previews and test runs.

## How
- **Code:** `src/lib/posthog.js`. It holds the public project key `phc_…`, which is write-only and shipped in the page by design.
  - It loads `posthog-js` 1.438.9 (pinned, more than two weeks old) by dynamic import, 3 s after load and then at idle, the same timing as the Meta pixel.
  - That chunk is about 108 KB gzipped and isn't on the first-load path.
- **Hook-up:** `RootLayout.jsx` calls `followPage(pathname)` on every route change.
- **Proxy:** `vercel.json` rewrites `/ingest/static`, `/ingest/array` and `/ingest/*` to PostHog US. Ad blockers and the CSP (still `'self'`) don't stop it.
- **Disclosure:** `COOKIES.md` lists `ph_phc_…_posthog` in the analytics section and records the same no-consent gap as the Meta pixel.
  - The privacy policy (EN/AR) adds PostHog as a processor and the cookie row; its date is now 27 October 2026.

## Tests
- **`tests/posthog.test.mjs`** (5, in `test:access`):
  - every private route in `routes.ts` is excluded and every public route is included;
  - only the live hosts send;
  - the key is a public `phc_` key and the proxy rewrites are in order;
  - the disclosure appears in both languages.
- **`tests/posthog-browser.mjs`** (11, in `run-browser-tests.mjs`): Chromium maps www.bznsflowai.com to the local build, and /ingest is answered locally.
  - The home page and `/en/apex` send page views.
  - A WhatsApp click arrives as `WhatsAppClick`.
  - In-app navigation to the dashboard leaks nothing.
  - Five private pages opened directly make no /ingest request at all, and neither does 127.0.0.1.
- **Mutation checks: 5 of 5 caught.**
  - `isPrivatePath` always false;
  - any host allowed;
  - `/signin` dropped from the private list;
  - `before_send` removed;
  - private pages starting PostHog.
- PostHog drops events from headless browsers, so the browser test presents an ordinary Chrome user agent.

## Not done
- **Not deployed.** Before the deploy, check that the source contains the live commit.
- **After the deploy:**
  - the live home page posts to `/ingest/e/` and PostHog shows the events;
  - `/layla/dashboard` sends nothing.
  - `trailingSlash: false` makes Vercel redirect `/ingest/e/` to `/ingest/e` with a 308 that keeps the POST. Confirm that PostHog accepts it; if not, point `api_host` at `https://us.i.posthog.com` directly.
- **No consent banner** (see `COOKIES.md`).
- **Replay** only runs if it's enabled in PostHog project settings.
