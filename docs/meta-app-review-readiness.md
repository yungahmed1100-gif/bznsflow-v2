# Meta App Review readiness

Prepared asset binding, 2026-09-10:

- Meta app: `1388038082832745`
- Business portfolio: `4360221360973294`
- Owner WABA: `2213485365896306`
- Owner phone number ID: `1250149564857596`
- Owner sender: `96871134025`
- Customer onboarding configuration: `2144711899802123`

The owner number is a dedicated Cloud API number added directly in Meta. It does
not use QR or WhatsApp Business App Coexistence. The old owner-only Coexistence
endpoint was retired because it pinned the Egyptian WABA and required
`is_on_biz_app=true`, which is false for the new direct Cloud API number.

Production sending remains blocked by all four controls: mock mode, environment
kill switch, persisted pause, and `LIVE_RELEASE_ENABLED=false` in source.

Before App Review:

1. Apply migration `006-layla-meta-binding-keys.sql`. It preserves the old mock
   row and creates a clean state row for the reviewed Omani asset binding.
2. Deploy the owner-only `/api/layla-meta-readiness` check, then use its button to
   verify that the system-user token can read the new WABA and phone without
   printing the token or provider response.
3. The same read-only check verifies app `1388038082832745` is subscribed to WABA
   `2213485365896306`. Then verify a signed `messages` webhook reaches the existing
   callback.
4. Build a separate, allowlisted review environment that can perform one real
   inbound and outbound test without changing the production release locks.
5. Provide a dedicated reviewer account that does not depend on an owner sharing
   an email OTP during review.
6. Record separate, continuous videos for `whatsapp_business_management` and
   `whatsapp_business_messaging`. Never show secrets, terminal output or mocks.
7. Request only `whatsapp_business_management`,
   `whatsapp_business_messaging`, and the login dependency `public_profile`.
   Do not request `whatsapp_business_manage_events` until Conversions API event
   reporting is implemented and independently demonstrable.

Customer Embedded Signup is still a design boundary, not a released capability.
It requires tenant-scoped credential storage, sender ownership uniqueness,
revocation handling, webhook subscription, and two restricted real-tenant tests.
