# Air conditioning workspace (Ascend, 2026-11-03)

AC service businesses (التكييف) get the six Ascend tabs, with **Jobs** as their Work:
- **Schedule:** the day's dispatch board, one column per technician, plus the jobs still waiting for a time.
- **Jobs:** filters for Today, Not booked, Parts needed, Contract visits due and Follow-up due.
- **Contracts:** annual maintenance contracts, the contract book and renewals.
- **Units:** every AC the business looks after, with its service history and next service date.
- **Follow-ups:** everything that needs someone, in one queue.

Built from `ascend/hvac.md` (task B08). Evidence: `ascend/implementation/evidence/B08-hvac.md`.

## How a job runs

1. **Request.** A customer writes "المكيف ما يبرد" on WhatsApp. Layla opens one **request**, marks it urgent, and keeps "not cooling" as a fixed choice. She books nothing and prices nothing. A request from outside the service areas is flagged for the team, never declined.
2. **Triage and estimate.** The team triages it, adds the customer's unit and writes an **estimate**. Catalog lines keep their fixed prices.
3. **Adiba's offer.** Hasib turns the estimate into Adiba's offer in the chat, and the owner approves it there. Hasib sends it himself only when every line is a fixed catalog price and the total is within the owner's limit, which is off (0) by default.
4. **The customer's yes.** The customer replies "نعم". That approves **exactly that estimate version**; a new version needs its own yes.
5. **Visit.** The team books a **visit window** with a technician, and a technician can't be booked into two windows. The customer gets a reminder a day before, automatically.
6. **On site.** The technician records the arrival, repair, checks and findings in their own words, then tested. A job completes only after testing with no failed check.
7. **Charge and payment.** Completing a job charges its approved estimate on Hasib's orders. The completion notice, with the balance, goes automatically. Payments are recorded by the manager.
8. **Next service.** The technician may set the unit's **next service date**. A reminder is drafted a week before, and Hasib never invents an interval.
9. **Repeat visits.** A customer back with the same fault within the window gets a linked repeat job and a quality review task. The task names no one.

## Maintenance contracts (عقد صيانة سنوي)
- **What a contract holds:** a draft covers some of the customer's units, with visits a year (1–12), a term and a price.
- **Activation:** the contract is activated on the customer's recorded yes, which charges it and links its units.
- **Visits:** visit dates are spread evenly through the term. Hasib opens each visit as a job two weeks before it is due, once only, and the team books it.
- **Renewal:**
  - a renewal message is drafted 30 and 7 days before the end, for the owner to approve;
  - "Draft renewal" creates next year's contract, which Adiba offers at the owner's price, never sent automatically;
  - the customer's yes activates and charges it.

## Rules (Settings → Follow-up rules)

| Rule | Default | What it does |
|---|---|---|
| Visit reminder | Sends itself | A day before the window. A moved visit gets its own reminder |
| Job completed | Sends itself | 30 minutes after completion, with the balance. Not sent if more than 2 days late |
| Estimate follow-up | Waits for approval | Day 2, then day 7. A reply, a decision or a new version stops it |
| Service due | Waits for approval | A week before the technician's date, and for contract visits nobody booked |
| Contract renewal | Waits for approval | 30 and 7 days before the end |
| Outstanding balance | Waits for approval | 3 days after completion or activation |
| Parts late | Task | After the expected date |
| Visit not recorded | Task, for the technician | An hour after a window with no arrival |

Messages that send themselves go only inside WhatsApp's 24-hour window, at most 3 a day per customer, never while the team handles the chat. Kill switch: `HASIB_AUTOMATION=off`.

## Insights
- **Headline:** on-time arrival · first-time fix · maintenance due · job contribution.
- **Diagnostics:** request→booked · time to first visit · estimate acceptance · repeat-fault rate · contract renewal · jobs past promise · average ticket · money owed.
- **Also shown:** the contract book, money owed by age, and revenue per technician-day.
- **Breakdowns:** job type, unit type, area, contract vs one-off, urgent vs routine, month (the summer peak).
- **How figures read:** each one names its population and window, and opens its exact records. Industry figures are references only.

## Who sees what
- **Manager:** everything.
- **Service advisor:** jobs, schedule, units and estimates.
- **Technician:** their own visits and jobs only, with no prices or estimates. They record arrival, checks, parts, tested and the next service date.
- **Agents (Layla, Hasib, Adiba):** they never take payment, cancel, book visits or move a job's stages.

## Tests
- **Unit:** `tests/hasib-hvac.test.mjs`, `ascend-hvac-growth.test.mjs`, `hvac-insights.test.mjs`, `hasib-hvac-load.test.mjs`, `hvac-workspace-ui.test.mjs`.
- **Browser:** `tests/hvac-browser.mjs`.
- **End to end:** the `hvac` journey in `tests/ascend-e2e-browser.mjs`.
- **Demo:** `node scripts/hasib-demo.mjs 5310 --pack=hvac` ("Barid Cooling", Muscat). Add `--role=employee` to sign in as a technician.
