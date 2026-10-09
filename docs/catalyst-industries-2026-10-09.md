# Catalyst industry preparation — 2026-10-09

Status: production release authorized on 2026-10-09; release verification in progress. Ahmed requested automated tests only, so no live channel message is part of this release.

## Scope and acceptance

Give every named Catalyst industry a dedicated English/Arabic business-information starter, add Media and production as an industry, and retain Other as the generic starter. Reuse the current BznsBrain setup, approved business facts, catalog and deterministic qualification flow. Media covers photography, video, audio/podcast and production inquiries; it does not imply publishing or advertising integrations.

Interfaces: industry selector and profile validation → BznsBrain template → draft save/publish → sector routing and qualification. Existing business documents must remain intact when their industry changes. Unedited hints must fail publication; unknown industries must fall back safely. Templates describe information the owner must supply, not facts or services we promise on their behalf.

Acceptance: all industry/language templates validate after owner completion, preserve their sector, and reject unedited placeholders; Media resolves from its id and bilingual labels and captures appropriate inquiry fields; all industry qualification cases pass; bilingual setup selection/save/reload, mobile layout, keyboard and accessibility checks pass; Convex typecheck and production build pass.

Ascend operational releases, clinic governance gates, production configuration and live outbound messages are outside this change. No live-pack flags are added. No database migration is needed. Before a future release, record a compatible Vercel/Convex rollback pair; preserve the additive Media identifier and all saved documents if any Media customers have onboarded. Do not delete or rewrite their records during rollback.

## Prepared result

- 24 named industry templates plus the generic Other starter, each in English and Arabic: 25 starters / 50 language variants.
- 18 new dedicated starters: medical clinics, AC/HVAC, cakes, cafés, restaurants, beauty/salons, fitness, education/training, cleaning, logistics, travel, events, legal, finance, marketing, technology, manufacturing and Media. The existing six dedicated starters remain.
- Media id `media`, labels **Media & production / الإعلام والإنتاج**, is included in the shared industry validation, sector routing, qualification fields and generated onboarding suggestions.
- Media qualification records production type, date needed and area, with optional budget. Photography, video, audio/podcast and editing requests have bilingual examples. Crew availability, quotes, bookings, rights and deliverables require owner-approved information and team confirmation.
- Selecting Other now preserves `sector: other`; unknown or inherited-object names use the generic template safely. Existing owner-written documents survive an industry change.
- The shared industry-catalog test increases its total and pending count for Media; the Hasib registry, capabilities and operational implementation are unchanged. This is Catalyst preparation only.

## Verification

Local checks against the current working tree on 2026-10-09:

| Check | Observed result |
| --- | --- |
| Complete unit inventory: `node --test --test-reporter=spec tests/*.test.mjs` | 872 passed, 0 failed. Includes the existing unrelated work present in this checkout. |
| Final targeted template, sector, qualification and onboarding regressions | 91 passed, 0 failed after the unknown-sector fallback review. |
| New Catalyst industry tests | 54 cases, including all 25 choices × EN/AR draft save, unfinished-template refusal, owner completion, publication and stale-write refusal; Media validation, routing, behaviour and synthetic inbound capture. |
| `npm run typecheck:convex` | Passed. |
| `npm run build` | Passed; existing chunk-size and React Router future-flag warnings remain. |
| Generated suggestions and onboarding coverage | `node scripts/gen-sector-prefill.mjs --check` and `node scripts/check-onboarding-coverage.mjs` passed. |
| BznsBrain browser suite | 1,403 checks passed against the final rebuilt bundle. Covers 150 industry/language/viewport selection and reload scenarios at 320/768/1440px, keyboard/focus and Axe checks for Media, preservation of owner text, and existing setup/Settings journeys. |
| Local diff review | Dedicated bilingual content, sector-id preservation, unknown-key fallback, generated-data consistency and unchanged operational release gates checked. `git diff --check` passed. |

The browser suite uses the static production build on localhost, stateful synthetic API responses and blocked external traffic. The backend cases use the real domain executors with the in-memory Convex harness. These checks do not certify real Meta delivery, real customer data or live model quality for each industry. No production deployment, production mutation, paid model evaluation or live outbound message was performed.

Deployment needs both the website build and Green Convex functions because Media qualification is shared backend code. The preparation above predates the deployment authorization. Current release evidence is recorded in `docs/green-release-2026-10-09-catalyst-industries.md`.
