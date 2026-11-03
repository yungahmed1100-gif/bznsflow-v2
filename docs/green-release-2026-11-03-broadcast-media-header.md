# Green release 2026-11-03: broadcasts with an image, video or PDF header; audit cleared

## Asked
Ahmed's approved template `clinics_1` (Arabic, image header) could not be chosen in New broadcast: the wizard only allowed text headers ("Media header"). He asked to allow it, then: "audit first then deploy".

## Shipped
- **Template rules** (`config/layla-templates.js`):
  - IMAGE, VIDEO and DOCUMENT headers are sendable. LOCATION and other header types stay unsupported ("Unsupported header").
  - Limits: JPG/PNG up to 5 MB, MP4 up to 16 MB, PDF up to 16 MB.
  - The send carries `{ type: 'header', parameters: [{ type: 'image', image: { link } }] }`, with a filename for PDFs.
- **Owner flow** (`CampaignWizard.jsx`, `HeaderMediaField.jsx`, `src/lib/dashboard/header-media.js`):
  - Choosing a media-header template shows "Add file".
  - Continue stays disabled until the file is added.
  - The browser uploads the file to Convex storage, then registers it.
- **Convex** (`blueCampaignState.js`, new table `blueCampaignMedia`, `blueCampaigns.headerMediaId`):
  - `campaign_media_upload_url` and `campaign_media_register` (manager, broadcasts capability).
  - A file is registered only within 15 minutes of its upload and only once, and then belongs to that account.
  - A file is bound to one campaign. Preview and create require it for a media-header template (`header_media_required`).
  - The worker claim sends a storage link. A missing file blocks the campaign (`header_media_missing`).
  - The minute cron deletes unused files after a day, and used files a day after their campaign ends (completed, cancelled or blocked).
- **Other surfaces:**
  - MCP: both new actions are browser handoffs to `/layla/dashboard`.
  - Sector drafts still use text-only templates.

## Audit
`npm audit` failed with 21 new advisories (6 high). The following changes clear them to **0 vulnerabilities**:
- zod 4.6.7 (the MCP SDK peer range is `^3.25 || ^4`);
- `@vercel/functions` 3.10.6;
- `npm audit fix` (vite, body-parser, follow-redirects, fast-uri, …);
- overrides for glob 14.0.3 and minimatch 11.0.4, used by exceljs's archiver and the checkly CLI.

After the change, an ExcelJS write/read round trip and `checkly --version` still work.

## Tests
- **Unit:** 4 new tests in `tests/blue-campaigns.test.mjs`. They cover sanitising, payload, upload rules, tenant isolation, one file per campaign, worker link, a missing file stopping the campaign, and the sweep.
- **Mutation checks:** 3 of 3 caught (no required-file check; no upload window; sweep ignoring campaign state).
- **Browser:** a new Arabic 375 px scenario in `tests/layla-dashboard-browser.mjs` (now 596 assertions). Continue is locked until the file is added, the file is registered, no overflow, axe is clean, and `headerMediaId` rides on preview.
- **`npm run test:release`: passed.**
  - 1,172 unit tests;
  - `typecheck:convex` and the build;
  - audit with 0 findings;
  - all 15 browser suites;
  - all sector suites;
  - Ascend end-to-end.
- **Environment note:** Playwright's Chromium (headless shell 1228) had to be reinstalled on this machine.

## Release
- **Commits:** `4de2b28` (feature) and `42d3071` (dependencies), deployed from a clean `git archive` of `42d3071`.
- **Lineage:** the live `dpl_4thNahZ1ySLurYJG97CimFZwkZw6` came from `1304ac3`, which master contains.
- **Convex Green** `prod:rare-fish-465` was deployed first. It added `blueCampaignMedia.by_created` and `by_storage` and deleted no indexes.
- **Vercel:** `dpl_BA8L25BHS9jcZV3xXamyqpTUgSx7`. Rollback is `dpl_4thNahZ1ySLurYJG97CimFZwkZw6`. Convex is additive, so the old site keeps working against it.
- **Live check (2026-11-03):**
  - `/`, `/en`, `/apex`, `/audit`, `/privacy`, `/layla/dashboard` and `/en/layla/dashboard` return 200.
  - An anonymous `campaign_media_upload_url` is refused (403 origin).

## Not done
- **No live send:** no signed-in live broadcast with a media header has been sent.
  - The first real use is Ahmed's: sync templates, choose `clinics_1`, add the image.
  - Recipients still need recorded consent.
- **Abandoned uploads:** a file uploaded but never registered (wizard closed mid-upload) is not swept.
