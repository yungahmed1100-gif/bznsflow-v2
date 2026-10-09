# Green release 2026-10-09: 3-step broadcasts, website trims

**Source:** `ca4d4e5` on `master` (`2d45a8d`, `1fa565b`, `79fe8f2`, `ca4d4e5`), released at Ahmed's request ("deploy").

## What changed
- **Broadcasts in three steps**:
  1. **Template:** choose one, with its variables shown.
  2. **Numbers:** type them, upload a CSV/XLSX list, or pick saved contacts.
  3. **Send:** step through a preview of each customer's own message, then send now or schedule.
- **Personalisation:** every row carries its own value for each template variable. The value comes from the customer's name, a file column (matched by header: `{{2}}`, `body_2`, the named parameter or the example), a lead detail, shared text, or a typed cell. A row with an empty variable blocks Continue.
- **Consent:** new numbers are saved as contacts with one consent record before the preview, using a "How did they agree?" select, the date and the attestation.
- **Server:**
  - new mapping source `recipient` with per-contact `values`, validated in the API and in Convex (`validRecipientValues`);
  - the parameters frozen per recipient are the ones the preview showed;
  - `campaign_preview` is no longer behind the broadcast switch, because it sends nothing; `campaign_create` still is.
- **Broadcast page:** New broadcast, Upload list and Type numbers buttons; the empty state shows the three steps.
- **Website:** the "Outcomes you can check" section and the testimonials section are removed (Ahmed: "logo strip is enough").
  - The logo strip keeps all eight logos.
  - `llms.txt` and the web chat (§26) name selected work without quotes.
  - The vault decision `2026-10-09-Show-All-Plans-Without-Prices` records this.

## Evidence

| Item | Value |
|---|---|
| Verification | On `ca4d4e5` alone (git archive): build; 825/825 unit tests; chat 70/70; all 9 browser suites (354 dashboard checks, including the 3-step journey, per-contact previews, the sending-off state in Arabic at 375, axe). Convex typecheck clean; `npm audit` 0. |
| Convex | Dry run from the release folder was clean: schema validation complete, no index deletions; the only change is one optional `values` arg. The deploy itself was blocked by the agent's safety check: **Ahmed runs it.** |
| Vercel | `dpl_FDHT7cqnVtA3JGsQyVS9heG4bmEJ`, promoted. |
| Smoke | 200 for `/`, `/en`, `/layla/dashboard`, `/en/layla/dashboard`, `/llms.txt`; 307 for `/layla/setup`. Live AR and EN home pages: no Outcomes section, no quotes, logo strip and plans present. |
| Rollback | `npx vercel promote dpl_3q13X59kDivR2AP7F1Wr5m93NKSo --yes`. The Convex change is additive. |

## Follow-up: Convex deployed and sending switched on (2026-10-09)

| Item | Value |
|---|---|
| Convex | Ahmed ran `npx convex deploy` from `work/release/ca4d4e5`. Confirmed live: `blueDashboard:execute` accepts `values`. |
| Convex switch | Ahmed ran `blueCampaign:setBroadcastEnabled {enabled:true}`. Confirmed by reading `blueMessagingSettings`: `broadcast` `enabled: true`; `global` `rolloutMode: live` with smoke evidence. |
| Vercel switch | `GREEN_BROADCAST_ENABLED=true` (Production), redeployed `ca4d4e5` as `dpl_7CL1EZYrbwWKr1mXYUYsx4uGrmjC`, promoted. Smoke: 200 for `/`, `/en`, `/layla/dashboard`, `/en/layla/dashboard`; an unauthenticated `campaign_create` returns 401. |
| Brake | `npx convex run blueCampaign:setBroadcastEnabled '{"enabled":false}' --env-file .env.green-convex.local` (it also blocks scheduled and processing campaigns); then `npx vercel env rm GREEN_BROADCAST_ENABLED production` and redeploy. |
| Not yet seen | A real broadcast delivered. No message has been sent by the agent. Ahmed's first broadcast goes to his own number. |

## Follow-up: mixed-country lists and non-WhatsApp numbers (2026-10-09)

Prompted by Ahmed's upload of a KSA + UAE list where numbers carry their code without "+".

| Item | Value |
|---|---|
| Bug fixed | `966…`/`971…` numbers were read with the fallback country's code prepended (`968966…`). A number longer than any local number for the fallback country is now read as international; the country column understands KSA, UAE and Arabic names; wa.me links count as numbers (`49d69e9`). |
| Upload check | Each number must match its country's mobile plan (SA, AE, OM, BH, QA, KW, EG, JO). Landline, toll-free and short numbers are skipped and counted, as are rows a "Number type" column marks so; countries without a rule are kept (`4ef409d`). |
| Learn from sends | Meta discontinued the "does this number have WhatsApp" check, so a 131026 (undeliverable) failure now sets `blueContacts.undeliverableAt`; later broadcasts exclude the contact (`not_on_whatsapp`) until the customer writes in. Other failure codes do not mark the number. |
| Verification | On `4ef409d` alone: build; 828/828 unit tests; all 9 browser suites; Convex typecheck; Convex dry run clean (one optional field). |
| Convex | Ahmed ran `npx convex deploy` from `work/release/4ef409d` (reported "done"; the code itself cannot be read back from the function list). |
| Vercel | `dpl_CcvFtRnmhU7hCJWwzUiLnbKq8qM3`, promoted; the domain serves it. Smoke: 200 for `/`, `/en`, `/layla/dashboard`, `/en/layla/dashboard`; 307 for `/layla/setup`; an unauthenticated preview returns 401. |
| Rollback | `npx vercel promote dpl_7CL1EZYrbwWKr1mXYUYsx4uGrmjC --yes` (keeps sending on). The Convex field is additive. |

## Open
- The first real broadcast and its delivery receipts (sent → delivered) still need to be seen on production.
