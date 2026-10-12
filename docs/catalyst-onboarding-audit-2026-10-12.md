# Catalyst owner onboarding: audit (2026-10-12)

**Scope:** an owner's path from sign-in to Layla's first useful handover, on `master` at `751e451`. The audit is local and synthetic:
- the built site, served by `scripts/preview.mjs`;
- stubbed APIs taken from `tests/brain-browser.mjs` and `tests/auth-browser.mjs`;
- EN/AR, at 320 and 1440 px;
- no Meta, no messages sent, no production.

Screenshots are local, in `work/onboarding-audit/shots/` (gitignored), and the script is `work/onboarding-audit/walk.mjs`. This is an audit and plan; no product code was changed.

**Limits that still apply:**
- setup is 2 steps (bzns.md → channel), in 3 minutes or less;
- no new steps or approval gates;
- facts are reviewed once, then Layla is live;
- advanced setup goes in the dashboard;
- Layla switches on when a channel connects;
- a team contact is required;
- no analytics on owner pages.

Catalyst is sold done-for-you through the free audit, and setup works only for accounts Ahmed grants (`convex/hasib/plans.js:10`). Opening sign-up is a commercial choice, listed under questions, not recommended here.

## Activation

**Aha moment** (from the 2026-10-08 decision): a real customer's inquiry is answered from the approved facts, qualified, and handed over ready for the owner, and the owner acts on it.

| Stage | Signal today |
|---|---|
| 1. Signed in | `accounts`, `sessions`; Lead Pipeline row "Sign-in" (`api/_lib/blue-auth.js:66`) |
| 2. Granted | `blueAccessGrants`, `blueAccessAudit` |
| 3. bzns.md published | `publishedAt` on the published bzns.md (`convex/reviewState.js:46`) |
| 4. Channel connected, Layla on | `blueMessagingControls.activatedAt` (`convex/blueMessagingState.js:177`) |
| 5. First customer message | Derivable: earliest `blueConversations.lastInbound` per account. Not read anywhere |
| 6. First handover | Derivable: earliest `blueConversations.handoffOpenedAt`. Not read anywhere. Whether the handover was *qualified* (required details captured) is not recorded |
| 7. Owner acted | Derivable: `handoffResolvedAt` / `handoffResolvedBy`, `takeover`. Not read anywhere |
| Setup "completed" | Never written. The client never sends `completed` (`src/pages/ProductSetup.jsx:32`), so `productSetupAudit` only ever records `saved` |

Time-to-value can't be read today. Most of it is in tables we already have.

## Findings

Ordered by priority. "Confirmed" means seen in the walkthrough, with a screenshot and the code line that causes it.

