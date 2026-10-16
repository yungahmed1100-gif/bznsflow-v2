# Ascend agent build queue

Prepared 2026-10-10. **25 sector implementation files**, one shared foundation, one execution runbook and one engineering pack. All tasks are **not started**. This is the engineering layer for the [25 product specifications](../README.md), fitted to inspected Catalyst/Hasib code; it is not a runtime release.

## Start here

1. Read [engineering pack](engineering-pack.md) for scope, budgets, control ownership and release gaps.
2. Follow [shared foundation](shared-foundation.md) in dependency order: typed contracts/auth → attribution/fit → durable automation → six-tab UI → measurement → existing-domain bridge. Implement F08 fake/manual ingress with F02. Build F07 before the first sector needing cases/reservations.
3. Use [agent-runbook.md](agent-runbook.md) for exact preflight, commands, synthetic/isolated test distinctions and handoff evidence.
4. Build one sector at a time in the order below. Every sector references its existing product spec, exact current files, proposed files, fields/guards, acquisition route, event queue rules, UI mapping, KPI requirements and synthetic outcomes.

Reuse one shared engine, existing contacts/orders/bookings/jobs/payments/channels, and existing industry adapters. There is no 25-dashboard fork. The existing dev-only six-tab draft supplies presentation reference; this queue builds authenticated production-path behavior behind a gate.

## Foundation checkpoints

| ID | Result | State |
|---|---|---|
| F01 | Typed contracts, tenant/plan/staff gates, 25-sector registry alignment | not_started |
| F02 | Idempotent touchpoints, fit and separate opportunities | not_started |
| F03 | Durable jobs, effect reconciliation, consent/cap/expiry guards | not_started |
| F04 | Authenticated six-tab Ascend shell and current-data refresh | not_started |
| F05 | Evidence-based conversions, spend and reversible metrics | not_started |
| F06 | Existing domain adapter contract preserving stock/capacity/payment authority | not_started |
| F07 | Missing-domain case runner, artifacts/revisions, reservations | not_started |
| F08 | Source-ingress framework/fakes first; each real connector separate gated task | not_started |

F01→F02→F03 are strict dependencies; F04/F05/F06 follow. F08 synthetic framework follows F02 and is needed before first sector. F07 can follow the first two sector bridges, but must pass before B03 Media. “Source inspected” and “file exists” are not completion states.

## Default sector sequence

This order validates repairs first, reuses a mature deal pipeline second, then proves the missing-domain approach with Media. Related families follow to reduce rework. It is an implementation order, not a claim that earlier sectors are commercially more important. A sector may be selected independently once its stated foundations pass; don't build a substitute foundation.

| Task | Sector | Current registry | Prerequisites | Build status |
|---|---|---|---|---|
| B01 | [Electronics and phone store](retail-tech.md) | enabled | F01–F06 + F08 synthetic ingress | not_started |
| B02 | [Real estate](real-estate.md) | enabled | F01–F06 + F08 synthetic ingress | not_started |
| B03 | [Media & production](media.md) | pending | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B04 | [Retail & e-commerce](retail.md) | enabled | F01–F06 + F08 synthetic ingress | not_started |
| B05 | [Beauty & salons](beauty.md) | preview | F01–F06 + F08 synthetic ingress | not_started |
| B06 | [Dental clinics](dental.md) | enabled | F01–F06 + F08 synthetic ingress | not_started |
| B07 | [Medical clinics](clinic.md) | preview | F01–F06 + F08 synthetic ingress | not_started |
| B08 | [Air conditioning](hvac.md) | preview | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B09 | [Cleaning & facilities](cleaning.md) | preview | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B10 | [Automotive](automotive.md) | enabled | F01–F06 + F08 synthetic ingress | not_started |
| B11 | [Construction](construction.md) | enabled | F01–F06 + F08 synthetic ingress | not_started |
| B12 | [Cakes](cakes.md) | preview | F01–F06 + F08 synthetic ingress | not_started |
| B13 | [Coffee & dessert](cafe.md) | preview | F01–F06 + F08 synthetic ingress | not_started |
| B14 | [Restaurants](restaurant.md) | preview | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B15 | [Fitness & wellness](fitness.md) | preview | F01–F06 + F08 synthetic ingress | not_started |
| B16 | [Education & training](education.md) | preview | F01–F06 + F08 synthetic ingress | not_started |
| B17 | [Events & weddings](events.md) | pending | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B18 | [Marketing & agencies](marketing.md) | pending | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B19 | [Technology & software](technology.md) | pending | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B20 | [Manufacturing](manufacturing.md) | pending | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B21 | [Logistics & delivery](logistics.md) | pending | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B22 | [Travel & hospitality](travel.md) | pending | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B23 | [Legal services](legal.md) | pending | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B24 | [Finance & accounting](finance.md) | pending | F01–F06 + F08 synthetic ingress + F07 | not_started |
| B25 | [Other services — explicit fallback](other.md) | pending | F01–F06 + F08 synthetic ingress + F07 | not_started |

Current registry counts: **6 enabled, 9 preview, 10 pending**. These are source flags; “enabled” is not a fresh production certification. Preview/pending access is not changed by this pack.

## Copy-ready agent brief

> Read ascend/AGENTS.md, ascend/implementation/engineering-pack.md, shared-foundation.md and agent-runbook.md. Select the next dependency-complete task from ascend/implementation/README.md. Read that sector implementation file and its original ascend/<sector>.md. Preserve unrelated working-tree edits. Implement only that task through the current authenticated Hasib boundaries, with the documented typed data, event guards, six-tab placement and deterministic automated tests. Use fake transports; do not send live messages, buy ads, change production data or deploy. Record requirement-to-test evidence, gaps and next task under ascend/implementation/evidence/. Do not mark future features or synthetic results as live. If a dependency is missing, build that documented foundation first rather than duplicating it.

## What every handoff must contain

Changed files and revision; before/after behavior; field/API/schema versions; exact task status; passing/failing commands; synthetic vs real-backend evidence; coverage of eight KPI contracts/eight primary events/three original follow-up scenarios/additional workflow controls; remaining connectors or source inputs; rollback; next eligible task. No placeholder KPIs, unexplained false zeros or disconnected UI actions count as finished.
