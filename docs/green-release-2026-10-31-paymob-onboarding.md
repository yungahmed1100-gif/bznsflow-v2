# Green release 2026-10-31: Paymob onboarding in the Ascend website brief (Phase 1)

## Decision
Ahmed shared Paymob's two forms and the documents Paymob requires, then answered ten questions on the end-to-end integration. The vault records them in `Decisions/2026-10-31-Ascend-Paymob-Onboarding`.

**Phase 1 (this release):**
- an **optional** Payments step in the website brief;
- the owner's personal contact, and the documents emailed to Ahmed;
- a separate payments track that Ahmed moves.

There are no fees and no dates in the step.

**Phase 2 (not built):**
- client Paymob keys entered by Ahmed;
- payment notifications;
- pay buttons and links, and Layla payment links;
- orders marked paid.

## What the owner sees
- **The step:** a new step 6 of 7, **Online payments**, asks "Do you want to take online payments (cards, Apple Pay, Maal) through Paymob?"
- **Not now:** nothing else is asked.
- **Yes:**
  - a short explanation: payments go to their own bank, BznsFlow prepares and connects the account, Paymob sets the timing, and the website doesn't wait;
  - **two downloads:** the Paymob merchant application and the VAT declaration;
  - a **personal contact**: full name and personal mobile, both required;
  - **six document slots**, each taking PDF, JPG or PNG files of up to 8 MB:

    | Slot | Files |
    |---|---|
    | Commercial register | 1–2 |
    | ID cards of all partners and managers | 1–10 |
    | Bank proof | 1–2 |
    | Tax card | 0–1, optional |
    | Signed Paymob forms | 1–4 |
    | Invoices | 1–3 |
  - the documents must add up to under 20 MB, so the email stays within Resend's 40 MB limit.
- **Review:** lists the files per slot.
- **Tracker:** gains **Online payments**: Documents received → Sent to Paymob → Approved by Paymob → Connected → Taking payments. Each stage shows its date, and there's no due date.

## What Ahmed gets
- **The brief email:** its subject gains "+ Paymob", it lists the personal contact, and every document is attached by kind (`paymob-commercial-register-1.pdf`, `paymob-id-card-2.jpg`, …).
- **`/owner/websites`:**
  - each row shows the payments stage, the personal contact (tap to call) and links to the documents, with **Payments done: <next stage>**;
  - a live website stays listed until its payments are live.

## How
- **Rules:** `config/website-brief.js` holds the payment fields, `PAYMENT_DOC_SLOTS`, `PAYMENT_STAGES`, the size limits and `paymentDocsProblem`.
- **Convex:** additive schema:
  - document kinds and filenames on `websiteBriefFiles`;
  - `docIds` on briefs and drafts;
  - `payments` on `websiteProjects`.
- **`convex/websiteBriefState.js`:**
  - registers documents;
  - keeps them in drafts;
  - on a yes, enforces the slot minimums, ownership and the total size;
  - on a no, sweeps them;
  - starts the payments track once.
- **Byte check:** the `/website-brief` HTTP route checks document bytes with `checkDocumentBytes` (PDF, JPEG or PNG signature, size).
- **`convex/websiteProjectsState.js`:**
  - adds `payments_advance` (admin only, in order);
  - rows carry the contact and documents.
- **API (`api/_lib/website-brief-api.js`):**
  - accepts document kinds and filenames;
  - validates `docIds`;
  - serves `GET ?form=application|vat` only after the same Ascend-manager check as the brief. The PDFs are in `api/_assets/paymob/`, bundled with `api/layla-meta.js` through `includeFiles`, with no public URL.
- **Privacy policy (EN/AR):** adds a Paymob processor row. The date is now 31 October 2026.

## Tests
- **`tests/paymob-onboarding.test.mjs`** (16, in `test:access`):
  - **Rules:** the optional answer and the required contact; slot minimums and maximums; byte checks.
  - **Documents:** names stored; a no sweeps them; ownership and slot checks; the 20 MB total; drafts keep documents.
  - **Payments track:** its order and admin-only moves; it stays open after the website is live.
  - **Email:** attachments.
  - **Form download:** 401, 403, 404, and the PDF.
  - **Bundling:** the bundled PDFs are checked, along with the API document checks.
- **`tests/website-onboarding.test.mjs`:** the wizard now has 7 steps.
- **`tests/layla-dashboard-browser.mjs`** (526 checks):
  - **English says yes:**
    - the forms link to the signed-in API;
    - the contact is asked for first, then the first missing document;
    - six documents are uploaded and registered under their slots;
    - a `.exe` is refused;
    - the review counts the files;
    - the tracker shows the payments track.
  - **Arabic says not now:** no documents are asked for or sent.
- **`tests/owner-browser.mjs`** (61): the queue shows a live website with open payments, a tel link and document links, and the advance posts `payments_advance`. It's checked with axe and for overflow, in EN at 1280 and AR at 375.
- **Mutation checks: 7 of 7 caught.**
  - slot minimums ignored;
  - any bytes accepted;
  - `payments_advance` without admin;
  - another owner's documents accepted;
  - a form served without the access check;
  - documents kept on a no;
  - total size unchecked.

## Release
- **Lineage:** the live deployment `dpl_G5ewEaqycsMWP52fQfPU3cZkaFpa` came from `eec9869`, which master contains.
- **Source:** commit `9f8c58b`, exported with `git archive` to a clean folder.
- **Convex Green** (`prod:rare-fish-465`) went first. The push was additive and deleted no indexes; schema validation passed.
- **Vercel production:** `dpl_6JwcyifTNSLtUM4eAkn1MNwJZHAY`, aliased to www.bznsflowai.com. Rollback is `dpl_G5ewEaqycsMWP52fQfPU3cZkaFpa`. The new Convex fields are optional, so the previous frontend still works with them.
- **Release checks:**
  - unit tests: 1,166 pass;
  - `typecheck:convex` and the build pass;
  - all 14 browser suites and the sector suites pass;
  - `npm audit` still reports the 6 known findings (zod, body-parser, fast-uri), unchanged.
- **Live checks:**
  - `/`, `/en`, `/privacy`, `/en/privacy`, `/layla/dashboard` and `/en/owner/websites` return 200;
  - the privacy page shows "Last updated 31 October 2026";
  - signed out, `?form=application`, `?form=vat` and an unknown form all return 401 `sign_in_required`;
  - `/api/_assets/paymob/*.pdf` returns 404, so the forms have no public URL.

## Not verified live
- **Not tested live:**
  - a signed-in form download, which proves `includeFiles` bundled the PDFs;
  - a real document upload;
  - the brief email with attachments.
  
  No real documents were uploaded and no email was sent. Ahmed's test: on an Ascend account, open Website → Change my details → Online payments → Yes, download both forms, upload sample files and send. Then check the email attachments and the payments row in `/owner/websites`.
- **Phase 2 is not built:** keys, payment notifications, pay buttons and links, Layla payment links, and orders marked paid.
