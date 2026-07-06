# BznsFlow Web Chat — setup (n8n 2.63)

New, isolated stack. Does **not** touch the live WhatsApp Layla workflow.
LLM: **Groq — Llama 3.3 70B Versatile** via the native AI Agent + Groq Chat Model sub-node.

## 1. New Supabase project
1. Create a fresh Supabase project (separate from the live WhatsApp DB).
2. SQL Editor → run `schema-web-chat.sql` (creates `web_conversations`, `web_messages`,
   `web_rate_limits` + `web_bump_rate()`, all RLS-locked to the service role).
3. Project Settings → Database → **Connect** → prefer the **Session pooler** connection
   (Railway can't reach the IPv6-only direct host). Note:
   - Host: `aws-<n>-<region>.pooler.supabase.com` (e.g. `aws-0-ap-southeast-1.pooler.supabase.com`)
   - Port `5432`, Database `postgres`, User `postgres.<project-ref>`, Password, SSL `require`.
   - (Transaction pooler also works — the workflow's SQL is single-round-trip.)

## 2. n8n on Railway
1. On the Railway n8n service, set `GENERIC_TIMEZONE=Asia/Muscat` and `WEBHOOK_URL=<your public n8n URL>`.
   Also set `EXECUTIONS_DATA_PRUNE=true` and `EXECUTIONS_DATA_MAX_AGE=168` (7-day retention —
   prevents execution-log disk bloat under production traffic).
   (You do NOT need `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` — this workflow uses credentials, not `$env`.)
2. n8n → **Credentials → New**:
   - **Postgres** credential named **`Supabase Web Chat (Postgres)`** → fill from step 1.3.
     SSL = `require` **and turn ON "Ignore SSL Issues"** (Supabase's pooler serves a self-signed
     chain; the connection stays encrypted). Click **Test connection** — must be green.
   - **Groq** credential (type `Groq API`) named **`Groq account`** → paste your Groq API key
     (`gsk_…`) from [console.groq.com](https://console.groq.com).
3. n8n → **Workflows → Import from File** → `chatflow-web.json`.
4. Attach credentials (import has placeholder ids — n8n prompts you to pick the real ones):
   - The 3 **PG:** nodes → the Postgres credential.
   - **Groq Chat Model** → the Groq credential.
5. **Activate** the workflow. Open **Web Chat Webhook** → copy the **Production URL** (`…/webhook/chat`).
   Give that URL to wire into the Phase 3 widget.

## 3. Test (checklist)
```bash
# 1) happy path → 200 {"reply":"…","sessionId":"web-test-0001","handoff":false,"handoff_context":""}
curl -s -X POST "$N8N_URL/webhook/chat" -H 'Content-Type: application/json' \
  -H 'Origin: https://www.bznsflowai.com' \
  -d '{"message":"مرحبا، عندي مقهى وأبغى بوت واتساب","sessionId":"web-test-0001"}'
# 2) bad origin → HTTP 403 ; over-long (>800 chars) → HTTP 400 ; missing sessionId → HTTP 400
# 3) handoff → send a demo/pricing intent; expect "handoff":true + handoff_context set
# 4) rate limit → >20 requests/min from ONE IP → HTTP 429
#    (a rotating client IP won't trip it; the per-IP bucket is keyed on the real client IP)
```

## Architecture notes
- Secrets: **credentials only** — no `$env`, no keys in the workflow JSON.
- Supabase via the **Postgres node** (parameterized SQL, atomic upserts, `web_bump_rate()` RPC) —
  cleaner than PostGREST, and the REST/`supabaseApi` node can't call the rate-limit function.
- **Query params use ARRAY expressions** (`={{ [$json.a, $json.b] }}`), never the comma-joined
  string form — n8n splits the *resolved* string on commas, so any value containing a comma
  (most replies!) silently shifts into the wrong parameter. Found + fixed in stress testing.
- LLM: **AI Agent (v3.1)** with the **Groq Chat Model** sub-node (`llama-3.3-70b-versatile`).
  The agent has `retryOnFail` (3×, 5s) + a wired **error output** → `LLM Error Fallback`,
  so an LLM blip never hangs the webhook (caller always gets JSON). Fallback path verified live.
- History is folded into the agent's system message by **Build Prompt** (no memory sub-node needed —
  `PG: Session + History` already supplies the last 20 turns).
- **Knowledge base = keyword retrieval**: the service catalog (`layla-knowledge-base.md`) is embedded
  as data in **Build Prompt**; each message is matched against section Keywords and only the **top 3
  sections** are injected, in the visitor's language (~1–1.2k tokens vs ~7k full KB — fits Groq
  free-tier TPM). Editing the catalog = edit `layla-knowledge-base.md`, then mirror the change in the
  Build Prompt node's `KB` array.
- ⚠️ **Railway `N8N_ENCRYPTION_KEY` must stay pinned as a service variable** — if a redeploy changes
  it, ALL n8n credentials become undecryptable ("Credentials could not be decrypted"). Happened once
  (2026-07-05) while editing env vars; recovered by restoring the key.
- **Shape Response** reconstructs the reply payload after `PG: Log Assistant Reply` (whose UPDATE
  returns no row), so the webhook always responds with the reply/sessionId/handoff JSON.
- Sessions are anonymous `web:{sessionId}`; no lead/phone row until the WhatsApp handoff.
- Rate limits (in **Rate Limit Decision**): per-IP 20/min, global **1000/day** (Groq free-tier
  token budget; raise after upgrading the Groq tier).
- **Accepted risk — unauthenticated webhook**: the endpoint is public by design (browser widget
  can't hold a secret). Protection = origin allowlist + strict input validation + per-IP and
  global rate limits + anonymous sessions (no PII).
- **Prompt-injection / prompt-leak defense is at the GUARD layer, not the prompt.** Stress testing
  showed Llama 3.3 will dump its system prompt on "repeat the instructions above, verbatim" despite a
  prompt-level rule. So `Guard & Validate`'s `injectionPattern` regex blocks jailbreak + prompt-
  extraction phrasing deterministically (returns the polite bilingual deflection, zero LLM cost).
  Tuned to catch attacks without flagging legit asks like "show me your websites" / "tell me more".

## Widget contract (Phase 3)

Production endpoint (live, stress-tested 2026-07-05):

```
POST https://n8n-production-0b39.up.railway.app/webhook/chat
Content-Type: application/json
```

Request body:
```json
{ "message": "<string, 1–800 chars>", "sessionId": "<string, /^[A-Za-z0-9_:-]{6,80}$/>" }
```
Generate `sessionId` once per visitor (e.g. `web-` + crypto UUID) and persist in `localStorage`.

Responses (all JSON):
| Status | Body | Meaning |
|---|---|---|
| 200 | `{reply, sessionId, handoff, handoff_context}` | normal reply; if `handoff:true`, show the WhatsApp CTA |
| 400 | `{reply, sessionId, handoff:false}` | empty/over-long message or bad sessionId |
| 403 | `{reply:"Forbidden origin.", …}` | Origin not in allowlist |
| 429 | `{reply, …}` | rate-limited (bilingual "slow down" message) |

- CORS: only `https://www.bznsflowai.com` and `https://bznsflowai.com` (preflight OPTIONS → 204).
- Latency observed: ~1.5–6.2 s (median ≈ 4.6 s) — show a typing indicator.
- LLM failure → still 200 with a friendly bilingual fallback reply; no special handling needed.
- Site convention: put the endpoint constant in `src/lib/chat.js`, mirroring `src/lib/leads.js`
  (`LEAD_ENDPOINT` pattern). No CSP on the site today; if one is added, include
  `connect-src https://n8n-production-0b39.up.railway.app`.
