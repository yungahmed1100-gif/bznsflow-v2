# Green production migration and readiness

Updated 2026-10-04. Green is `https://www.bznsflowai.com` / Vercel project
`bznsflow-main`. This document governs the staged move to a dedicated Green
Convex production deployment. Data cutover and broad messaging activation are separate gates. Do not certify
data cutover until the final source snapshot and destination verification pass.

## Intended outcome and boundaries

- Catalyst serves Layla; WhatsApp can be enabled only after an owner-controlled
  live smoke test. Instagram was approved by Meta on 2026-10-07 and opens with the Instagram release (see `docs/green-release-2026-10-07-instagram.md`).
- Ascend exposes Hasib only to accounts with active email grants. The server
  owner identity remains `ahmed@bznsflowai.com`; all grant/revoke actions must
  retain their audit records.
- Email OTP, Google and LinkedIn are the supported sign-in methods. Microsoft
  is disabled in the provider registry even if stale credentials exist.
- Convex is the post-cutover authority for auth, website leads/chat, customer
  state, and dashboards. Apps Script remains the OTP and CRM transport.
- Supabase remains intact as a read-only rollback archive. Do not delete it.
- No OTP challenges or sessions are migrated. Users authenticate again after
  cutover. OAuth accounts link to migrated accounts only through a verified
  provider email.

Data sensitivity: customer names, email addresses, phone numbers, business
facts, message history, and integration state. Peak workload and recovery
targets are not yet evidenced; assign and record them before G2. Accountable
owner: Ahmed.

## Current implementation state

- API Convex clients now require matching cloud/site endpoints and reject the
  known Blue deployment. `GREEN_CONVEX_CLOUD_URL` pins the expected production
  cloud URL when configured; Green will not fall back to the Blue review
  service secret. Isolated Blue deployments retain their legacy fallback.
- OAuth callbacks, Meta callbacks, review callbacks, and the Convex messaging
  worker derive their Green URL from `PUBLIC_SITE_ORIGIN`.
- Convex auth supports email OTP and OIDC identity linking. Microsoft is
  disabled. Instagram requires both `GREEN_INSTAGRAM_APPROVED=true` and
  `GREEN_INSTAGRAM_ENABLED=true` and is otherwise unavailable.
- The Layla worker switches to Convex only when `GREEN_CONVEX_CUTOVER=true`,
  the reviewed migration and `GREEN_STATE_PATHS_CONVEX` markers are true, and
  the Green Convex endpoint and service secret validate. Until cutover, the
  production Vercel deployment remains on its previous release.
- `scripts/check-green-readiness.mjs` reports environment gates without
  printing secret values. Run `npm run green:readiness` against the target
  deployment environment.
- WhatsApp webhook, owner connection, and messaging code use Green-specific
  environment names. Production does not fall back to Blue's send flag or
  worker secret. The webhook writes to Green Convex only and stays closed until
  migration, state-path, and cutover gates validate. Once data is ready, signed
  inbound traffic persists even while sending is disabled.

### Verified migration evidence (2026-10-04)

- A dedicated Green Convex production deployment is provisioned in EU Ireland:
  `https://rare-fish-465.eu-west-1.convex.cloud` with the matching
  `https://rare-fish-465.eu-west-1.convex.site` HTTP endpoint.
- The Green schema and server-authenticated importer were deployed there.
- A private, read-only Supabase export was applied twice. Both runs matched:
  3 accounts, 2 Google identities, 15 conversations, and 65 messages.
- Integrity checks passed for identity-to-account links, message-to-conversation
  links, unique message sequence numbers, and Ahmed's owner role.
- OTP challenges, sessions, rate limits, and the two synthetic `mock` Meta state
  rows were excluded. No WhatsApp/Instagram integration credentials or customer
  inbox rows were migrated. Existing sessions must expire and users must sign
  in again.
- The temporary importer endpoint is disabled after verification. Vercel's
  Green cloud/site URLs and server-only secrets are configured. Cutover,
  migration-complete, state-paths-ready, and WhatsApp-smoke flags remain false.
- A staged Green candidate is live on the production domain as Vercel
  deployment `dpl_D6ZnPgfnrMheejLJ2mMx91nVUtzG`. `/en`, `/owner/access`, and
  `/api/auth-session` returned 200. Production advertises Google and LinkedIn;
  their OAuth start routes returned 302 to the expected providers.
- Email OTP request for `yungahmed1100@gmail.com` returned 200. The user
  supplied the code; verification returned 200, created the test account, set a
  session cookie, and correctly required profile completion. Reusing the first
  code returned 409 `code_invalid`. With Ahmed's authorization, the second code
  completed a clearly labeled sample profile; authenticated session lookup,
  logout, and the post-logout signed-out check all returned 200.
