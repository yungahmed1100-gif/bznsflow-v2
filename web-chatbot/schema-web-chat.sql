-- ============================================================
-- BznsFlow Web Chat — isolated Supabase schema
-- Run this ONCE on the NEW/SEPARATE Supabase project (not the live
-- WhatsApp/real-estate DB). Stores anonymous web:{sessionId} chats only.
-- No PII, no phone numbers — a real lead is created only after the
-- WhatsApp handoff, in the existing WhatsApp pipeline.
-- ============================================================

-- One row per browser chat session (identity = web:{sessionId}).
create table if not exists public.web_conversations (
  id              uuid primary key default gen_random_uuid(),
  session_key     text not null unique,          -- 'web:<uuid>' generated client-side
  lang            text,                           -- 'ar' | 'en' | null (detected)
  handoff         boolean not null default false, -- flipped true when visitor takes WhatsApp handoff
  message_count   integer not null default 0,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);

-- One row per message in a session.
create table if not exists public.web_messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.web_conversations(id) on delete cascade,
  role              text not null check (role in ('user', 'assistant')),
  content           text not null,
  created_at        timestamptz not null default now()
);

create index if not exists web_messages_conv_idx
  on public.web_messages (conversation_id, created_at);

create index if not exists web_conversations_session_idx
  on public.web_conversations (session_key);

-- ------------------------------------------------------------
-- Rate limiting: per-IP + global daily counters (bounds token spend).
-- The n8n workflow increments these before calling Claude.
-- ------------------------------------------------------------
create table if not exists public.web_rate_limits (
  bucket_key   text primary key,                 -- 'ip:<ip>:<yyyy-mm-dd-hh:mm>' or 'global:<yyyy-mm-dd>'
  hits         integer not null default 0,
  window_start timestamptz not null default now()
);

-- Atomic increment + read (returns the new count). Used by the workflow's
-- rate-limit code node. SECURITY DEFINER so the service role can call it.
create or replace function public.web_bump_rate(p_bucket text)
returns integer
language plpgsql
security definer
as $$
declare
  v_hits integer;
begin
  insert into public.web_rate_limits (bucket_key, hits, window_start)
    values (p_bucket, 1, now())
  on conflict (bucket_key)
    do update set hits = public.web_rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits;
end;
$$;

-- ------------------------------------------------------------
-- RLS: lock the tables. Only the service-role key (used by n8n) may
-- read/write. The anon key gets nothing — the browser never touches
-- Supabase directly (it only talks to the n8n webhook).
-- ------------------------------------------------------------
alter table public.web_conversations enable row level security;
alter table public.web_messages      enable row level security;
alter table public.web_rate_limits   enable row level security;
-- No policies added on purpose → anon/public role is denied all access.
-- The n8n service-role key bypasses RLS, which is what we want.
