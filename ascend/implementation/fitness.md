# Fitness & wellness: agent build specification

Task **B15** · sector ID `fitness` · status **not_started** · source inspection 2026-10-10.
Current registry: **preview**; current owner workflow `memberships`; implementation family: **trial + membership**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Fitness & wellness product/dashboard specification](../fitness.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing bookings, memberships and credits; growth links trial → membership → retention cohort with explicit identity.

Existing files to inspect and extend only as required:

- [convex/hasib/bookingsState.js](../../convex/hasib/bookingsState.js)
- [convex/hasib/membershipsState.js](../../convex/hasib/membershipsState.js)
- [src/components/hasib/BookingWorkView.jsx](../../src/components/hasib/BookingWorkView.jsx)

Existing operations / explicit gaps: **booking_create, booking_status, membership_create, membership_update, membership_attendance, membership_credit_reverse**.

Own these **proposed new** sector files:

- `config/ascend-growth/fitness.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/fitness.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/fitness.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-fitness-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Social demonstrations, member referrals, local partnerships and search for the offered program.
- **Offer / next action:** A real trial, tour or introductory session under the published offer.
- **Deterministic fit:** Goal/program preference, location, schedule and class/coach capacity; avoid unnecessary medical information.
- **Verified conversion sequence:** Attended trial → activated membership → retained member at W.
- **Repeat/referral route:** Attendance-based support, referral invitations and term renewal.
- **First experiment:** Compare a generic membership inquiry with a published-offer trial-slot path; judge attended trials, paid membership and matured retention. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L08** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: No fabricated health benefits or automatic pressure based on inferred health conditions.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| programId / goalPreference | approved plan/program and bounded customer preference | no medical inference |
| locationRef / preferredTimes | owned location and UTC windows≤5 | coach/class capacity |
| trialBookingId / trialAttendedAt | owned booking and actual attendance timestamp | not inferred from booking confirmation |
| membershipId / startsAt / endsAt | owned plan record and valid interval | current membership contract |
| attendanceWindow / absenceThresholdDays | policy integer1..90 | server-derived attendance gap |
| freezeEvidence / renewalPermission | contract event/reference and purpose consent | freeze periods excluded according to metric spec |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'fitness'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Membership activation requires accepted plan and payment/credit conditions; trial attendance requires actual check-in. No double credit decrement from replayed attendance. Absence triggers supportive reengagement, not diagnosis. Freeze/cancel stops inappropriate renewal sequences.

**Mutation/event wiring:** Trial booked→PRE_EVENT; trial attended→eligible membership offer; membership activated→onboarding; absence threshold→configured CHECKPOINT then one permitted EV reengagement invitation; expiry→RENEWAL; renewal event closes old sequence. Respect class capacity and guardians where needed.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `fitness.membership_inquiry` | Requested plan and constraints | MISSING_INPUT; QUOTE | Do not promise health outcomes |
| `fitness.activated` | Accepted terms and verified payment condition | EV | Duplicate payment event creates one membership |
| `fitness.class_booked` | Valid entitlement and slot | EV; PRE_EVENT | Freeze/cancellation invalidates ineligible future bookings per policy |
| `fitness.waitlist_promoted` | Verified capacity release | SLOT_OFFER | Expired offer moves fairly to next eligible customer |
| `fitness.attendance_recorded` | Access scan or instructor-confirmed outcome | EV optional | Missing check-in stays unknown, not automatically no-show |
| `fitness.inactive` | No qualifying visit over configured observation window | RECOVERY once per episode | Stop on reply, visit, freeze, opt-out or expiry |
| `fitness.renewal_due` | Current entitlement approaching expiry | RENEWAL | Stop on renewal, cancellation, dispute or opt-out where applicable |
| `fitness.freeze_cancel` | Verified eligible customer request | EV; BALANCE where due | Exceptional health or contract questions go to qualified staff |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Explain plans and available classes, handle bookings/freezes within policy, ask missing intake questions, send attendance/renewal reminders and offer supportive re-engagement without health claims.
**Hasib:** Validate entitlements and capacity, maintain membership lifecycle, reconcile access/attendance/billing, promote eligible waitlists, calculate retention cohorts and surface exceptions.
**Necessary human/source input:** Deliver training and make professional exercise/health judgments; enter missing actual attendance or assessment facts. Manager decisions are limited to exceptional credits, disputes or nonstandard membership terms.

One-time standing configuration: membership plans/entitlements; class capacity and waitlist order; freeze/cancellation/grace rules; renewal pricing; coaching scope; contact preferences. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Separate membership revenue, earned service value and cash timing; don't label every existing-member renewal a new lead conversion.**

## 5. Six-tab UI wiring

Keep Chats · **Memberships / العضويات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Member action list**. Exactly these permanent Work secondary views: **Members · Classes · Plans · Follow-ups**.

Primary action: **Add membership**. Main row shows **Member, plan, term end, last attendance, renewal state, owner**. Filters: **Trial follow-up · Attendance gap · Expiring · Frozen**. Details include **Membership lifecycle; attendance/credits; payment status; renewal history**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Plan/term; acquisition cohort; class type; frozen vs active**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B15.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B15.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B15.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B15.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B15.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B15.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B15.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B15.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B15.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../fitness.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Trial-to-member conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Membership renewal | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Members with attendance gap | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Class attended occupancy | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Opening-cohort retention | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Membership net growth | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Recurring membership revenue | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Class no-show rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per attended trial; trial-to-paid membership; acquisition payback; matured retention/freeze-adjusted churn**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Five trials confirmed, three attended, two activate paid memberships. One member's attendance webhook repeats; another freezes for7days.

**Assert exact business results:** Trial attendance60%, attended-to-paid66.67%; two acquired paid members; duplicate attendance consumes one credit; absence/retention clock handles freeze by versioned policy; no offers after opt-out.

Additional sector acceptance requirements from the operating specification:

1. A freeze excludes its defined period from eligible retention/renewal populations.
2. Duplicate attendance events count one visit and cannot create repeat outreach.
3. A waitlist offer respects both available capacity and current membership entitlement.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-fitness-growth.test.mjs
node --test tests/hasib-memberships.test.mjs tests/hasib-bookings.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B15-fitness.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
