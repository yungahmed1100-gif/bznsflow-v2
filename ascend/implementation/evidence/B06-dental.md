# Dental clinics six-tab workspace (from ascend/dental.md, task B06)

Date: 2026-10-11. Status: built and verified locally against the real Convex state code. **Not deployed yet.** `dental` was already a live pack. This replaces its old Today / Visits (orders) / Services / Money screens with the six-tab **Visits** workspace. Ascend itself is still "in preparation — do not quote".

Decisions (Ahmed, 2026-10-11):
- **Release:** replace the live dental dashboard on Green after every local check passes, the same way as Fitness.
- **Sending:** Hasib writes neutral EN/AR drafts and opens tasks by itself. A manager approves each send. There is no scheduler and no automatic sending.
- **Approach:** simple and automated. Staff record facts, and Hasib does the rest.

## What was built

**The order-to-visit adapter.** Before this change a dental "visit" was only a Hasib order, a charge: there was no appointment, attendance or missed visit, and the generic booking metrics read empty tables. Now:
- **`dentalVisits`** is the appointment: provider, optional chair, time, attendance and recall.
- **Charges** stay on `hasibOrders`. Each visit has at most one charge order (`kind: 'dental_visit'`), and payments and refunds use the existing payment path.
- **Older orders with no visit** are left untouched. Insights discloses them as "charges without a visit record" and never counts them as attendance.

**New tables** (`convex/hasib/dentalSchema.ts`, additive only):

| Table | Holds |
|---|---|
| `dentalResources` | Providers and chairs (name and active only) |
| `dentalVisits` | Patient, an optional guardian for a minor, a treatment snapshot (name and group only), provider, chair, time, status, fixed cancellation reason and lateness, reschedule count, replacement link, charge order and due date, dispute flag, the clinician's recall date (who set it and when), and a capped history |
| `dentalTasks`, `dentalDrafts` | The shared kit's task and draft shapes |

**Additions to existing tables:** `hasibSettings.dental`, and `dentalDraftId` on `blueMessages` and `blueCampaignRecipients`. **No notes and no free text** are stored: only the fixed cancellation reasons go into the history.

**Derived on read** (`dentalDomain.js`):
- an outcome not yet recorded (shown as unknown, never as missed);
- confirmation due;
- new vs returning patient;
- balance overdue;
- recall due;
- time of day.

**Automation** (`dentalState.js`, `dentalClinic.js`):