| # | Finding | Impact | Recommendation | Priority |
|---|---|---|---|---|
| A1 | **The guided path can't publish.** Choose industry → paste text → accept suggestions → configure → Publish ends in one "Before publishing" line naming **13** sections still in `[brackets]` (dental; real estate and retail 11, restaurant 13). The box has no link or action; the only fix is hand-editing bzns.md in "Or write your bzns.md yourself" two screens back. Cause: `validateBzns` refuses any section with a placeholder (`src/lib/bzns-doc.js:116-120`); the templates carry 10–12 such sections (`config/bzns-templates.js`). Synthetic extraction filled one section. How many sections real Qwen extraction from a website or file fills is **unverified**. Shots: `en-1440-s5b-publish-refused.png`, all four `*-s5b-*` | The 3-minute budget is impossible as walked. This is where an owner stops | At Publish, **leave out** template sections that still hold only their hint. Keep blocking on just name, what you offer and team contact, and ask for those three as plain fields in "Add your information". Each remaining problem links to its section. No new step | High |
| A2 | **No grant: the setup page drops the owner after their work.** A signed-in account without a grant sees only "Sign in with a granted manager account to configure this product." and a **Sign in** link, though it is already signed in (`ProductSetup.jsx:51-58`). Setup itself runs signed out, so anyone with the URL can do the whole business step, then hit this after "Save your setup to connect channels" (`onAccountChange` → `load()`, `:62-64`; mid-setup path inferred from code, end state shot `en-1440-setup-no-grant.png`) | Work done, then a dead end with a misleading action | Say what is true and give one next action: "Your setup is saved. Catalyst is switched on with you after a free audit." and **Book the free audit**. Drop the Sign in link for signed-in visitors | High |
| A3 | **A granted owner who signs in is sent to the audit.** The done screen reads "Welcome back, pick up wherever you left off", but its only buttons are **Book the free audit** and **Message us on WhatsApp** (`src/pages/SignIn.jsx:515-541`). Only `?next=` resumes setup (`:57`), and nothing gives the owner that link: the mailer sends only the code. Shots: `en-1440-signin-done-direct.png` (stays on `/en/signin`), `-next-setup.png` (goes to setup) | The paying owner's first screen points away from the product | When the account has a grant, go straight to `/layla/dashboard`, or to `/catalyst/setup` while setup is unfinished. Otherwise keep today's audit screen | High |
| A4 | **Meta unavailable shows up last.** With WhatsApp unavailable, the card looks the same as when ready. The owner picks the number type, picks which app, ticks a **10-item** checklist, presses "I have everything — start", and only then sees "○ WhatsApp connection available / Complete the items above to continue." beside a disabled **Get Meta ready**: an item the owner can't complete (`src/components/onboarding/WhatsAppConnect.jsx:11-16,42`). Shots: `en-1440-channel-meta-unavailable-after-start.png` vs `-ready-after-start.png` | Ten ticks for nothing; looks like the owner's fault | Check availability first. When unavailable, show it at the top of the card instead of the choices: "WhatsApp connection is paused on our side. Your setup is saved; we'll message you when it's back." Never list it as an item to complete | High |
| A5 | **The "Stuck?" help points at nothing.** The channel step says "Stuck? Ask Layla in the chat at the bottom of the page." (`src/components/onboarding/SetupHelpLinks.jsx:21`), but the chat is only on the home page (`src/pages/Home.jsx:136`) | The help fails exactly where owners stall | Point it at what exists: "Stuck? Message us on WhatsApp" (the same link as the done screen) or the existing "Need a hand?" | High |
| A6 | **Dashboard with no channel says "Loading…" forever.** A granted owner who hasn't connected sees the four tabs, a header **Connect a channel** button and "Loading…" in the page body. Catalyst has no `operations` capability, so `src/pages/LaylaDashboard.jsx:158` falls through to the loading line. Shot: `en-1440-dashboard-no-channel.png` (after 6 s). No test covers this | Looks broken; the one useful action is small and in the header | Replace the loading line with a channel empty state: "Connect WhatsApp or Instagram and Layla starts answering." plus **Connect a channel**. Add the state to `tests/catalyst-browser.mjs` | Medium |
| A7 | **The checklist asks for what we already know.** Of the 10 items (`ReadyChecklist`): "Your shop's details" is already published; "A second WhatsApp number for when Layla needs a human" is the team contact Publish already required; "An email you can open" is done, since they're signed in. "About 10 minutes" sits beside a 3-minute promise. Shot: `en-1440-channel-ready-checklist.png` | 3 needless ticks; mixed time message | Pre-tick (or drop) the items the account already proves, leaving 7. Say the Meta window "takes about 10 minutes on Meta's side" | Medium |
| A8 | **Instagram disappears when unavailable.** The card isn't rendered (`src/components/dashboard/InstagramConnection.jsx:28`), while the step heading still says "Connect Instagram, WhatsApp or both." Shot: `en-1440-channel-ready.png` | The text promises a card that isn't there | Render the card with "Instagram connection isn't available yet", or drop "Instagram" from the heading when it's off | Medium |
| A9 | **The empty inbox has no next action.** "No conversations yet. When a customer messages your WhatsApp number, the chat appears here." Shot: `en-1440-dashboard-empty-chats.png` | The owner waits for a customer instead of seeing the aha now | Add one line and keep the layout: "Send your WhatsApp number a message from another phone to see Layla answer." | Medium |
| A10 | **The Meta App Review script describes the old flow.** `docs/review-recording-pack.md:35,104,154` still says tick "I checked these business facts", "Save and continue", "Activate replies". `docs/blue-onboarding-execution.md:16,50` names Resend; codes now go through the shared-secret mail endpoint (`api/_lib/mailer.js:83`) | A reviewer following the script won't find those controls | Rewrite the script for today's flow before the next Instagram review submission | Medium |

