# Green release — 2026-10-05

Owner: Ahmed. User authorization renews the earlier Green freeze and includes production deployment. This record distinguishes local checks from production evidence.

## Outcome, interfaces and rollback

Provide an exact-email Ahmed admin home at `/owner` and `/en/owner`; retain `/owner/access`; give the six released sectors synthetic, read-only previews without requiring a messaging connection. Normal customer routes and tenant boundaries remain. Grant/revoke and optional Ascend sector changes run in one authorized Convex mutation with audit entries. No impersonation is introduced.

React Router 7 framework prerendering replaces vite-react-ssg, retaining bilingual routes, canonicals, hreflang, structured data and private noindex. Vercel receives `dist`; no SSR server is needed. Local static preview resolves nested `index.html` paths just as production does.

Failure paths: deny unauthorized access before rendering controls; return 401/403/400 for authentication/authorization/validation; reject all preview writes; retain the global messaging brake until verified cutover. Restore only a Convex-compatible prior candidate after cutover, never Supabase write paths. Keep the archive and previous deployment intact.

## Local verification

- Unit inventory currently 715 passing, including owner access and migration/binding tests.
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

## Remaining production gates

Completed destination import: website counts match (3 accounts, 2 identities, 15 conversations, 65 messages), identity/message relationships and sequence uniqueness pass. Ahmed-only WhatsApp counts match (2 contacts, 3 conversations, 19 messages, 9 catalog entries), all imported records belong to Ahmed, and contact/conversation/message relationships pass. The identical snapshot repeats safely. No pending outbound messages were imported; sending is disabled. The operator migration gate was closed after import. Blue and Supabase remain intact; final source-delta review is still required at cutover.

The committed source candidate is `6a70d47`. Additive Convex deployment to `rare-fish-465` succeeded. Vercel candidate `dpl_EskTG5RZRCHJp5AEBHx2EnkBXAjW` is ready at `https://bznsflow-main-l5zy58ana-yungahmed1100-7330s-projects.vercel.app`; the production domain has not been promoted. Data readiness flags were enabled only after destination verification.

Live candidate checks: public and owner routes return 200; private routes have noindex; signed-out admin API returns 401; the authorized non-admin test account signs in with its delivered OTP, replay is rejected, admin access is denied, and logout succeeds. Website chat stores both user and assistant messages in Convex. The test lead persists in Convex and Apps Script acknowledges CRM synchronization. Google and LinkedIn are the configured providers; Microsoft is absent. Customer signup reports available.

Outstanding:

- Fresh owner connection authorization and historical binding in Green. No Blue sealed credentials were copied. The temporary deployment URL receives the intended origin rejection from production-domain-bound dashboard APIs; connecting the owner requires the production origin.
- Green invitation-mail settings (`RESEND_API_KEY`, `AUTH_FROM`) were copied from Blue's local invitation settings with explicit user authorization. Resend confirms the sender domain is verified; actual invitation delivery remains a separate check. Secret values were never printed or committed.
- Promotion, final source-delta review, owner connection/binding and runtime Supabase credential removal after verified cutover.
- Production route/authenticated checks and 30-minute monitoring after promotion.

No final cutover or promotion is certified by this document. Configuration flags are not evidence of integration success.
