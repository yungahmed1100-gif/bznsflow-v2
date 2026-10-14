# Green website release — 14 October 2026

Authorization: Ahmed requested “great now push it all to production” after reviewing the website changes in this conversation.

## Release scope

- Arabic and English Catalyst/Ascend cards describe owner outcomes and saved work.
- Layla appears with her portrait in Catalyst; Ascend includes Layla, Hasib, Adiba and Rasil with portraits. Rasil remains explicitly coming soon.
- Ascend includes a free lead capture website as a gift, with a gift icon and localized badge. Services, structured data and llms.txt agree.
- Remove the industry list from the Ascend card.
- Replace the About illustration with the supplied team meeting artwork; lossless WebP conversion preserves the source image, with uncropped responsive sizing and localized alternative text.

No Rasil backend, email sending, authentication, Convex, webhook, scheduler or credential changes are included. No outbound messages are sent.

## Baseline and rollback

Verified production on 14 October: `dpl_FaKxRMzrzxDp3ZBdHvHqFwbp5JBa`, READY, project `bznsflow-main` (`prj_4UheWOGFd6uC8yEgsM9J7eEcmu9t`), source metadata `a692f76e7f98e1414156770c52275702766a847c`.

The isolated `copy/ascend-rasil-website` worktree starts at `8e94b12`, which adds only the previous release record to that source. Preserve the baseline deployment for rollback. The main checkout's unrelated edits remain untouched.

## Verification before release

- Production build passes.
- 38 homepage browser checks pass across Arabic/English, 320–1440 pixels, accessibility, reduced motion and browser errors.
- Four SEO/static HTML regression tests pass.
- Local visual inspection confirms portraits, team artwork and gift badge.
- Impeccable detector findings are confined to existing status/colour rules and an existing text-size advisory; no new finding is attributed to the changed styles.

Build and deploy from a committed archive with private environment files, local tools and work artifacts excluded. Verify the READY candidate and recheck the live baseline immediately before promotion. Deployment and production observations will be recorded below.

Evidence directory: ignored `work/release-2026-10-14/` in the isolated worktree.
