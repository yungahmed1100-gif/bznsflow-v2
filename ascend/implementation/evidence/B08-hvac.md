# Air conditioning six-tab workspace (from ascend/hvac.md, task B08)

Date: 2026-11-03. Status: built and verified locally against the real Convex state code. Going live (`hvac` in `HASIB_LIVE_PACKS`) is a separate commit and release, recorded in `docs/green-release-2026-11-03-hvac.md`.

## Decisions (Ahmed, 2026-11-03)
- **Scope:** prepare the HVAC dashboard on the practice and KPIs of the best-run service companies, test it end to end, then take it live.
- **Contracts:** annual maintenance contracts (AMC, عقد صيانة سنوي) get their own **Contracts** view. This makes five Work views instead of the spec's four, because contracts are an AC business's steady income between summer peaks.
- **Automation default:** facts send themselves, decisions wait as drafts, and risks become tasks (as in automotive, 2026-10-12).
- **No client yet:** no HVAC client is named in the vault, so the release goes ahead on Ahmed's instruction and the decision record says so.

## Research basis
Sources: ServiceTitan KPI tables, FieldEdge, ACHR News, Contracting Business, and GCC sources for AMC norms (Qatar, UAE and Saudi listings).
- **KPIs shown:**
  - on-time arrival (reference ≥95%);
  - first-time fix (≥80%);
  - request→booked (≥60%);
  - estimate acceptance (45–65%);
  - repeat-fault rate (≤2%);
  - contract renewal (85–95%);
  - time to first visit;
  - average ticket and revenue per technician-day;
  - money owed by age.
