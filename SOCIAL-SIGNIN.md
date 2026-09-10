# Social sign-in — setup runbook

How to switch on the Google, Microsoft and LinkedIn buttons on `/signin`.

The code is already deployed and provider-agnostic. **A provider with no
credentials simply has no button** — `GET /api/auth-session` reports which are
configured and the page renders only those. So these three can be enabled one at
a time, in any order, with no code change.

- Flow and provider registry: [`api/_lib/oidc.js`](api/_lib/oidc.js)
- Handlers: [`api/auth-oauth.js`](api/auth-oauth.js) → [`api/auth-callback.js`](api/auth-callback.js)
- Schema: [`web-chatbot/migrations/004-oauth-identities.sql`](web-chatbot/migrations/004-oauth-identities.sql)
- Cookie: `bf_oauth`, documented in [COOKIES.md](COOKIES.md)

---

## 0. Before any provider

**Apply the migration.** Supabase Dashboard → SQL Editor → paste
`web-chatbot/migrations/004-oauth-identities.sql` → Run. It is additive and safe
to re-run. Then run the verification queries at the bottom of that file —
especially #5, which proves an address arriving by Google and by emailed code
lands on **one** account rather than two.

**The redirect URI is the same for all three:**

```
https://www.bznsflowai.com/api/auth-callback
```

plus, for local testing with `npm run dev:api`:

```
http://localhost:3000/api/auth-callback
```

Three things to know about that URI:

- **Wildcards are not allowed by any of the three providers.** Vercel's
  per-deploy preview URLs therefore can never be registered. Test locally, then
  verify on production.
- **Google and Microsoft accept the `localhost` entry. LinkedIn accepts
  neither `localhost` nor plain `http`** — LinkedIn can only be exercised on the
  real domain.
- It must match **exactly**: no trailing slash, no query string.

Set every variable in **both** the Production and Preview environments:

```bash
npx vercel env add GOOGLE_CLIENT_ID production
```

Never put a secret in `vercel.json` — it is committed.

---

## 1. Google — about 10 minutes, free

1. Go to <https://console.cloud.google.com> and create a project named
   **BznsFlow**.
2. **APIs & Services → OAuth consent screen** → user type **External** → Create.
3. Fill in: app name `BznsFlow`, user support email, home page
   `https://www.bznsflowai.com`, privacy policy URL, developer contact email.

   > **Leave the app logo blank for now.** Uploading one triggers Google's brand
   > verification review, which takes days and blocks nothing else. Add it after
   > launch.

4. **Authorised domains:** `bznsflowai.com` — the apex only. No `https://`, no
   `www.`, no trailing slash.
5. **Scopes** → add exactly three: `openid`, `.../auth/userinfo.email`,
   `.../auth/userinfo.profile`. All three are **non-sensitive**, which is the
   whole point — an app requesting only these needs no Google verification review.
6. **Publish app** → confirm. The status must read *In production*.

   > This is the step people miss. While the app is in *Testing*, only the ≤100
   > addresses you explicitly list can sign in — so it works for you and fails
   > for every customer, with no obvious error.

7. **Credentials → Create credentials → OAuth client ID → Web application.**
   - *Authorised JavaScript origins:* **leave empty.** We use no browser SDK.
   - *Authorised redirect URIs:* the two from §0.
8. Copy the client ID and secret. The secret is shown once — you can replace it,
   never re-read it.

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Google's ID token carries a real `email_verified` boolean, so account linking is
straightforward. It also carries **`hd`** — the Workspace domain — which is a
free signal that this is a *work* Google account rather than a personal Gmail.
Worth capturing later as lead-quality data.

---

## 2. Microsoft / Entra ID — about 15 minutes, free

The strongest of the three for the GCC market: with the settings below, every
sign-in yields a corporate email address.

1. <https://entra.microsoft.com> → **App registrations → New registration.**
2. Name: `BznsFlow Web Sign-In`.
3. **Supported account types — the one consequential choice.** Pick
   **Accounts in any organizational directory (Multitenant)**, which maps to the
   `organizations` authority.

   > Do **not** choose the option that adds personal Microsoft accounts unless
   > you have read the nOAuth note in `api/_lib/oidc.js`. On a personal account
   > the `email` claim is set by the user and verified by nobody, so an app that
   > finds accounts by email alone lets anyone claim `ceo@yourcustomer.com`.
   > `organizations` removes that population entirely.

4. **Redirect URI** → platform **Web** → the production URI. Then open
   **Authentication** and add the `localhost` one. Leave implicit grant **off**.
