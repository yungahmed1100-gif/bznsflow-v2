# Green release 2026-10-08: Layla on Qwen, Catalyst 4-tab dashboard, full front office

Source: `b86f25b` on `master`, released at Ahmed's request ("keys are in, deploy").

## What changed

### Layla's replies are written by Qwen (`qwen-plus`, Alibaba Model Studio, Singapore)
- **Webhook:** decides only a whole-message STOP. Photos, voice notes and over-long text are flagged.
- **Convex ingest:** stays deterministic. It handles qualification capture, Hasib stock, order and listing facts, the flood cap, the daily cost guard and the gates. It records a pending reply and schedules `blueMessaging.respond` 2.5 s later.
- **The reply action** builds the turn from the published bzns.md sections, the approved catalog with price labels, published answers, tone, team contact and history. It then calls Qwen, checks the result, and commits under the conversation and profile version fences.
- **`validateReply` fails closed** on:
  - prices not found in the catalog, live facts or order lines;
  - numbers, emails or links not found in the sources;
  - "confirmed" order or booking claims without an order line;
  - a reply in the wrong language;
  - more than one question.

  It also enforces the tone's emoji rule and length caps. Stock and order lines go out word for word.
- **Failures:** one retry, then an honest fallback with the team contact.
- **The setup preview** uses the same turn.
- **Removed:** the keyword router, lexicon, FAQ and section matchers, the RAG prototype, the phrase composer, the intent-eval scripts, and the clinic medical-safety stop (by Ahmed's choice; clinic text is kept for 24 h).

### Front office
- No Human attention queue and no Resolve button.
- What Layla can't handle gets the team contact, and she keeps replying in the chat.
- A team contact is required to publish bzns.md.
- One switch per chat.

### Catalyst dashboard
- Four tabs: Chats, Broadcasts, Customers (with CSV export), and Settings (business, services & prices, channels).
- The sector is set at sign-up and can be changed only in Settings.
- A setup reminder asks for services and a team contact.

### Other
- Approving, archiving or publishing the catalog bumps `profileVersion`, which fences stale replies.
- The privacy page lists Alibaba Cloud.

## Evidence

| Item | Value |
|---|---|
| Verification | Full `npm run test:release` on the code before two final validator fixes: 791/791 unit tests, audit 0 vulnerabilities, all 10 browser suites, every sector suite, 12/12 scenarios. The final code: 792/792 unit tests, Convex typecheck, build. |
| Live eval | `scripts/eval-layla-ai.mjs` against real `qwen-plus`: 178/180 across real estate, retail and dental × 3 tones × EN/AR/Gulf/Arabizi. p50 1.5 s, p95 2.5 s, ≈775 input and 66 output tokens per reply. The two failures were injection attempts that correctly fell back. Report: `work/eval/layla-ai-2026-10-08T05-03-17-235Z.json`. |
| Keys | Ahmed reported that `QWEN_API_KEY`, `QWEN_BASE_URL` and `LAYLA_AI_MODEL` were added to Convex and Vercel production. Not independently verified: reading env names was blocked for the agent. |
| Convex | `rare-fish-465` deployed after a clean dry run: schema validation complete, no index deletions, additive fields only (`blueConversations.pendingReply`, `blueMessages.ai`). |
| Vercel | `dpl_EmLF7r5VnRHnaSSLhVKx76BkGLFY`, promoted 2026-10-08. |
| Smoke | All pages returned 200 (`/`, `/en`, setup, dashboard, `/privacy`, `/en/owner/access`). Unauthenticated messaging returns 401; an unsigned webhook returns 403. No Convex errors after deploy. |
| Rollback | `npx vercel promote dpl_BAQgkpS7Wzy5tmbZA2YWAnhspDUv --yes`. Convex code stays: the schema is additive, but the old Vercel code no longer writes replies inside the webhook. A full rollback therefore also needs the previous Convex code (`5f09eb1`) redeployed. |

## Not yet proven in production
- A real customer message answered through Qwen on WhatsApp or Instagram. Next step: Ahmed sends a test message; check `blueMessages.ai` on the reply, which shows the model, latency and whether the fallback was used.
- **Recovery gap:** a pending reply whose action never ran (for example during a deploy) is not retried. That customer gets an answer when they next write.
