# Ascend local interaction draft

Updated 2026-10-10 to the [six-tab design](../ascend/dashboard-design.md). Local product review using the existing dashboard paper/ink styling and modal component. No deployment, backend changes, provider calls or messages.

Start with `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`.

- Work: http://127.0.0.1:5174/en/owner/ascend-draft?industry=media&tab=work&view=board
- Insights: http://127.0.0.1:5174/en/owner/ascend-draft?industry=media&tab=insights
- Arabic: http://127.0.0.1:5174/owner/ascend-draft?industry=media&tab=work&view=board

## Implemented preview

Six primary destinations: Chats, industry Work, Customers, Broadcasts, Insights and Settings. Work uses sector-specific EN/AR labels, including Productions for Media. It contains the board, a schedule/list and Follow-ups. Customers contains customer records and linked work. Settings keeps BznsBrain, channels and illustrative follow-up behavior. On small screens an expandable menu exposes all six destinations.

All 25 industries have example work stages, records, a sector trigger and four headline KPI labels aligned with their specifications. The Media Insights example calculates four metrics from a separate fixed cohort of 12 fictional completed productions: on-time final delivery, median approval wait, revision overrun and project contribution. Select a card to inspect its formula and four sample-week chart. View source records opens the same read-only cohort under Work; Back to Insights preserves the selected metric, including after reload.

Other sectors deliberately display unconnected reporting states rather than invented outcomes. Their records and KPI labels remain explorable. The six active Media jobs and their follow-ups are separate from the completed reporting cohort; changing an active job does not rewrite historical sample results.

Existing interactions remain: open work records, advance a stage, create/edit/snooze follow-ups, simulate approval/completion or a reply stopping linked tasks, pause/resume sample automation, filter, save chat/campaign/knowledge drafts and reset. No send transport or scheduler runs. Changes to active sample records persist by sector in browser localStorage; the read-only reporting fixture is fixed.

Legacy links for Customers → work/followups and earlier `today`, `followups`, `money`, `rules` destinations resolve into the six-tab structure. Secondary-view links preserve the selected industry.

## Limits

This is an interaction preview, not all sector specifications implemented end to end. Sector-specific calendars, resource reservation, production permissions, authoritative data adapters, full diagnostic reporting, typed production records and durable follow-up automation remain implementation work. Generic record dialogs and board/list surfaces illustrate the current setup. The sample reply action stops all open tasks linked to its sample job; it is not the proposed workflow-specific production stop policy.

Routes are registered only when `NODE_ENV` is `development`. The preview needs no login and calls no application APIs. It is not evidence of production authentication, real channel delivery or live KPI accuracy.

## Verification

Six-tab revision checked on 2026-10-10:

- 54 screen/language/viewport cases: nine views across six tabs × EN/AR × 320/768/1440. Six navigation items and no horizontal overflow.
- 50 industry/language pairs checked in both Work and Insights, verifying sector labels and four KPI cards.
- Report drill-down, metric selection, return and reload; legacy link mapping; follow-up create/reload/snooze/reply cancellation; reset and mobile menu navigation passed.
- Report calculations and zero-record behavior passed (fixture results: 75%, 51 hours, 25%, OMR 1,746 contribution).
- Axe WCAG A/AA checks passed on EN desktop Insights and AR mobile Follow-ups. No page exceptions or application/backend/provider requests observed in automated checks.
- Production build passed. All 109 generated client JS/JSON/HTML assets were checked; no Ascend draft route or fixture marker was included.

The interaction harness initially needed explicit hydration/navigation waits after reload and menu navigation; the final interaction run passed. A pre-existing root-document `js-reveal` class hydration warning remains in ordinary dev mode; reduced-motion checks avoid that unrelated root script.

Evidence and repeatable browser harness: ignored `work/ascend-draft/six-tabs/`. This is local preview evidence, not production release acceptance. Runtime files: `src/components/ascend-draft/`, the two draft route modules and development-only registration in `src/routes.ts`.
