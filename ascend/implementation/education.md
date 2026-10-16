# Education & training: agent build specification

Task **B16** · sector ID `education` · status **not_started** · source inspection 2026-10-10.
Current registry: **preview**; current owner workflow `lessons`; implementation family: **enrollment + sessions**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Education & training product/dashboard specification](../education.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Reuse membership/credit and booking foundations for enrolled sessions; add typed cohort/course/guardian prerequisites and accepted enrollment artifacts, not an assumed LMS.

Existing files to inspect and extend only as required:

- [convex/hasib/bookingsState.js](../../convex/hasib/bookingsState.js)
- [convex/hasib/membershipsState.js](../../convex/hasib/membershipsState.js)
- [src/components/hasib/BookingWorkView.jsx](../../src/components/hasib/BookingWorkView.jsx)

Existing operations / explicit gaps: **booking_create, booking_status, membership_create, membership_attendance, membership_credit_reverse, payment_record**.

Own these **proposed new** sector files:

- `config/ascend-growth/education.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/education.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/education.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-education-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Program-specific search/content, information sessions, school/employer partners and verified learner referrals.
- **Offer / next action:** Relevant course information plus an available trial, assessment or information session.
- **Deterministic fit:** Program interest, level/prerequisites, format, start date, availability and guardian authority where relevant.
- **Verified conversion sequence:** Attended information/trial session → accepted paid enrollment.
- **Repeat/referral route:** Course progression, opt-in next-term enrollment and learner/employer referrals.
- **First experiment:** Compare a generic prospectus CTA with a program-specific information/session path; judge actual enrollments and course starts. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L13** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: University case evidence is a proxy for training SMEs; a downloaded prospectus or submitted form is not enrollment.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| courseId / cohortId / format | owned catalog/cohort refs; enum online/in_person/hybrid | cohort capacity new typed policy |
| level / prerequisiteEvidence | customer-stated level and verified assessment reference if required | AI cannot certify eligibility |
| learnerRef / guardianId | verified learner identity/reference and contact if applicable | do not identify child solely by parent's contact |
| startsAt / schedule | UTC interval/session references | time conflict and seat checks |
| trialAttendedAt / enrollmentEvidence | actual session evidence and accepted terms | separate inquiry/trial/enrollment milestones |
| tuitionMinor / installmentPolicy | nonnegative minor units and approved payment plan | ledger installments, not repeated full revenue |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'education'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** A paid enrollment requires accepted terms, capacity and recorded payment conditions. Missing prerequisite assessment remains needs_input/review. Learner attendance is distinct from guardian message activity. Student withdrawal/refund reverses appropriate counts/revenue without deleting learning history.

**Mutation/event wiring:** Course inquiry→information/trial booking; trial attended→enrollment offer; accepted enrollment→session reminders; absent session→guardian/learner follow-up according to authority; course completion→next-level offer only when assessment permits.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `education.program_request` | Verified course interest and age/guardian relationship if needed | MISSING_INPUT | No sensitive learner detail before recipient authorization |
| `education.trial_application` | Eligible application and available resource | PRE_EVENT | Reschedule cancels old reminders |
| `education.enrolled` | Accepted terms, prerequisites and payment conditions | EV | Do not infer prerequisite completion from free text |
| `education.class_changed` | Authorized schedule change | EV; PRE_EVENT | Suppress obsolete room/time instructions |
| `education.attendance` | Instructor/LMS verified status | RECOVERY on verified absence | Unknown attendance is not absence |
| `education.assignment_due` | LMS assignment and actual deadline | REVIEW | Submission, extension or withdrawal supersedes reminder |
| `education.progress_published` | Instructor-approved assessment/report | EV | Only appropriate guardian/learner access; corrections preserve history |
| `education.term_completed` | Verified completion or upcoming enrollment expiry | RENEWAL; FEEDBACK | Failed/withdrawn outcomes cannot become completed automatically |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Explain approved programs, collect enrollment details, schedule trial/admission sessions, send class/assignment reminders and share authorized learner progress already recorded by instructors.
**Hasib:** Validate prerequisites, guardian relationships and capacity, create enrollment/cohort links, schedule class tasks, reconcile attendance/fees and calculate completion and retention with defined populations.
**Necessary human/source input:** Teach and assess learning; decide accommodations and admissions exceptions. Enter actual assessment/attendance only where the learning system cannot provide it; AI does not invent grades or replace professional safeguarding decisions.

One-time standing configuration: course catalog and fees; admission prerequisites; instructor/room capacity; attendance rules; guardian authorization for minors; renewal/payment rules; approved learning communications. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Program conversion reports use learner/enrollment units, customer acquisition uses defined paying household/account identity. Explicitly label these denominators.**

## 5. Six-tab UI wiring

Keep Chats · **Learning / التعليم** · Customers · Broadcasts · Insights · Settings. Default Work view: **Cohort and session schedule**. Exactly these permanent Work secondary views: **Schedule · Enrollments · Courses · Follow-ups**.

Primary action: **New enrollment**. Main row shows **Learner/cohort, next session, attendance, credits, document/fee state**. Filters: **Intake pending · Absent · Credits low · Completion due**. Details include **Verified guardian link; enrollment; session/credit ledger; staff-approved assessment**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Course/cohort; intake source; learning coverage; progression level**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B16.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B16.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B16.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B16.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B16.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B16.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B16.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B16.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B16.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../education.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Inquiry-to-enrollment conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Learner attendance | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Course completion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Fees overdue | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Verified learning attainment | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Remaining lesson credits | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Cohort seat utilization | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Continuation to next level | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per enrolled learner; session-to-enrollment; start/attendance rate; matured continuation**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Cohort capacity2; three accepted enrollments compete. Two siblings share guardian contact but have separate learnerRefs. One withdraws after paying30000 and receives10000 refund.

**Assert exact business results:** No third seat; siblings remain distinct enrollments but guardian contact dedupes; net tuition20000 for withdrawn record as ledger dictates; completion not inferred from paid fees; no messaging minor through unverified contact.

Additional sector acceptance requirements from the operating specification:

1. An unrelated adult cannot receive a minor's report through a matching surname.
2. A revised class time invalidates every affected old reminder.
3. Unmarked attendance remains incomplete and does not trigger a false absence warning.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-education-growth.test.mjs
node --test tests/hasib-memberships.test.mjs tests/hasib-bookings.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B16-education.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
