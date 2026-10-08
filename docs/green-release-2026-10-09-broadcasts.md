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

## Open
- **Until the Convex deploy runs**, step 3 of the wizard cannot load its preview: the old validator rejects `values`. Nothing can be sent either way while sending is off.
- **Sending is still off.** Ahmed's go (2026-10-09) is to switch it on after this release:
  - set `GREEN_BROADCAST_ENABLED=true` in Vercel production, then redeploy;
  - run `npx convex run blueCampaign:setBroadcastEnabled '{"enabled":true}'` on `rare-fish-465`.
- **Brake:** run the same command with `false` (it also stops scheduled campaigns), and remove the env var.
