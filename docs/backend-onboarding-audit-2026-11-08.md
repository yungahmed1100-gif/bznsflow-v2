# Backend and onboarding audit — 8 November 2026

Source baseline: `aecd3f2`, uncommitted local candidate. This pass follows the owner's instruction to leave UI/UX alone and focus on backend/onboarding. Earlier visual changes remain untouched. No production queries, deployment, live emails, payment attempts, Meta registration, number changes or outbound messages were performed.

## Scope and outcome

Traced Catalyst setup progress, session/plan/manager gates, BznsBrain acceptance/publication, Ascend website drafts/submission, domain lookup validation and failed-email recovery. Reused the existing account, Convex state executors and API adapters. No new onboarding screens or integrations were introduced.

| Confirmed failure | Backend correction | Regression evidence |
| --- | --- | --- |
| After a failed brief email, starting another draft changed the retry's fields and removed submitted attachments under the same idempotency key. | The retry requests a submitted-only read. Working drafts remain resumable and unchanged. | Integrated API → state executor → synthetic email test fails before the fix; afterward the retry has the same fields, attachment list and key, records its receipt, and does not send an acknowledged version again. |
| Changing the profile name or delivery deadline also changed that retry's message under the same key. | Submission captures typed `emailContext` (account email/name and due date) atomically with the brief version/project. Submitted-only reads use it; the normal editor/tracker still shows current metadata. | Failing-before/passing-after test changes both values and checks stable retry context alongside current editor values. |
| Publish cleanup could retire Q&A accepted into an unpublished draft, including another tab's acceptance between publication and cleanup. | Cleanup defers while the current draft differs from published knowledge. The next matching publication retires accepted answers idempotently. | Failing-before/passing-after test covers acceptance without publication, interleaved acceptance after publication, no premature retirement/live-context change, and later successful/idempotent cleanup. |
| Registrar price coercion treated null, blanks, booleans, arrays and negative numbers as acceptable cheap/free domains. | Require an explicit number or nonblank numeric string, finite and nonnegative, within the configured cap. | Failing-before/passing-after test rejects malformed/missing/negative prices while preserving numeric zero and valid numeric strings. |

## Interfaces and failure behavior

- `createWebsiteBriefApi` adds the internal `submittedOnly: true` argument for resend. `websiteBrief.execute` validates its optional boolean type. Existing session, manager, grant and tenant checks run before selecting either view.
- `websiteBriefs.emailContext` is optional and typed. Existing records remain valid; historical records without a snapshot use current metadata. Their exact original display metadata cannot be reconstructed by this patch.
- Brief persistence still precedes email delivery. Failed delivery retains the saved version; receipt recording remains version-fenced. A newer submitted version cannot be acknowledged by an older version's email completion.
- Publish cleanup uses one Convex mutation's read/write boundary. Deferral preserves live Q&A until the newer draft is published; it does not publish that draft automatically.
- Domain lookup validation changes interpretation of malformed responses, without purchasing or registering a domain.

## Verification

- Four new regression cases failed before their respective fixes.
- All 69 tests in the seven directly affected setup/brain/brief API and state files passed.
- Full unit inventory: **1,237 passed, 0 failed**.
- `npm run typecheck:convex`: passed.
- `git diff --check`: passed.
- Independent code and JavaScript reviews: no remaining confirmed issues in this pass.

Raw ignored evidence: `work/hero-preview/backend-onboarding-before.log`, `backend-onboarding-metadata-before.log`, `backend-onboarding-after.log`, `backend-onboarding-units.log` and `backend-onboarding-types.log`.

The earlier full browser/build/release result in `website-audit-2026-11-08.md` predates this backend-only increment. This pass verifies API/state behavior with synthetic effects and Convex types; it does not claim a new production or live-provider acceptance run.

## Release and rollback

Deploy the additive Convex schema/function changes before the API candidate that sends `submittedOnly`. The owner's subsequent 8 November authorization narrows the production release to MCP and onboarding fixes. The earlier media suppression schema addition and separate messaging fixes are excluded from this candidate and remain local. See `green-release-2026-11-08-mcp-onboarding.md` for the release evidence.

Rollback only this pass's website-brief API/state/argument, brain cleanup and regression changes; keep the optional schema field compatible with any records already written. Preserve unrelated working-tree edits. Do not revert the whole schema or checkout as a shortcut.

Remaining acceptance includes real provider/email delivery, authenticated production onboarding, Meta channel eligibility, and historical email retries without a captured context. These local tests establish none of those external outcomes.