5. Copy **Application (client) ID** from Overview.
6. **Certificates & secrets → New client secret.** Copy the **Value** (not the
   Secret ID) immediately — it is masked once you navigate away.

   > Entra caps secret lifetime at 24 months. **Put the expiry in a calendar
   > reminder now.** An expired secret is a silent, total outage of this button.

7. **API permissions → Microsoft Graph → Delegated** → `openid`, `profile`,
   `email`. Nothing else.

   > Do **not** add `User.Read`. We never call Graph, and its presence makes some
   > tenants' consent policies demand an admin — which blocks sign-ins you will
   > never see an error for.

8. **Token configuration → Add optional claim → ID → `email`.** Accept the
   prompt to turn on the matching Graph permission. Also add **`xms_edov`** while
   you are there — it is the "email domain owner verified" flag the linking rule
   prefers.

```
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_TENANT=organizations
```

**Expect a consent warning until publisher verification is done.** A multitenant
app without a verified publisher shows an "unverified" notice to users in other
tenants, and tenants with strict consent settings block it outright. Verification
needs a Microsoft Partner Network account with a verified MPN ID, associated
under *Branding & properties*. Budget about a week. You can ship without it, but
expect measurable drop-off from enterprise tenants until it lands.

---

## 3. LinkedIn — about 20 minutes, plus verification lead time

**Start this first even though it ships last** — the page-verification step is
the long pole and nothing else waits on it.

1. **Prerequisite:** a **LinkedIn Company Page** for BznsFlow, with you as a
   **Super Admin**. Create one at <https://linkedin.com/company/setup/new> if it
   does not exist.
2. <https://linkedin.com/developers/apps> → **Create app.** Attach the company
   page, add a logo and a privacy policy URL.
3. **Settings tab → Verify.** LinkedIn generates a link that a Super Admin of
   that page must open. **No products can be requested until this passes.**
4. **Products tab → "Sign In with LinkedIn using OpenID Connect" → Request
   access.** Self-serve, usually granted within minutes.

   > Do **not** request the legacy "Sign In with LinkedIn" (the v1 product using
   > `r_liteprofile` and `r_emailaddress`). It is deprecated and is not granted
   > to new apps; requesting it wastes a round of review.

5. **Auth tab → Authorized redirect URLs** → the production URI only. HTTPS,
   exact match, no localhost.
6. Copy the client ID and Primary Client Secret.

```
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

Two implementation notes already handled in the registry, worth knowing:

- **LinkedIn does not support PKCE.** The registry sets `supportsPkce: false`;
  sending `code_challenge` yields an opaque `invalid_request`. Security is
  unaffected — we have a confidential client secret plus the state cookie.
- **What you actually get** is `sub`, `email`, `email_verified`, `name` and
  `locale`. You do **not** get company, job title or industry — those need
  partner-gated products that a small app will not be granted. So LinkedIn's
  real edge over Google is a verified email and a real full name, which is a
  smaller edge than the B2B instinct suggests.

---

## 4. Verifying a provider actually works

Per provider, in order:

1. `npm run dev:api` (Vercel dev on :3000), with the localhost redirect URI
   registered. LinkedIn skips this step — test it on production.
2. **New account:** sign in with an address that has never been used. You should
   land on the **profile step**, with your name pre-filled from the provider.
   Complete it, then confirm the row reached the CRM sheet and that
   `sheet_synced` is true.
3. **Returning account:** sign out, sign in again. You should go straight to the
   confirmation, skipping the profile.
4. **The linking test — the one that matters.** Sign in with the same address via
   the emailed code. It must resolve to the *same* account:
   ```sql
   select email, count(*) from public.web_accounts
    group by email having count(*) > 1;
   ```
   Zero rows. Any result means the linking rule is broken and you are creating
   duplicate leads.
5. **Cancel** at the provider's consent screen → you return to `/signin` with a
   readable message and no session.
6. Repeat 2–5 on the real domain after deploying. Production is the first place
   the non-localhost redirect URI is ever exercised.

**Deploying:** this repo does **not** deploy from git.

```bash
npx vercel deploy --prod
```

---

## What the code guarantees, so you don't have to check it by hand

`npm test` enforces these on every run:

- every provider in the registry has a button label in **both** languages;
- every failure code the handlers can emit has a message the page will show;
- every environment variable the API reads is listed in `.env.example`;
- every cookie the server can set is disclosed in `COOKIES.md`;
- both new functions declare a `maxDuration` in `vercel.json`.

`npm run test:auth-browser` additionally checks the buttons render, link
correctly, keep their Latin brand names inside Arabic copy, and do not overflow
at 390px.
