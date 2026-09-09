# Security headers

Set in `vercel.json` under `headers`, applied to every route. This file exists
because JSON cannot carry comments and every one of these has a reason.

| Header | Value | Why |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Vercel already serves HTTPS; this stops the first plaintext request a user's typed `bznsflowai.com` would otherwise make. |
| `X-Frame-Options` | `DENY` | Nothing here should ever be framed. This is what actually protects `/signin` from clickjacking — `frame-ancestors` below is report-only and enforces nothing. |
| `X-Content-Type-Options` | `nosniff` | Stops a browser second-guessing a declared content type. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Outbound links to WhatsApp and Google Calendar leak the origin, not the full path. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | The site needs none of these; denying them means an injected script cannot ask either. |
| `Content-Security-Policy-Report-Only` | see below | Reports violations without blocking. **Deliberately not enforced — see below.** |

`/assets/*` additionally gets `Cache-Control: public, max-age=31536000, immutable`,
which is safe because Vite fingerprints those filenames — a changed file gets a
changed name, so a year-long cache can never serve stale code.

## Why the CSP is report-only

Not caution. Enforcing it today would break the site on the next deploy.

The built HTML carries **four executable inline scripts**:

1. the scroll-reveal gate in `index.html`, which must run before first paint;
2. the Meta Pixel bootstrap in `index.html`;
3. and two that `vite-react-ssg` injects at build time.

A strict policy would have to allow these by hash. The first two are stable, but
**the two vite-react-ssg emits change hash on every build** — so a hash-pinned
policy would start blocking hydration the first time anyone ran `npm run build`,
with no error message beyond a console violation.

`'unsafe-inline'` in `script-src` is therefore doing real work here, and a CSP
carrying it is not buying much against XSS. That is worth saying plainly rather
than dressing up: **this policy is currently a reporting tool, not a defence.**

There are also 28 inline `style=` attributes from React, so `style-src` needs
`'unsafe-inline'` regardless of what happens to the scripts.

## Making it enforceable

In rough order of value:

1. Move the two `index.html` inline scripts into imported modules, so they load
   from `'self'` and need no hash.
2. Replace the Google Fonts `onload="this.media='all'"` attribute — an inline
   event handler needs `'unsafe-hashes'`, which is worse than the trick is worth.
3. Once only vite-react-ssg's own inline scripts remain, either adopt a nonce
   (needs a request-time render, which a static prerender does not have) or
   generate the hashes as a build step that rewrites the policy.

Until step 3, keep it report-only. Flipping it early trades a real outage for a
theoretical protection.

## What is deliberately not here

**No cookie consent gate.** The Meta Pixel initialises unconditionally on first
paint for every visitor, including EU/UK. This is a known, accepted gap — see
`COOKIES.md`, which documents the mechanism and the two available remedies. It
is a business decision, not an oversight.

## Cookies

All three first-party cookies are `SameSite=Lax`, `Secure`, same-origin only, and
none is needed cross-site — so Chrome's third-party cookie restrictions do not
affect sign-in. `bf_session` and `bf_csrf` are set by the server via `Set-Cookie`,
which also exempts them from Safari ITP's 7-day cap on script-written cookies.
Full table in `COOKIES.md`.