- **References, not targets:** benchmarks appear only as reference text. The business sets targets once it has a 30-day baseline (the vault's pattern).
- **Left out on purpose:**
  - technician ranking (the spec rules it out);
  - utilisation and gross margin per job, which need time tracking and parts costing that small shops don't keep reliably. Job contribution is shown only for jobs with costs marked complete, with coverage disclosed.

## What was built

**Records.** `convex/hasib/hvacSchema.ts`, additive only:

| Table | Holds |
|---|---|
| `hvacUnits` | A customer's AC unit: type, brand, BTU, area, contract link. The next service date is set by staff only, with who and when |
| `hvacContracts` | AMC: units, visits a year, term, price, status (draft / active / renewed / cancelled), acceptance evidence, renewal chain, the charge's order |
| `hvacJobs` | A request through to completion: type, source, urgency, reported symptom (a fixed list, never a diagnosis), checklist, parts, costs, history |
| `hvacVisits` | A technician's window, arrival, outcome. The job's state before the visit lets a missed visit put it back |
| `hvacEstimates` | Numbered versions: draft / issued / approved / rejected / superseded; lines priced from the catalog or typed |
| `hvacTasks`, `hvacDrafts` | The kit's task and draft shapes |

Other changes:
- `hasibSettings.hvac`.
- `hvacDraftId` on `blueMessages` and `blueCampaignRecipients`.
- `SECTOR.hvac` in `config/hasib-packs.js`: catalog services become items, and parts stay internal stock.

**Derived on read, never stored:** visit due dates, contract payment status, estimate expiry, a passed window with no arrival, repeat faults, maintenance due.

## Requirement → implementation → assertion

| Requirement (ascend/hvac.md) | Implementation | Assertion |
|---|---|---|
| Lifecycle request → triaged → estimate → approved → scheduled → on site → repairing → tested → completed; parts/hold resume; cancel needs a reason | `hvacDomain.js` (`MOVES`, `moveRefusal`, `stateOnArrival`), `hvacJobs.js` | `hasib-hvac.test.mjs`: "a staff job goes request → …", "waiting for parts…", "jobs are idempotent… cancelled only with a reason" |
| Billable repair only after the customer's yes to the latest version; inspection and contract visits can be tested straight away | `scopeApproved`, `moveRefusal` | "on site, billable repair waits for the customer's yes…"; mutation check (guard removed → test fails) |
| A later estimate version needs its own yes | `latestSent`, `approvalRecord` | "a staff job…" (v1 yes refused after v2); growth "a revised estimate withdraws the offer…" |
| Completed only after tested with no failed check | `moveRefusal`, `checklistSave` | "a failed check after testing sends the job back"; browser journey 3 |
| A technician can't be in two windows | `visitSave` + `findOverlaps` | "a technician cannot be booked…"; load test (1 of 30 contested bookings); mutation check |
| No diagnosis from the customer's words | `SYMPTOMS` enum; `hvacTurn` keeps only a fixed symptom | growth "hvac.request"; UI test (the API drops a free-text "diagnosis") |
| No invented maintenance interval | `unitService` (staff only, who and when) | growth "hvac.service_due… no date, no reminder" |
| Layla's intake: one urgent request, nothing booked or priced, outside-area flagged | `industryTurns.js` `hvacTurn`, `outsideAreas` | growth "hvac.request", "flagged for the team, not declined"; e2e step 1 |
| Adiba: estimate offer at catalog prices; customer's yes approves that version; auto-send only at catalog prices within the limit | `adibaSubjects.js` `hvac_estimate`, `hvacAutomation.js` | growth "hvac.estimate", "Hasib sends… only when…"; e2e |
| AMC: visits opened as jobs once each; renewal drafted 30 and 7 days before; renewal offer never auto-sent; acceptance activates and charges | `hvacAssets.js`, `openContractVisits`, `hvac_contract` subject, `hvacRules` | growth "contract visits…", "hvac renewal…"; browser journey 4; e2e; mutation check (renewal set to Auto → tests fail) |
| Rules: visit reminder and completion send themselves; estimate follow-up, service due, renewal and balance wait; parts late and no-arrival are tasks | `hvacSettings.js`, `hvacRules.js`, `hvacBoard.js` | growth: defaults, "hvac.scheduled", "hvac.tested_complete", "estimate_followup…", "risks are tasks"; browser rules round trip |
| KPIs with numerator, denominator, window, coverage; empty is "no eligible records" | `hvacMetrics.js`, `hvacInsights.js` | `hvac-insights.test.mjs` golden values for all 12; mutation check (first-time fix ignoring repeats → fails) |
| Drill-down to the exact records; breakdowns | `hvac_metric_records`, `segmentOf` | insights tests; browser journey 6 |
| Staff limits: technician sees own jobs, no prices; manager-only money, contracts, Insights, approvals | `hvacState.js` (`MANAGER_ONLY`, `TECHNICIAN_OPS`), `capabilities.js` | "a technician sees only their jobs…"; browser journey 9; e2e employee |
| Agents never move stages, take payment or book | `HVAC_AUTOMATION_ALLOWED` | growth "automation can be switched off…" |
| Bounded reads at scale | `SCAN` in `hvacBoard.js`; `complete:false` disclosed | `hasib-hvac-load.test.mjs` |
| Six tabs EN/AR, 320/768/1440, RTL, no overflow, axe clean | `HvacDashboard.jsx`, `hvac/*`, `navigation.js` | `tests/hvac-browser.mjs` (340 checks) |

## Deviations from the build file
- **Growth adapter layout:** no `config/ascend-growth/hvac.js` or `convex/hasib/growthAdapters/hvac.js`. No shipped sector uses that layout. HVAC follows the shipped six-tab kit (`workspace/*`) as automotive, dental and fitness do.
- **Industries suite:** `tests/hasib-industries-browser.mjs` excludes `hvac` (as with Real Estate and Fitness), because HVAC now has its own dashboard and suite.
- **Today view:** the legacy `today` operation gives the clinic Today only to dental; HVAC keeps the shared job measures there. Six-tab packs route Today to Work → Schedule.

## Not verified here
- No real tenant's history, so KPI accuracy on real data is unproven.
- No signed-in production session, and no Meta delivery.
- Automatic sends outside the 24-hour window need approved utility templates. Until then the message becomes a `template_required` task.