| Staff records | Hasib does |
|---|---|
| Add visit (or Book from Layla's request) | Refuses a clash for the provider, the chair or the patient. A minor without a guardian is refused with `guardian_required`, and the request stays open. Booking closes the Layla request |
| Reschedule | Same record, back to booked. The old confirmation draft is withdrawn and a new one is written for the new time |
| Confirmed / arrived / completed | Arrival waits for the visit time. An arrived visit that later completes counts as one attended visit. Completion opens a self-closing "Record charges" task (managers) |
| Missed (after the end) | One rebook task and one recovery draft. Both close when the patient is rebooked. A receptionist's "Patient declined" withdraws the message |
| Cancel (fixed reason) | Records whether the cancellation was late (inside the cutoff) at that moment, and withdraws the visit's drafts |
| Record charges (manager) | Treatment lines from Layla's catalog become the visit order, due after the balance terms. A past-due balance opens a self-closing task and a private balance draft. Payment, a dispute or a refund stops both |
| Recall date (from the clinician) | Reminders 14 and 3 days before, the closer one replacing the earlier. A changed or cleared date withdraws the old reminder, and a booked visit stops them. Hasib never suggests an interval |

**Rules** (all on, draft mode): `visit_confirmation` (1 day before), `missed_recovery` (2 h after), `recall` (14 days, then 3 days before), `balance_due` (1 day after the due date).
- Drafts name no treatment or symptom.
- None go to an opted-out contact.
- A minor's drafts go to the guardian.
- Approval goes through `workspace/drafts.js`: 24-hour window, approved UTILITY template, opt-out.

**Layla intake** (`dentalTurn.js`): a request that carries the already-validated service or preferred-time fields opens one "Book a visit" task. None of the patient's words are copied.

**Insights** (`dentalInsights.js`):
- **Headline cards:**
  - visit attendance (recorded outcomes only; unknown disclosed);
  - missed visits;
  - follow-ups due (as of now);
  - overdue visit balances (as of now; disputed balances left out).
- **Diagnostics:**
  - chair utilization (from configured chair minutes and open days);
  - late-cancellation rate;
  - recall completion (matured window W);
  - charge collection (returned charges shown separately).
- **Also:** 8-week trends; breakdowns by provider, service group, new vs returning, and time of day; exact drill-down with Back to Insights. Clinic costs and Add expense stay in Insights.

**UI** (`src/components/hasib/DentalDashboard.jsx`, `src/components/hasib/dental/`):
- **Tabs:** Chats · **Visits** · Patients · Broadcasts · Insights · Settings. Receptionists see the first three.
- **Visits views:** Schedule (a day per provider, with one-tap Confirm / Arrived / Completed / Missed) · Visit list (Today · Unconfirmed · Missed · Follow-up due, plus a preview drawer) · Services (providers and chairs, treatments from the catalog, supplies) · Follow-ups.
- **One visit record:** Overview · Attendance · Charges (manager) · Recall · Follow-ups · Activity.
- **Beside Chats and Patients:** `DentalContext`.
- **Old links:** today → schedule, orders → visit list, stock → services, money → Insights.

## Requirement → code → automated assertion

| Requirement | Code | Assertion (`tests/ascend-dental-growth.test.mjs` unless named) |
|---|---|---|
| Six tabs, Visits label, views, aliases, receptionist limits | `navigation.js`, `config/hasib-packs.js` | "six tabs…"; `dental-browser` §1–2, §9 |
| `dental.administrative_request` | `dentalTurn.js` | B06 journey (request opened, no text copied, closed by booking) |
| `dental.slot_selected` | `visitBook`, `slotRefusal` | "booking: provider, chair and patient clashes…" |
| `dental.reschedule` | `visitReschedule` + rule keys | B06 journey (old reminder withdrawn, regenerated) |
| `dental.arrival_or_completion` | `visitStatus`, `transitionRefusal` | "status guards…"; arrived → completed counts once |
| `dental.missed_visit` | `rebook_missed`, rule `missed_recovery` | "missed visit: one rebook task and one recovery draft…" |
| `dental.recall_due` | `recallSet`, rule `recall` | "recall: only a clinician-set date…" |
| `dental.charge_due` | `charge`, `balanceOverdue`, rule `balance_due` | "charges: … paying, disputing or refunding stops it" |
| `dental.customer_reply` | Shared send path, takeover on approval | "drafts: approval goes through the shared send path" (auto-handling a patient's reply: see gaps) |
| B06 journey: one attended new-patient visit, no stale reminder, no invented recall, guardian flow stays needs-input, no clinical text | All of the above | "B06 journey…" |
| Orders with no visits → attendance unavailable, never a false 0 | `legacyCoverage` | "Insights: … never a false zero" |
| K01–K08 golden values, unknown disclosed, drill-down equals population | `dentalInsights.js` | "Insights: eight KPIs…" |
| Roles and tenant isolation | `MANAGER_ONLY`, `EMPLOYEE_DENIED`, `MANAGER_TASKS`, `owned()` | "roles and tenants…"; "charges…" |
| EN/AR, 320/768/1440, axe, overflow, no errors | UI | `dental-browser` §1 |

## Verification (2026-10-11, local)

| Check | Result |
|---|---|
| `node --test tests/*.test.mjs` | 939/939, including `ascend-dental-growth` (13) and `dental-workspace-ui` (3); old dental navigation assertions updated to the six tabs |
| `npm test`, `npm run typecheck:convex`, `npm run build` | Pass |
| `node scripts/run-browser-tests.mjs` | All 10 suites passed; the dashboard suite now checks dental's six-tab Visits at every width |
| `node tests/dental-browser.mjs` | 315/315 |

The dental browser run covers:
- manager and receptionist, EN/AR at 1440/768/320, with axe, overflow and request-error checks;
- a Layla request booked, then confirm → arrived → completed → charges → payment;
- a missed visit rebooked, with its message withdrawn;
- a recall draft approved, then blocked outside the window until a template exists;
- self-closing tasks;
- Insights drill-down and Back after a reload;
- chat → visit → Back, and patient → visit;
- rules persisting, and receptionist limits.

**Demo:** `node scripts/hasib-demo.mjs 5391 --pack=dental`, plus `--role=employee` for the receptionist. It now runs without the preview harness, as production does. The old `tests/hasib-dental-browser.mjs` tested only the removed screens and was retired.

## Not built (gaps against the full spec)

- **Automation:** automatic sending, scheduler and durable outbox. Drafts wait for a manager.
- **Patient replies:** a reply does not confirm or reschedule by itself. Approving a draft hands the chat to staff (takeover), who record the outcome.
- **Integrations:** no practice-system or check-in integration, and no chair calendar with closures (utilization uses configured hours).
- **Acquisition:** ad spend and attribution (cost per attended new-patient visit is not shown).
- **Concurrency:** true concurrent booking of one slot is protected by Convex OCC on the indexed range read, which the serial in-memory harness cannot prove.
- **Signed-in use:** a signed-in dental session on production remains an owner check.
