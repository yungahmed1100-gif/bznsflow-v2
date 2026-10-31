# Green release 2026-10-31: Paymob step polish, anonymous funnel events, end-to-end tests

## Asked
Ahmed asked to polish the Payments step UI and test the workflow end to end using PostHog. He chose:
- **PostHog:** anonymous funnel events only.
- **Tests:** a full local stack plus one live run.

## Shipped
- **UI** (`src/components/dashboard/website/payments.jsx`, `layla-dashboard.css`, `Icon.jsx`):
  - Yes/Not-now as choice cards;
  - a three-step "how it works" strip;
  - download cards for both Paymob forms;
  - a "n of 5 required documents added" progress line;
  - one card per document slot: Required/Optional/Added tag, file chips with size and Remove, an accessible "Add file" button, and the error shown inside the slot.
- **PostHog funnel** (`src/lib/posthog.js`):
  - **Events:** `website_brief_step`, `website_brief_payments_answer`, `website_brief_form_downloaded`, `website_brief_document_added`, `website_brief_document_refused`, `website_brief_sent`, `website_brief_error`.
  - **Private mode:** on the dashboard PostHog starts only for these events, in a memory-only mode with no autocapture, page views or replay.
  - **Allowlist:** `before_send` keeps only these event names and their properties (`step`, `index`, `answer`, `form`, `slot`, `reason`, `field`, `payments`, `documents`, `update`), and strips query strings and fragments from **every** URL property.
  - **Leak caught:** the browser test found `$session_entry_url` carrying `?conversation=…`. The fix generalised the stripping to every URL property.
  - **Disclosure:** `COOKIES.md` and the privacy page (EN/AR) are updated.
- **Admin "Cancel payments set-up"** (`convex/websiteProjectsState.js` `payments_cancel`, `WebsitesAdmin.jsx`):
  - it's admin only and asks to confirm;
  - it ends the payments track and deletes the owner's Paymob documents (files and rows) and personal contact;
  - the brief's payments answer becomes "no".

## Tests
- **`tests/paymob-e2e-browser.mjs`** (new, 33 checks, in `run-browser-tests.mjs`):
  - **What's real:** the built site in Chromium, answered by the real handlers, the Convex store client, the Convex state machines (`convexMemory`) with the HTTP route's byte checks, and the real email module. Only uploads, Resend and the registrar are stood in for.
  - **Journey:**
    - the owner fills 7 steps;
    - both forms are fetched byte for byte, checked by SHA-256 against the bundled files;
    - a fake `.pdf` with EXE bytes is refused by the server byte check;
    - 7 documents are uploaded and the brief is sent;
    - the email goes to Ahmed with 7 named attachments;
    - Ahmed advances one owner to "Sent to Paymob" and cancels another, whose documents are deleted;
    - the owner sees the stage in Arabic at 375 px;
    - axe and overflow are checked throughout.
- **`tests/posthog-browser.mjs`** (17): on the dashboard, only `website_brief_*` events leave, with allowlisted properties, no query string, no name, phone or email, and no `ph_` cookie or storage.
- **Unit tests:**
  - `tests/posthog.test.mjs` adds the `privateEvent` policy;
  - `tests/paymob-onboarding.test.mjs` adds `payments_cancel` (14 tests in that file).
- **Browser suites:** `layla-dashboard-browser` and `owner-browser` are updated for the new UI and the cancel button.
- **Mutation checks: 6 of 6 caught.**
  - any event leaving a private page;
  - query strings kept;
  - unlisted properties kept;
  - cancel without admin;
  - cancel keeping files;
  - the server byte check accepting anything (caught by the E2E).
- **Release checks:**
  - unit tests: 1,168;
  - `typecheck:convex` and the build pass;
  - 15 browser suites and all sector suites pass;
  - `npm audit`: the same 6 known findings.