- The retired Layla customer surface, webhook, and worker returned 503, and
  Supabase keepalive returned 410. The Instagram API reports
  `available: false` and `approved: false`.
- The Green-pinned production release fails closed on legacy Supabase-backed
  Layla storage, webhook, worker, and keepalive paths even while the final
  cutover switches remain false. The existing Supabase archive is untouched.
- Unauthenticated production requests to the grant API, dashboard, and Hasib
  API each returned 401.
- This staged deployment does not certify the earlier migration snapshot as a
  current cutover certificate. Freeze and re-export source data, then re-run
  count/integrity verification before setting final migration/cutover flags.
- Full tests, Convex typecheck, and production build pass, including after the
  Green-only service-secret boundary change. The production-only dependency
  audit reports two moderate React Router advisories. Upgrading to Router 7
  breaks the current static-site generator's `react-router-dom/server.js`
  import, so that upgrade needs a compatible SSG migration.
- Ahmed supplied `yungahmed1100@gmail.com` as the non-admin test identity. It
  was not present in the source account table at export time, so it requires a
  fresh signup. The account is now created, and one-time code consumption and
  replay rejection passed. Ahmed authorized a synthetic name and NANPA-reserved
  fictional phone number for profile completion. No owner-controlled WhatsApp
  test recipient or provider setup was supplied, so WhatsApp remains paused.

### Test identity follow-up (2026-10-04)

The test email is now provided and OTP verification/profile completion
succeeded. Google and LinkedIn authorization endpoints work, but their
interactive callbacks remain unverified and require a browser session.

## Migration blocker and required data map

The repeatable importer now covers the active Green Supabase account, OAuth
identity, and website conversation/message tables. Historic website leads were
not in the Supabase schema; new lead records already use `greenWebsiteLeads` in
Convex. There were no customer integrations, inbox/outbox, tenant, Hasib, or
access-grant rows to import. The two legacy Meta state rows were synthetic mock
records with empty contacts/jobs/receipts and no credentials, so they remain
excluded. Ahmed's Blue Convex WhatsApp integration and its five conversations,
24 messages, six contacts, receipts, profile/catalog and global messaging brake
have not yet been imported into Green. The owner connection must be
re-authorized into Green; Blue's sealed credential is deployment-specific and
is not portable as-is. New dashboard and grant state is Convex-only.

The historic Supabase adapters remain in the source for rollback, but Green
production routes fail closed before they can call them. Customer setup and the
WhatsApp owner connection write through Convex. Owner connection requires the
Green-only `GREEN_WHATSAPP_OWNER_CONNECT`,
`GREEN_WHATSAPP_OWNER_CONNECT_TOKEN`, `GREEN_WHATSAPP_VERIFY_TOKEN`, and
`GREEN_WHATSAPP_OWNER_CONNECT_ENABLED` settings, plus the Green app secret and
encryption key. These settings are absent from Green production, and the
owner-controlled Meta number has not been rebound or verified there. Keep
WhatsApp sending paused until Ahmed's Blue data is mapped, the owner number is
rebound, the Convex global brake is deliberately enabled, and a live test
passes.

Because the old Vercel production release is still serving traffic, the snapshot
counts above are verification of that export only, not a current cutover
certificate. Re-export and re-verify immediately before cutover after freezing
legacy writes. The migration freeze and production write prohibition have not
been deployed.

Migration procedure must:

1. Export an approved, redacted, consistent Supabase snapshot without secrets.
2. Map every active Green table and identify excluded data. Explicitly exclude
   OTP challenges, raw tokens/secrets and sessions; expire existing sessions.
3. Apply the reviewed export idempotently to the dedicated Green Convex target.
4. Compare source and destination counts by table, then verify representative
   reads and tenant boundaries. Stop on any mismatch.
5. Keep Supabase and the previous Vercel deployment intact for rollback. Do not
   write back to Supabase after Green cutover.

## Release gates

1. Provision a separate Green production Convex deployment and set the exact
   cloud URL in both `GREEN_CONVEX_CLOUD_URL` and `CONVEX_CLOUD_URL`, its matching
   `CONVEX_SITE_URL`, and the same 64-hex `CONVEX_SERVICE_SECRET` in Vercel and
   Convex. Set a separate 64-hex `GREEN_MESSAGING_WORKER_SECRET` in both
   runtimes. Do not use a dev URL, Blue deployment, or browser-prefixed secret.
2. Complete and review the data map/importer above; record table counts and
   representative read results. Set `GREEN_DATA_MIGRATION_VERIFIED=true` only
   after this evidence exists.
