# Green release 2026-11-04: send a media-header template as approved

Ahmed (2026-11-04), on the "صورة الرأس" (header image) step: "why do i have to add a header photo to be able to send, customer should be able to send the template as is from meta". Then: "deploy directly from here make sure the front end matches what we have said".

## Why a file was required
- Meta does not send a template with an IMAGE, VIDEO or DOCUMENT header unless the send request includes the header media.
- WhatsApp Manager fills that in with the sample approved with the template.
- The 2026-11-03 media-header release (`docs/green-release-2026-11-03-broadcast-media-header.md`) asked the owner for a file instead of doing the same.

## What changed (`128aa1c`)
- **No file needed:** when the owner confirms a broadcast without a file, the dashboard API reads the template fresh from Meta (`{templateId}?fields=name,components`) and takes `example.header_handle[0]`.
  - The sample is downloaded only over HTTPS from Meta hosts (`*.whatsapp.net`, `*.fbcdn.net`, `*.fbsbx.com`).
  - Redirects are followed only between those hosts, at most 3.
  - The download must match the header's type and size limits.
- **Stored like an upload:** the sample is stored and registered exactly like an owner upload (`campaign_media_upload_url` → `campaign_media_register`). The send worker is unchanged, and a scheduled send does not depend on Meta's signed link.
- **Optional file:** an owner file only replaces the sample.
- **Convex:**
  - preview no longer needs a file;
  - create still needs one stored file (the dashboard API supplies the sample);
  - a file id that belongs to another account is refused (`header_media_invalid`).
- **New refusal:** if Meta returns no usable sample, the owner sees `header_media_sample_unavailable`: "add the file yourself".
- **Front end (EN/AR):**
  - The header step says the approved image, video or PDF is sent as is. The button reads "Use a different file" / "استخدم ملفاً آخر", and Continue no longer waits for a file.
  - The review step says which header will be sent: "الرأس: الصورة المعتمدة مع هذا القالب في واتساب." ("Header: the image approved with this template in WhatsApp") or "الرأس: ملفك <name>" ("Header: your file <name>").

## Verification
- **Unit tests:** the new `tests/template-sample.test.mjs` covers:
  - fresh read and download;
  - text header;
  - PDF filename;
  - non-Meta host, plain HTTP, missing handle, wrong type and oversize;
  - a redirect off Meta (refused) and one between Meta hosts (followed);
  - store and register, and a failed upload.
- **Campaign tests:** `tests/blue-campaigns.test.mjs` was updated for the new preview and create rules.
- **Browser test:** `tests/layla-dashboard-browser.mjs` adds an Arabic 375px "send as is" path: no upload, no `headerMediaId`, the header line shown, axe clean, no overflow. The own-file path also checks "الرأس: ملفك clinic.png".
- **Full check:** `npm run test:release` passed:
  - 1,210 of 1,210 unit tests, the Convex typecheck and the build;
  - `npm audit` with 0 findings;
  - all 15 shared browser suites, every sector suite and Ascend end-to-end (107).

## Release
- **Lineage:** live was `dpl_9JvKHJ1FiEQPXX1gTrcW4jxYCDV6` from `77fa988`, which master contains.
- **Convex Green `prod:rare-fish-465` first,** from a clean `git archive` of `128aa1c` with the Green selector. The dry run showed no index deleted and no schema change.
- **Vercel:** `dpl_9qKomhhgryuWyKBVAyJ8qpx1PhVe` (`--meta sourceCommit=128aa1c`), production on `www.bznsflowai.com`.
- **Rollback:**
  - Vercel: redeploy `dpl_9JvKHJ1FiEQPXX1gTrcW4jxYCDV6`.
  - Convex: the old site always sends a file, so the relaxed preview rule is harmless to it.
- **Live check (2026-11-04):**
  - `/`, `/en`, `/apex`, `/audit`, `/privacy`, `/layla/dashboard` and `/en/layla/dashboard` return 200;
  - an anonymous `campaign_create` gets 401 `sign_in_required`; a cross-origin call gets 403;
  - the live bundle contains the new EN/AR copy and no longer contains "أضف ملفاً".

## Not done
- **First live use (2026-11-04, 15:49 Muscat):** the `clinics_1` broadcast to 100 recipients was created without an owner file.
  - 6 sends went out: 1 delivered and 5 read. Meta accepted the template's own sample as the header.
  - Meta then returned 131042 (payment issue) on 2 sends, so the campaign stopped as designed (`payment_method_required`) with 92 not sent. That is the WABA billing problem from 2026-10-11, not this release.
- **MCP:** `campaign_create` through the MCP still cannot send image, video or PDF header templates. It has no file argument and no sample step; this predates the release.