## Release
- **Commit:** `a24f400`, deployed from a clean archive.
- **Lineage:** the live `dpl_6JwcyifTNSLtUM4eAkn1MNwJZHAY` came from `9f8c58b`, which master contains.
- **Deploy:** Convex Green `prod:rare-fish-465` first, deleting no indexes. Then Vercel `dpl_6sqfzhyzqVszBHEVMnW2CrsWpKEo`. Rollback is `dpl_6JwcyifTNSLtUM4eAkn1MNwJZHAY`.

## Live run (2026-10-31, about 07:18 UTC)
- **Account:** Ahmed's own account had never sent a brief, so he chose his test account `yungahmed1100@gmail.com` (Ascend). Sign-in codes were read from Ahmed's mailbox.
- **What was sent:** a first brief named "TEST — live check (BznsFlow)", domain `bznsflow-live-check-test.com` (not registered by anything automatic). Payments was yes.
- **Forms:** both served with 200 `application/pdf`, matching the repository files by SHA-256. This proves `includeFiles` live.
- **Documents:** 5 synthetic PDFs marked "TEST — not a real document". Progress reached "5 of 5". Sent. The tracker showed the payments track (Documents received ✓, Sent to Paymob next).
- **Email:** the subject was "Website brief + Paymob — TEST — live check (BznsFlow)", with the personal contact and 5 attachments named by slot.
- **Queue:** Ahmed's `/owner/websites` showed the row (Documents received, tel link, 5 document links). **Cancel payments set-up** worked.
- **Cleanup confirmed in Convex:** the brief's `docIds` are `[]`, `payments` is `no`, the contact is removed, there's no payments track, and no `doc_` file rows remain. A document link fetched again in the same browser still returned 200, which is consistent with the browser's cache; the database shows the rows deleted.
- **PostHog, observed in the live browser:** 15 unique events. Each request appears twice because of the `trailingSlash` 308 redirect; the redirect is the duplicate, not PostHog. The events were:
  - 7 × `website_brief_step`;
  - `website_brief_payments_answer` {answer: yes};
  - `website_brief_form_downloaded`;
  - 5 × `website_brief_document_added` (slot only);
  - `website_brief_sent` {payments: yes, documents: 5, update: false}.

  Only allowlisted properties were sent, `$current_url` was `https://www.bznsflowai.com/en/layla/dashboard`, and none of the test values, email, filenames or domain appeared.
- **Left behind:** the test brief and its website project (stage "received", due 3 November). There is no delete action; Ahmed can ignore it or mark it live.

## PostHog funnel (built 2026-10-31, with Ahmed's personal API key in `.env.local`)
- **Confirmed inside PostHog** (project 691003): the live run's 15 events arrived once each:
  - 7 × `website_brief_step`;
  - 5 × `website_brief_document_added`;
  - 1 each of `website_brief_payments_answer`, `website_brief_form_downloaded` and `website_brief_sent`.
- **Private pages:** across all time, the only events from `/layla`, `/owner` or `/signin` URLs are these wizard events. There are no `$pageview`, `$autocapture` or `$snapshot` events, and stored URLs (`$current_url`, `$session_entry_url`) carry no query string.
- **Dashboard "Paymob onboarding"** (id 2284755) has 4 charts:
  - **Website brief → Paymob** (`n4d6L5aq`), a funnel with a 14-day window:
    1. opened the website brief;
    2. chose online payments (answer = yes);
    3. added a Paymob document;
    4. sent with payments (payments = yes).

    On the live data so far, the single test run passes all 4 steps.
  - **Paymob documents added, by type** (`yn6kfZgt`), by slot.
  - **Website brief problems** (`lTcde2WQ`): errors and refused documents, by reason.
  - **Payments answer: yes vs not now** (`tlrq0aGX`).
- **Test data:** the test account's events are in the data. Filter by date, or ignore 31 October.

## Not done
- **PostHog's Claude Code connection (MCP) still needs signing in.** The funnel was built through the REST API instead.
- **Phase 2 is unchanged and not built.**
