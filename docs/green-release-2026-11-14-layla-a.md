# Green release, Layla A: simpler setup, hardened replies, Khaleeji voice (14 November 2026)

**Authorization:** Ahmed, 14 November 2026. He approved the plan ("three separate releases"), asked for each change in this release during the session, and has a standing "deploy by yourself" for verified releases.

| | |
|---|---|
| Source | `d73678e` (verified, deployed), tag `green-layla-a` |
| Convex | `rare-fish-465`, deployed 16:01:34Z. One additive change: replies may record `prompt` (the prompt version). |
| Website | `dpl_AXdrCPFgGEcD4cKh8fmgL9pfb8XW`, promoted to www.bznsflowai.com at 16:03:48Z |
| Rollback | Promote `dpl_GbjmSgapY1S5qQoMWqa5j8HQsG6u` (`green-p3a`). The Convex field is optional, so the previous site works with it. |

## What changed for people

- **Layla setup asks only for bzns.md and the Catalog.** One screen: the import box, the two tabs, Test Layla and Publish. The four steps, the essentials form and the "Configure Layla" step are gone; her style and the details she asks for keep their defaults and stay in Settings › BznsBrain. Publish saves text typed but not saved, and switching tabs no longer drops it.
- **Layla refuses to send made-up details.** A reply is rejected before sending if it states, without your data or the chat saying so: an opening time, a day, a waiting time, a discount, free delivery or a guarantee; a customer name that is not theirs; "sir", "أستاذ" or similar; or Egyptian or Levantine wording in Arabic. She tries once more with the reason, then gives the honest fallback with your team contact.
- **Polite Khaleeji voice and names.** In Arabic she writes polite Gulf Arabic in the respectful plural ("حياكم الله، تفضلوا"). She uses the customer's first name once when greeting, and never guesses a name or a gender.
- **Voice notes and photos are no longer read.** She thanks the customer and asks them to type, in Arabic then English when they have not typed anything yet. You still see and play the file in the chat. `LAYLA_MEDIA_READING=on` turns reading back on.

## Engineering

| Change | Why | How it helps |
|---|---|---|
| `config/layla-claims.js` `untracedClaim`, called from `validateReply` | Only prices and numbers of three or more digits were traced, so an invented closing time or promise passed. | The same extraction runs on the reply and on the sources; a claim counts only when the data states it. |
| Prompt order: numbered rules, `=== BUSINESS DATA ===`, then `=== THIS TURN ===` | Per-customer details sat among the rules. | The rules and data are an identical prefix for every turn of a business, so the provider can cache it. A test fails if the fixed rules pass 2,800 characters. |
| `cleanName` | A customer's name is their own text. | Only letters reach the prompt, so a name cannot carry an instruction. |
| `PROMPT_VERSION` on each reply (`convex/aiMeta.ts`), temperature 0.2, retry hints | A bare code told the model little, and a reply could not be traced to its prompt. | The second try is told what to change; any reply can be matched to the prompt that wrote it. |
| `mediaReadingOn(env)` | Ahmed chose text only. | No reading model is called; the paid Qwen models are no longer needed for media. |
| `BrainSetup.jsx` rewritten, `EssentialsCard.jsx` deleted | Ahmed: keep only bzns.md and the Catalog. | 327 lines to 190; both tabs stay mounted. |

### Found in review before release

`"Hello, I'm Layla"` was refused as a wrong name, because any capitalised word after a greeting counted as a name. A name now has to end the greeting; titles are read with their case; "miss", "sister" and "مضمون" are ordinary words. Fixed in `d73678e` with tests before the release check ran.

### Known limits

- An invented staff name in the middle of a sentence is not caught; only a name she addresses the customer by.
- A day or time the customer mentioned is allowed in the reply, because the chat is a source.
- The WhatsApp profile name is not read yet; she uses the name given in chat or saved by the owner.
- Requiring a cited source for every answer on every account is not in this release.

## Evidence

- **`npm run test:release` on a clean archive of `d73678e`:** passed. Lint 339 findings, none new. 1,254 unit tests: 1,253 passed, 0 failed, 1 to-do. Convex typecheck and build pass; `npm audit` 0 vulnerabilities. All browser suites passed, including the BznsBrain suite (311 checks) and the navigation crawl (4,716 checks, 0 known problems). Sector suites and Ascend end-to-end (107 checks) passed.
- **Visual diff against `green-p3a`:** 172 screens, 0 differences. The setup screen change is covered by the BznsBrain suite, since the signed-out capture does not reach it.
- **Convex dry run:** no index deletions, schema validation complete, only the empty Node-actions version line.
- **Staged:** nine key pages returned 200 before promotion.
- **Production:** all 55 prerendered pages returned 200; health 16 of 16 on the first run; no runtime errors in the 15 minutes after promotion.

## To watch

Layla's fallback reasons (`ai.fallback` on replies) for the new codes: `untraced_time`, `untraced_day`, `untraced_wait`, `unbacked_promise`, `wrong_name`, `gendered_address`, `other_dialect`. A code that causes more than a few fallbacks an hour on real chats means its pattern is too strict and should be loosened with a test. Production data reads from this session are not permitted, so this needs Ahmed's dashboard or a later authorised check.
