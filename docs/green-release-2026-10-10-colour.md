# Green release 2026-10-10: colour with meaning, a live hero

**Source:** `59378f1` + `02a5cd7` on `master`, released at Ahmed's request ("polish … verify then push for production"). Frontend only; no Convex change.

## What changed
- **Colour meanings, site and app** (DESIGN.md: amended Annotation Rule, new Meaning Rule):

  | Colour | Means |
  |---|---|
  | Blue | The customer / an inquiry |
  | Green | Layla working / available / done |
  | Yellow | In progress |
  | Orange | What matters next / the record |
  | Coral | A problem |

  - Light tints fill small indicators only.
  - Still no gradients, blur, glows or tinted cards.
- **Hero:**
  - The five pipeline steps carry their colours and cycle through a worked villa-inquiry example.
  - Steps are buttons; picking one stops the cycle.
  - Reduced motion never starts it.
- **Home:**
  - section underlines in their own colour;
  - plan status and stage chips;
  - numbered FAQ;
  - coloured solution tiles;
  - About shows the brand art instead of the placeholder avatar;
  - industry icons in colour.
- **App:**
  - sidebar icon tiles per section;
  - tinted channel, qualification, consent and status chips;
  - Layla switch green when on, yellow when paused;
  - BznsBrain progress and tabs;
  - setup and wizard steps green when done, orange when current;
  - Today cards squared, with no gradient or blurred shadow.
- **Polish (`02a5cd7`):**
  - one start edge for every section (the FAQ list was centred);
  - a fixed 420px pipeline in both languages, as wide as the text and buttons when stacked;
  - the centred hero caption loses its side rule;
  - spec rows stack on phones;
  - the About art matches its card;
  - the duplicate footer line is removed;
  - table chips size to their text on phones.

## Evidence

| Item | Value |
|---|---|
| Verification | On `02a5cd7` alone (git archive): build; 882/882 unit tests; chat 70/70; all 10 browser suites, including the new `tests/home-browser.mjs` (36 checks: cycle, pick, reduced motion, section colours, axe, EN/AR, 320–1440). The fix for blue text on a blue tint (now #1f4f7a) came from an axe contrast failure. |
| Vercel | `dpl_DUbLDWGnB158y4gVS9tpENT4LA72`, promoted. Deployed with the installed CLI 54.9.1 (`npx vercel` fetched 63.1.2, which was not logged in). |
| Smoke | 200 for `/`, `/en`, `/layla/dashboard`, `/en/layla/dashboard`, `/catalyst/setup`, `/privacy`, `/llms.txt`; 307 for `/layla/setup`. `tests/home-browser.mjs` passed against https://www.bznsflowai.com (36/36). |
| Rollback | `vercel promote dpl_CcvFtRnmhU7hCJWwzUiLnbKq8qM3 --yes` |

## Not included
- Another session's uncommitted Ascend draft (`src/routes.ts`, `src/components/ascend-draft/`, `ascend/`, `docs/ascend-*`).
