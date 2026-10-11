# The six-tab workspace kit (refactor, 2026-10-11)

Real Estate, Media, Fitness and Dental were built by copying each other. Commit `c1cbaad` moved what they share into one kit, with **no behaviour change**:
- `convex/hasib/entryArgs.js` and the schema are untouched;
- with a frozen clock, every read operation's JSON and 96 screenshots (four sectors, EN/AR, 1440/320) are identical to `92b49a2`.

A new sector should be configuration plus its own domain code.

## What a sector supplies, and what the kit does

| Concern | Kit (shared) | The sector keeps |
|---|---|---|
| Follow-ups queue | `convex/hasib/workspace/followups.js`: task rows, buckets, draft rows, dated follow-ups, counts/sort/cap (`queueSelection`), `resolveTask`, `snoozeTask`, `contextContact` | Who may see a row (`ownerOf`, visibility), what each row adds, its filters and order |
| Drafts | `workspace/drafts.js`: `sendApprovedDraft`, `approveDraft`, `draftRefusal`, `reconcileRuleDrafts` | Draft text (`*Rules.js`), its message link fields |
| Insights | `workspace/insights.js`: `insightsPeriod`, `segmentRows`, `contactNames`; `workspace/metrics.js` | KPI populations and summaries |
| Records | `workspace/records.js` (`replayOr`, `strip`), `workspace/rows.js`, `workspace/conversation.js`, `workspace/text.js` (greeting, local time and day) | Lifecycles, guards, operations |
| Layla intake | `workspace/turn.js` (`sectorTurnPack`) | What the intake records |
| Registration | `workspace/sectors.js` (`SIX_TAB_SECTORS`): operations, settings arg and key, draft field. In `hasibState.js`, `SECTOR_CODE` maps each pack to its settings read/merge, queue and executor | One entry in each list |
| Screens | `src/components/hasib/workspace/`: `RulesForm`, `QueueList`, `RecordsTable`, `insights.jsx` (`InsightsHeader`, `KpiDetail`, `NoteList`, `SegmentTable`), `contextCard.jsx` (`useWorkContext`), `useWorkspaceShell` (+ `backLabel`), `TeamView`, `labels.js` (`labelsFrom`, `BUCKET_TONE`), `src/lib/hasib/workspaceLinks.js` | Words, windows, id prefix (`re`/`md`/`ft`/`dn`), extra fields and buttons, record views and forms |
| Styles | `workspace.css`; `sector-records.css` for record and list tones | Sector-only pieces (board, roster, schedule) |

`src/pages/LaylaDashboard.jsx` mounts the sector from `SIX_TAB_DASHBOARDS`.

## Kept different on purpose

- **Real Estate's queue:** its `approval` bucket and six filters.
- **Rules screens:** each sector's offered mode order; Real Estate and Media add an extra settings field.
- **Label wording:** "patient" vs "customer", and the label fallbacks (`—` in Real Estate, the raw code in Media).
- **Ids:** each sector's id prefix stays, because the browser suites select on them.

## Checking a future refactor

Run these before and after:
1. `npm run build && node scripts/workspace-snapshot.mjs <tree> <out> <port>`: four demos with a frozen clock (`scripts/workspace-fixed-clock.mjs`), all read ops plus key screens.
2. `python3 scripts/workspace-compare.py <before> <after>` (needs Pillow): JSON must match exactly; screenshots may differ only by anti-aliasing (no pixel more than 16 grey levels apart).

The baseline is taken from a clean worktree of the old commit, e.g. `git worktree add --detach work/release/<sha> <sha>`, linked to the main `node_modules`, then built.