**Not reproduced, dropped:**
- **Three progress stores** (`brainStep`, `journeyStep`, `productSetupProgress.step`): a code smell, but the walkthrough resumed on the right step.
- **The Chats reminder's team-contact link:** it doesn't show for owners who published, because a contact is required.

**Not walked:** popup blocked and permissions declined in Meta's window. Their copy is in `src/lib/onboarding/explanations.js:198-230`, and `tests/whatsapp-connect-browser.mjs` covers them.

## Flow as walked vs proposed

Counts are from the walkthrough (EN 1440). No owner was timed. The 3-minute budget fails on A1 regardless.

| As walked | Proposed (same steps, fewer stops) |
|---|---|
| Sign in → done screen → audit buttons (A3) | Sign in → straight to setup or dashboard |
| 1 Industry (1 field, already prefilled from sign-up) | Unchanged |
| 2 Add information (2 fields) | Adds name, what you offer and team contact as plain fields; paste/file/website as now |
| 3 Review (2 suggestions, 10 buttons) | Unchanged |
| 4 Configure Layla (7 fields) | Defaults kept; move to Settings later only if Ahmed agrees (a step-budget question, not part of this fix) |
| 5 Publish → **13 blockers**, hand-edit bzns.md (A1) | Publish succeeds; unfilled hint sections are left out |
| Channel: number type → which app → 10 ticks → start → Meta, and only then "unavailable" (A4, A7) | Availability shown first; 7 ticks; working help link (A5) |
| Dashboard: "Loading…" until a channel is connected (A6); empty inbox with no action (A9) | Channel empty state; "message your number" line |

The guided path to the channel step took 12 clicks or inputs, *not counting* fixing bzns.md.

## Copy

Proposed, EN / AR. It follows `DESIGN.md`: orange marks the next step, sign-in stays a text link.

| Where | EN | AR |
|---|---|---|
| A2 no grant | Your setup is saved. Catalyst is switched on with you after a free audit. · **Book the free audit** | تم حفظ إعدادك. نفعّل Catalyst معك بعد تدقيق مجاني. · **احجز التدقيق المجاني** |
| A4 Meta unavailable | WhatsApp connection is paused on our side. Your setup is saved; we'll message you when it's back. | ربط واتساب متوقف مؤقتاً من جهتنا. إعدادك محفوظ، وسنراسلك عند عودته. |
| A5 help | Stuck? Message us on WhatsApp. | تحتاج مساعدة؟ راسلنا على واتساب. |
| A6 no channel | Connect WhatsApp or Instagram and Layla starts answering your customers. · **Connect a channel** | اربط واتساب أو إنستغرام لتبدأ ليلى بالرد على عملائك. · **اربط قناة** |
| A8 Instagram off | Instagram connection isn't available yet. | ربط إنستغرام غير متاح بعد. |
| A9 empty inbox | Send your WhatsApp number a message from another phone to see Layla answer. | أرسل رسالة إلى رقم واتساب الخاص بك من هاتف آخر لترى ليلى ترد. |
| A1 problem link | Fill in or remove: {section} | أكمل أو احذف: {section} |

## Metrics plan (server-side only; plan, not built)

1. **Write `completed`** in `productSetupAudit` when the first channel connects. Then setup completion and time from grant to live can be read.
2. **One read-only owner-admin query.** For each granted account, take the furthest stage reached (stages 1–7 above) and its time, all from the existing tables. Show it on `/owner/access`. This is also the stalled-owner list.
3. **One field for "qualified":** when a handover opens, whether the pack's required details were captured. It goes on the conversation next to `handoffOpenedAt`, so stage 6 can tell a qualified handover from a plain one.

Read the funnel weekly per cohort (the 10-owner experiment). Time from grant to live and from live to first handover are the two numbers.

## Stalled owners

Catalyst is done-for-you and the cohort is small, so a founder follow-up beats automated email. The admin list from metrics item 2 shows who is stuck where. "Published, not connected for 2 days" and "connected, no handover in 7 days" are the two calls to make. Email reminders stay optional: the mailer sends only sign-in codes today.

## Questions for Ahmed

1. Keep setup open to anyone with the URL (they can draft, then hit A2), or show the audit screen before any work for signed-out visitors without a grant?
2. Should a new grant send the owner their setup link by email, through the mailer that already sends sign-in codes?
3. Fix order: A1 → A3 → A4/A5 → A6, then A7–A10. Agree?
