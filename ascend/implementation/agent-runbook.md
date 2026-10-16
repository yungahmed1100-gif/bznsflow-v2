# Agent execution runbook

Status: planned; documentation-only preparation on 2026-10-10. All build tasks start **not started**. One sector at a time; no status advances from reading a checklist.

## Preflight and scope

1. Read repository `AGENTS.md`, `ascend/AGENTS.md`, [engineering pack](engineering-pack.md), [foundation](shared-foundation.md), the selected implementation file and its linked product spec. Follow canonical Operating-System routing and relevant project skills. Read only affected shared contracts and source modules.
2. Run `git status --short`; record starting HEAD and dirty paths. This checkout already has unrelated route/draft changes. Preserve them. If isolation is necessary, create an isolated worktree without discarding uncommitted work; document how the draft reference was obtained.
3. Identify current environment from project documentation and nonsecret metadata. Do not print .env, credentials, private messages or production customer data. Current Green naming includes older Blue function names; names alone do not grant permission to use either environment.
4. Inspect named source paths and signatures again. The2026-10-10 file map is a starting snapshot. If drift changes an invariant, update the runbook with evidence before implementation. A missing proposed file is work to build; a missing existing file means resolve drift, not invent an import.
5. Select next eligible task in [build queue](README.md). Foundation tasks are built once. Do not change another sector's behavior except through reviewed shared changes with regression coverage. Registry enablement, outbound traffic, ad spend and production release require explicit current authorization.

## Execution contract per task

Record a small task log in proposed `ascend/implementation/evidence/<task-id>.md`: starting revision, owner/agent, task/dependencies, state, files in scope, requirements, test commands, dated results, remaining gaps and next exact step. States: not_started, in_progress, blocked, implemented_unverified, verified_locally. Production status is separate. A blocker must name the missing input/invariant, affected action and work still possible; do not mark a task finished because the preview renders.

Implementation order is always: failing behavioral fixture → typed schema/config → pure rules → authorized use case/domain bridge → atomic events/jobs → UI → metrics → integration/recovery tests → evidence. For low-impact copy changes use structural validation instead of mirrored tests. Use existing helpers; do not replace assertions with snapshots that merely echo configuration.

For a sector, read its original eight event rows and eight KPI definitions and map each to implementation symbol + fixture assertion in the evidence file. Include the additional workflow/control areas and acquisition rules. Passing only the new lead funnel is insufficient when the sector spec includes repair approval, delivery, membership, refund or project margin rules. Annotate any explicitly deferred feature in UI and evidence; it remains a gap against full-sector completion.

## Local test commands

Run from repository root. Existing Node tests are local harnesses; inspect newly added network stubs before execution. Never use real channel tokens, send invitations or call a customer transport during tests.

```sh
git status --short
node --test tests/hasib-api.test.mjs tests/hasib-plans.test.mjs tests/hasib-packs-gate.test.mjs tests/blue-dashboard.test.mjs
node --test tests/hasib-industry-journeys.test.mjs tests/hasib-followups.test.mjs tests/blue-qualification.test.mjs
npm run typecheck:convex
```

After creating foundation tests, run:
```sh
node --test tests/ascend-growth-contract.test.mjs tests/ascend-growth-auth.test.mjs tests/ascend-growth-outbox.test.mjs tests/ascend-growth-metrics.test.mjs
```

After creating the selected sector test, run its exact command in that file plus the listed existing regressions. New test names are proposed and will fail until implemented; do not report them as existing coverage. Run `npm run build` after UI/routing edits and inspect any generated sitemap/KB changes before retaining them. A script failure caused by an unrelated pre-existing file remains a recorded blocker with command output, not a pass.

Do not use `npm test` as the sole claim of coverage: inspect its current script targets first. Never run `convex:deploy`, `convex:dev`, migrations, production replay, Vercel deploy/promote or credential-changing setup as a local verification command. Codegen may contact a deployment; choose an explicitly isolated authorized development target before invoking it.

## Synthetic harness and browser requirements

Seed two tenants A/B, an Ascend manager, assigned/unassigned employees, Catalyst account, revoked member, preview account, opted-out contact and inactive sender using `tests/helpers/convex-memory.mjs`, `blue-tenant.mjs`, `hasib-contract.mjs`. Use `createHasibApi` and `hasibArgs` through `executeHasib` so the real HTTP argument shaper and Convex entry validators run. Extend schema assertions for new tables; don't bypass validation.

Clock:2026-10-12T05:00:00Z (09:00 Asia/Muscat), advance explicitly; seed independent DST-zone case. Fake all fetch/provider/model/storage callbacks. Fail tests on unexpected network calls. Drive domain transitions via handlers, not direct DB patching to manufacture success. Direct seeding is allowed for prerequisite fixture setup only.

Add proposed `tests/ascend-growth-browser.mjs` using the existing browser harness conventions and a local intercepted API fixture. Prove save/reload with a stateful API harness, not localStorage-only drafts. Then use an authorized isolated backend to prove persistence, concurrency and scheduler behavior before production readiness; in-memory fixtures cannot prove actual Convex indexes, transactional conflicts or deployment auth.

Screens: EN/AR at320/768/1440; exactly six Ascend destinations; no overflow; keyboard navigation/focus; loading/empty/error/denied/session-expired/offline states. Two browser contexts for server refresh; delayed responses cannot overwrite newer local state. Stale status visible after30s failure; committed update reflected within15s under target load. Verify Catalyst retains four tabs and every original allowed action.

## Minimum negative and recovery suite

Every sector inherits: foreign contact/work/artifact ID denial; missing CSRF; wrong plan; revoked workspace; assigned staff restrictions; founder preview write denial; gate disabled; payload oversized; duplicate same payload; duplicate conflicting payload; concurrent version writes; expired holds; stale quote approval; retry before effect; timeout after possible effect; provider receipt reordered; opt-out/reply/takeover after queueing; policy changed; missing spend; payment reversal; deletion/redaction; EN/AR formatting and minor units.

Simulate process stop after durable event insertion, after lease claim, after provider acceptance and before finalize. Assert recovery preserves domain state, prevents duplicate conversion and either reconciles or exposes uncertain delivery. Receipt replay must not reschedule the business follow-up. Record actual attempt counts and final rows.

## Completion and handoff

Complete a task only when exact source changes, automated results and remaining gaps are recorded. Give the next agent: task ID, revision, files, commands/results, schema/policy versions, next eligible task and blocked release conditions. Do not rewrite completed work or skip known failed cases.

Evidence template:
```text
Task / sector:
Started / completed / agent:
Revision and pre-existing dirty paths:
Requirement → source symbol → assertion:
Commands and dated outputs:
Passed / failed / skipped counts:
Synthetic vs isolated-real-backend evidence:
Migration compatibility and restore rehearsal:
Screenshots / metrics artifacts:
Open gaps and next exact task:
Runtime status / release authority / deployment evidence:
```

No runtime tests or deployments are asserted by the creation of these documents. Automated-only testing remains the standing instruction; a request for live recipient accounts is unnecessary.
