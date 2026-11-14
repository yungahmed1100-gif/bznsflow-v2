# Website end-to-end coverage

The shared entry point is `npm run test:release`. It discovers all `tests/*.test.mjs`, checks Convex types, builds the static application, audits dependencies, then runs shared and sector browser suites. Browser/provider fixtures never constitute live delivery or production authentication evidence.

## Coverage matrix

| Area | Reusable checks | Boundary and important cases |
| --- | --- | --- |
| Every built route | `site-pages-browser.mjs` | Derives 56 paths from the current prerender config; desktop/mobile; locale, direction, title, overflow, browser/hydration errors, local assets and internal links. Public pages additionally check h1/canonical/indexing and serious/critical axe findings. Protected paths are signed-out render smoke only. |
| Public home | `home-browser.mjs`, `hero-motion-browser.mjs` | EN/AR320–1440; plans, disclosures, account navigation, booking links; forward/reverse scroll, keyboard-selected story steps, actual WebGL drawing/pause, SVG fallback, context loss, runtime reduced-motion changes, shared loading/error cleanup. |
| Additional browser engines | `npm run test:cross-browser -- <local-origin>` | Prepared Firefox/WebKit EN/AR desktop/mobile smoke for hero controls, overflow, legal tables and signed-out routes. Requires matching Playwright runtimes; not executed in the 8 November audit because the runtime download was too slow. |
| Sign-in and access | `auth-browser.mjs`, `owner-browser.mjs`; `auth`, `blue-auth`, `owner-access`, `dashboard-entry` unit files | Sign-in destinations, session/CSRF, revoked/missing grants, platform owner, plan/workspace gates, tenant/foreign actors through entry wrappers. Real email/social-provider returns remain separate acceptance. |
| Setup and BznsBrain | `product-setup-browser.mjs`, `brain-browser.mjs`, `review-onboarding-browser.mjs`; product/brain unit files | Saved drafts, publish/revision fences, approved catalog, questions, failed parsing, no-grant recovery, signing in without remounting the wizard; bilingual responsive states. |
| Channels and messaging | WhatsApp/Instagram/switch browser suites; `blue-messaging`, `blue-instagram`, `layla-ai-pipeline`, `inbound-media`, `green-webhook` | Channel health, paused ingress, opt-outs, handoff, stale/duplicate events, raw signatures, media download/storage refusals, retention, transcription fallback and stale-generation fencing. Meta transport/model responses are synthetic. |
| Chats and customers | `layla-dashboard-browser.mjs`; `blue-dashboard`, `blue-owner-replies`, `blue-contacts-import` | Conversation selection, mobile pane height, takeover/resume, retained text/media, consent, import/export, search, keyboard focus and role/tenant restrictions. |
| Broadcasts | Dashboard browser suite; `blue-campaigns`, broadcast/template unit files | Approval/consent, variables and headers, schedules, caps, throttling, cancellation, duplicates, ambiguous results, receipt ordering and idempotent chat creation. |
| Email | Dashboard browser suite; `rasil`, `rasil-state`, `rasil-api`, `email-subscription` | Sender/domain states, consented subscribers, unsubscribe/suppression, preview/send states, received webhook contracts. No real domain or email mutation. |
| Payments and websites | `paymob-e2e-browser.mjs`, owner browser suite; paymob/website brief/onboarding unit files | Browser→API→domain→queued email→admin queue rehearsal, money calculations, webhook validation/idempotency, incomplete documents and permission boundaries. No real payment or email. |
| Audit and Apex | `audit-browser.mjs`, `apex-browser.mjs`; audit/apex unit files | Validation, available/error/success states, request persistence and authorized administration; calendar/email effects substituted. |
| MCP | `mcp-browser.mjs`; `mcp-oauth`, `mcp-state`, `mcp-schema`, `mcp-coverage` | Consent independent of execution approval, scopes, grants, tenant/workspace checks, immutable approvals, expiry, idempotency, revocation and audit receipts. External client interoperability is a separate gate. |
| MCP protocol → domain | `mcp-flow-e2e.test.mjs` | Real local OAuth/PKCE, two provider instances, SDK pagination/calls, API-to-entry-handler-to-domain persistence, website approval, replay/conflicts, provider inspection/failure/recovery, refresh and revocation. Convex HTTP/persistence and provider responses remain synthetic. |
| Sector operations | Retail, retail-tech, real-estate, media, fitness, dental, HVAC and construction/automotive browser suites; sector/Hasib unit files | Nine workspaces, managers/employees, captured inquiries, inventory/orders/jobs/visits/deals, operational transitions, stock/money rules, follow-ups, imports, settings and previews. |
| Cross-feature operations | `ascend-e2e-browser.mjs`, Catalyst demo browser suite | Whole-journey rehearsal using real domain logic and synthetic effects; customer messages become records/actions/outcomes. |
| Analytics/privacy | `posthog-browser.mjs`; `posthog`, static HTML/SEO tests | Public analytics allowlist, no private/customer data or identifiers, local/preview suppression, noindex/canonical/hreflang and prerender contracts. |

## How to interpret results

The focused backend follow-up is recorded in [backend-onboarding-audit-2026-11-08.md](backend-onboarding-audit-2026-11-08.md): failed-email recovery with a newer draft, stable submission email context, concurrent Q&A acceptance/publication cleanup, and malformed registrar prices. Its full unit inventory passed 1,237 tests; external effects remained synthetic.

- Automated route coverage is not a promise that every possible state or defect is covered. Dedicated workflow suites assert real user outcomes and important failures.
- Private route smoke does not authenticate a real account. Domain/entry-wrapper tests and mocked browser roles establish local behavior at different boundaries.
- Real provider eligibility, live sends, production restores, field performance and real-model accuracy need their own authorized observations.
- The audit script substitutes local Vercel telemetry scripts because `/_vercel/*` is provided by the hosting platform, not the static preview server.
- Screenshots, traces and raw reports belong in ignored `work/`; changes should include regression cases and a concise verified result in the dated audit record.