3. Configure Apps Script OTP/CRM transport, Google and LinkedIn provider pairs,
   and exact Green callback URLs. Verify one-time code use, social callbacks,
   profile completion, CSRF, logout, and session expiry using dedicated
   non-admin test identities. Verify grant/revoke audit, Catalyst Hasib denial,
   and Ascend dashboard/function access.
4. Verify website lead/chat persistence, Apps Script delivery, WhatsApp
   inbound/reply/receipt and pause/takeover/reload recovery. Keep WhatsApp
   sending paused until the owner smoke test is recorded. Verify Instagram is
   unavailable and send no Instagram traffic before approval.
5. Confirm production API routes and jobs perform no Supabase writes. Run the
   full suite, Convex typecheck, production build, and dependency/security
   checks; resolve failures before requesting deployment authorization.
6. Run `npm run green:readiness`. Only then set migration and cutover flags,
   deploy Green, verify login and critical journeys, and monitor. Rollback is
   the previous Vercel deployment plus the untouched Supabase archive.

## Rollback

Pause WhatsApp sending first. Restore the previous Vercel deployment and
pre-cutover environment values if the new release fails. Keep the new Convex
data for diagnosis; never delete or overwrite the Supabase archive. Reconcile
any writes made after the migration snapshot before retrying cutover.


## Local refactor and remaining release work (2026-10-04)

The current working tree is not a released deployment.

- Active Vercel handlers and the retired keepalive contain no Supabase transport.
  Retired pilot adapters fail with 410. Historical injected-store tests are under
  `tests/helpers/retired-pilot`; they are not evidence for production handlers.
- One-time Supabase export/import utilities moved to `ops/migration`, excluded
  from Vercel uploads. Supabase data and credentials on the existing release have
  not been deleted; remove runtime credentials only after the replacement release
  and final migration have been verified.
- Customer signup accepts either `LAYLA_CUSTOMER_CONFIG_ID` or
  `LAYLA_EMBEDDED_SIGNUP_CONFIG_ID`; conflicting values disable signup.
  Green uses `LAYLA_CUSTOMER_ONBOARDING_ENABLED`,
  `LAYLA_WEBSITE_IMPORT_ENABLED`, `RESEND_API_KEY`, and `AUTH_FROM`.
- Convex service/worker entrypoints use only their Green credentials.
- Ingress persists before first activation and during pause, with no automation
  or replay for events received while paused. Opt-outs and takeover remain active.
- Sending now requires persisted rollout settings. Before owner smoke, call the
  internal `blueMessaging:configureRollout` with mode `smoke` and the authorized
  recipient (digits only). It pins Ahmed's account and expires after one hour.
  Enable the separate global transport brake and Green worker flag only for this
  scope. After inbound/reply/receipt/pause/takeover checks, record the evidence
  location with mode `live`. This is an operator attestation, not an automatic
  claim that provider checks passed. Broadcasts remain closed during smoke.
- `npm run green:readiness -- --data` checks data-stage configuration; default
  readiness additionally checks live-channel settings. Neither command verifies
  external credentials, migration counts or provider delivery on its own.

Release still needs: a fresh verified source snapshot; Ahmed-only Blue customer
and messaging import with ID remapping and consent/tombstone handling (the
existing importer covers Supabase auth and website data only); owner Meta
credentials; live smoke evidence; Google/LinkedIn interactive callback checks;
and resolution/disposition of the Router dependency audit findings. Keep the
previous deployment and Supabase archive. A code rollback after cutover must
continue using Convex; never silently resume Supabase application writes.

### Verification for this local refactor

- `node --test tests/*.test.mjs`: 706 passed, 0 failed. The printed 86.9%
  regex-only evaluation failure is an expected negative fixture; the test asserts
  rejection of that deliberately weaker router.
- Convex TypeScript check passed; production static build passed.
- Production dependency audit: two moderate Router advisories remain unresolved.
- No production deployment, final data migration, Meta subscription mutation,
  or live message was performed in this refactor turn.

### Existing owner variable names (2026-10-05)

The local owner connection now accepts `ACCESS_TOKEN`,
`WHATSAPP_BUSINESS_ACCOUNT_ID`, and `WHATSAPP_BUSINESS_NUMBER_ID`. These are
server-only settings for Ahmed's exact-email owner route. They never authorize
customer accounts or replace customer Embedded Signup. Conflicting old/new
settings fail closed. Without an explicitly configured portfolio ID, the owner
flow verifies Meta's returned WABA owner portfolio, app/token permissions, and
phone membership. Generic signup cannot use this server-configured exception.
This compatibility change has not yet been deployed.
