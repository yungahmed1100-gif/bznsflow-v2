# Green release — 2026-10-05

Owner: Ahmed. User authorization renews the earlier Green freeze and includes production deployment. This record distinguishes local checks from production evidence.

## Outcome, interfaces and rollback

Provide an exact-email Ahmed admin home at `/owner` and `/en/owner`; retain `/owner/access`; give the six released sectors synthetic, read-only previews without requiring a messaging connection. Normal customer routes and tenant boundaries remain. Grant/revoke and optional Ascend sector changes run in one authorized Convex mutation with audit entries. No impersonation is introduced.

React Router 7 framework prerendering replaces vite-react-ssg, retaining bilingual routes, canonicals, hreflang, structured data and private noindex. Vercel receives `dist`; no SSR server is needed. Local static preview resolves nested `index.html` paths just as production does.

Failure paths: deny unauthorized access before rendering controls; return 401/403/400 for authentication/authorization/validation; reject all preview writes; retain the global messaging brake until verified cutover. Restore only a Convex-compatible prior candidate after cutover, never Supabase write paths. Keep the archive and previous deployment intact.

## Local verification

- Final unit inventory: 716 passing, including owner access and migration/binding tests.
- Convex typecheck and official static build pass. Router 7.18.4 and full npm audit: zero vulnerabilities.
- Owner browser: 44 cases for authorization and six live previews in EN/AR at 320/768/1440, overflow, accessibility and browser errors.
- Shared browser: auth 34, guided onboarding 28, onboarding review 16, Instagram synthetic 32, dashboard 333 assertions. All six suites pass; Instagram remains disabled in Green.
- Real-estate real-logic browser: 202 assertions, manager/employee, bilingual, three widths, save/reload and permission checks.
- Catalyst 197, retail 441, electronics/phones 490, and dental 341 real-logic browser assertions pass.
- WhatsApp setup: 62 synthetic checks pass, including local help, secret-safe support links and mobile chat controls.
- Consolidated `npm run test:release` passes: 715 unit tests, Convex typecheck, static build, zero dependency vulnerabilities, seven shared browser suites, Catalyst and all six live sector suites. Construction/automotive pass all 12 EN/AR × 320/768/1440 scenarios.

Browser corrections preserve assertions: the real-logic server now decodes filesystem URLs and answers its synthetic auth-session route; the shared sector suite expects the actual four real-estate quick actions and verifies their destinations. Automotive is included. All live selector choices are now synthetic and never invoke `settings_update`.

The previous Green setup component used an obsolete response shape. The existing Blue bilingual onboarding component was ported against the already-present Green API, with no credentials or tenant data copied.

## Production configuration and migration

Vercel secret values are intentionally hidden. Empty values from CLI env pull are not evidence of missing configuration. Names were inspected, and only absent `GREEN_WHATSAPP_VERIFY_TOKEN`, `LAYLA_CREDENTIAL_ENCRYPTION_KEY`, and `LAYLA_CUSTOMER_ONBOARDING_ENABLED` were provisioned. Existing credentials were preserved. Provisioned secret values are in a private ignored local file only.

Fresh private read-only exports:

- Supabase: 3 accounts, 2 Google identities, 15 conversations, 65 messages. No auth sessions or OTPs.
- Ahmed-only WhatsApp: 2 contacts, 3 conversations, 19 messages, 9 catalog entries. Instagram records, including its deleted-contact tombstones, are excluded. No credentials, session hashes, pending outbound effects or media exported.

Owner importer remaps account/contact/conversation IDs, rehashes active phone identities with Green's secret, preserves consent/opt-outs/receipts and pauses sending. Repeat of the identical snapshot is idempotent; changed snapshots require explicit reconciliation. Deleted opted-out contacts without portable identity block import rather than weakening suppression. The current WhatsApp snapshot has none. Imported history is rebound only after Green verifies the same phone/WABA; no sealed Blue credential is portable or imported.

Ahmed confirms the existing owner-controlled WhatsApp smoke test was already completed and explicitly requests skipping repetition. Record this as user attestation, not a new observed delivery test. Use the existing owner number. Instagram and Microsoft remain disabled.

Ahmed also confirms Google and LinkedIn callbacks were already verified on Green. This is user-attested existing evidence, not a new interactive test by this agent.

The deployment serving Green before this release is `dpl_B42g16et2ZxbiLe7JfDpPq612Dpp` (`bznsflow-main-lo934gfkr-yungahmed1100-7330s-projects.vercel.app`). It must be retained; verify Convex compatibility before any rollback.

## Production outcome

Production is live on `www.bznsflowai.com`: source `10e1f6e`, deployment `dpl_B26goP7MAJcNBY3sRfWge5mV9tcj`, Green Convex `rare-fish-465`. Ahmed explicitly approved phased promotion and instructed “live push to normal.”

Destination counts and relationships match both snapshots. Identical owner import repeats safely; source exports before cutover and after routing are unchanged. Fresh owner authorization verified credentials, asset membership, registration and routing; imported history is bound to the Green connection. No pending outbound work was imported. Normal sending and owner activation are enabled. The migration operator gate is closed.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` were removed from production settings and the active runtime rebuilt. Supabase source data and private archives remain intact. Rollback must preserve Convex state and exclude Supabase writes; the retained owner-ready candidate `dpl_H5t8aMZTgSqbKWPCDynU24Qroqxf` provides a compatible paused-messaging fallback.

Live checks observed: delivered OTP sign-in, replay rejection, non-admin denial, test-account logout, Ahmed authorization, three atomic grant/revoke audit rows, all six preview write denials, and 42 authenticated owner/preview browser scenarios across EN/AR and 320/768/1440. Website user/assistant messages persist in Convex; a test lead persists and Apps Script acknowledges CRM synchronization. The final owner-readiness API change passed the full 716-test unit inventory and production build.

Invitation settings were copied only from Blue's invitation-mail file with explicit authorization. Resend confirms the sender domain is verified. Actual invitation delivery was not exercised. Sensitive values were not printed or committed.

The user's prior WhatsApp smoke and Google/LinkedIn verification are recorded as attestation. No repeated WhatsApp test message was sent. Instagram and Microsoft remain disabled.

## Monitoring and follow-up

Normal-sending monitoring began 2026-10-04 21:58:30 UTC (2026-10-05 01:58:30 GST). Completion remains pending. Local Node probes have intermittent transport timeouts; independent curl probes succeed and inspected Vercel requests show expected 200/401 responses. A logged Node `url.parse` deprecation warning accompanied HTTP 200, not an application failure. Preserve this limitation rather than describing the monitoring as flawless.

Meta reports display-name status `DECLINED`; registration, routing and activation succeeded. Ahmed should resolve the display-name review separately. No new end-to-end delivery evidence is claimed.

Decision: `BF-2026-10-05-GREEN-PRODUCTION-RELEASE`, canonical vault `Decisions/2026-10-05-Release-Green-Owner-Home.md`, mirrored in [Notion](https://app.notion.com/p/3ef415cb8dec81f0b3dfe564c89bdcd8).
