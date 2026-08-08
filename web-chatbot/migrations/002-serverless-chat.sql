-- ============================================================================
-- 002 — Serverless chat migration
--
-- Moves Layla's chat backend from the (now deleted) n8n workflow on Railway to
-- a Vercel serverless function at /api/chat, and fixes the bugs the workflow
-- shipped with rather than porting them.
--
-- HOW TO APPLY:  Supabase Dashboard -> SQL Editor -> paste -> Run.
--   Project: svmrfzahbgmvesclbqke (bznsflow-web-chat, ap-southeast-1)
--
-- SAFETY: additive and idempotent. Creates one column, three functions, two
-- indexes; backfills existing rows; tightens grants. Drops no data and alters
-- no existing column type. Safe to re-run. `schema-web-chat.sql` is left as the
-- record of the original deploy — do not edit it.
--
-- Verification queries are at the bottom of this file.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Deterministic message ordering                                    [bug 1]
--
-- The n8n flow ordered history by created_at, then reversed it in JS on the
-- assumption the SQL had returned newest-first. It had not. The model was
-- therefore reading every conversation BACKWARDS, which is the actual cause of
-- Layla re-asking answered questions and looping back to discovery after an
-- affirmation — the behaviour previously patched at the prompt layer in 5036d6a.
--
-- created_at is also tie-prone: two messages inserted in the same turn can share
-- a timestamp, leaving their order undefined. A bigserial cannot tie.
-- ----------------------------------------------------------------------------
alter table public.web_messages
  add column if not exists seq bigserial;

-- Existing 34 rows get seq values in the order bigserial happened to assign on
-- backfill, which is physical row order, not chronological. Restate them from
-- created_at so history predating this migration reads correctly too.
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.web_messages
)
update public.web_messages m
set seq = o.rn
from ordered o
where m.id = o.id
  and m.seq is distinct from o.rn;

-- Keep the sequence ahead of the backfilled values so new inserts don't collide.
select setval(
  pg_get_serial_sequence('public.web_messages', 'seq'),
  greatest((select coalesce(max(seq), 0) from public.web_messages), 1)
);

create index if not exists web_messages_conv_seq_idx
  on public.web_messages (conversation_id, seq desc);


-- ----------------------------------------------------------------------------
-- 2. Rate limiting: one round trip, self-pruning                  [bugs 3, 4, 10]
--
-- Replaces web_bump_rate. Differences that matter:
--   * bumps the per-IP and global buckets together, so the function spends one
--     round trip on metering instead of two;
--   * prunes opportunistically (~1% of calls, capped at 500 rows) so the table
--     stops growing forever without needing pg_cron or a Vercel cron job;
--   * returns both counts so the caller decides, keeping policy in one place.
--
-- web_bump_rate is NOT dropped — dropping it would break the old workflow if it
-- is ever restored for reference. It is revoked in section 5 instead.
-- ----------------------------------------------------------------------------
create index if not exists web_rate_limits_window_idx
  on public.web_rate_limits (window_start);

create or replace function public.web_check_rate(
  p_ip_bucket     text,
  p_global_bucket text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ip     integer;
  v_global integer;
begin
  insert into public.web_rate_limits as r (bucket_key, hits, window_start)
       values (p_ip_bucket, 1, now())
  on conflict (bucket_key) do update set hits = r.hits + 1
    returning r.hits into v_ip;

  insert into public.web_rate_limits as r (bucket_key, hits, window_start)
       values (p_global_bucket, 1, now())
  on conflict (bucket_key) do update set hits = r.hits + 1
    returning r.hits into v_global;

  -- Opportunistic prune. Bounded so no single request pays a large delete.
  -- 2 days is well past the longest bucket (a 1-day global window).
  if random() < 0.01 then
    delete from public.web_rate_limits
     where bucket_key in (
       select bucket_key from public.web_rate_limits
        where window_start < now() - interval '2 days'
        limit 500
     );
  end if;

  return jsonb_build_object('ip_hits', v_ip, 'global_hits', v_global);
end;
$$;


-- ----------------------------------------------------------------------------
-- 3. Start a turn: history BEFORE insert                          [bugs 1, 2, 7]
--
-- Reads history first, then writes the user message. That ordering is what makes
-- the current-turn de-duplication the old flow attempted unnecessary: the row
-- cannot appear in its own history, so there is nothing to filter out.
--
-- Returns history oldest -> newest, which is the order the prompt renders and
-- the order the model should read. No reversal anywhere in the stack.
--
-- Also populates lang and message_count, which the old flow declared and never
-- wrote.
-- ----------------------------------------------------------------------------
create or replace function public.web_start_turn(
  p_session_key text,
  p_message     text,
  p_lang        text,
  p_history_len integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conv_id uuid;
  v_history jsonb;
begin
  insert into public.web_conversations (session_key, lang, message_count, last_seen_at)
       values (p_session_key, p_lang, 0, now())
  on conflict (session_key) do update
     set last_seen_at = now(),
         -- Keep the first detected language unless it was never set; a visitor
         -- switching languages mid-chat is handled by the prompt, not the row.
         lang = coalesce(public.web_conversations.lang, excluded.lang)
    returning id into v_conv_id;

  -- Newest N by seq, then flipped to chronological for the prompt.
  select coalesce(jsonb_agg(t order by t.seq), '[]'::jsonb)
    into v_history
    from (
      select seq, role, content
        from public.web_messages
       where conversation_id = v_conv_id
       order by seq desc
       limit greatest(p_history_len, 0)
    ) t;

  insert into public.web_messages (conversation_id, role, content)
       values (v_conv_id, 'user', p_message);

  update public.web_conversations
     set message_count = message_count + 1
   where id = v_conv_id;

  return jsonb_build_object('conversation_id', v_conv_id, 'history', v_history);
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. Finish a turn: monotonic handoff                                   [bug 5]
--
-- handoff was assigned each turn, so a visitor who converted and then asked one
-- more question silently reverted to handoff = false. OR-ing it makes conversion
-- a latch: once true, always true.
-- ----------------------------------------------------------------------------
create or replace function public.web_finish_turn(
  p_conversation_id uuid,
  p_reply           text,
  p_handoff         boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.web_messages (conversation_id, role, content)
       values (p_conversation_id, 'assistant', p_reply);

  update public.web_conversations
     set message_count = message_count + 1,
         handoff       = handoff or coalesce(p_handoff, false),
         last_seen_at  = now()
   where id = p_conversation_id;

  return jsonb_build_object('ok', true);
end;
$$;


-- ----------------------------------------------------------------------------
-- 5. Lock the functions down                                           [bug 10]
--
-- The tables were always safe: RLS is on with no policies, so anon reaches
-- nothing. The FUNCTIONS were not. Postgres grants EXECUTE to PUBLIC by default,
-- and a SECURITY DEFINER function runs as its owner — which bypasses RLS.
--
-- Confirmed live on 2026-08-08, not theoretical: calling
--   POST /rest/v1/rpc/web_bump_rate  with the ANON key
-- returned HTTP 200 and incremented a counter. Anyone holding the anon key
-- (which is designed to be publishable) could burn the global daily budget and
-- lock every real visitor out of the chat.
-- ----------------------------------------------------------------------------
revoke all on function public.web_bump_rate(text)                        from public, anon, authenticated;
revoke all on function public.web_check_rate(text, text)                 from public, anon, authenticated;
revoke all on function public.web_start_turn(text, text, text, integer)  from public, anon, authenticated;
revoke all on function public.web_finish_turn(uuid, text, boolean)       from public, anon, authenticated;

grant execute on function public.web_check_rate(text, text)                to service_role;
grant execute on function public.web_start_turn(text, text, text, integer) to service_role;
grant execute on function public.web_finish_turn(uuid, text, boolean)      to service_role;
-- web_bump_rate is deliberately granted to nobody: superseded by web_check_rate.


-- ----------------------------------------------------------------------------
-- 6. Backfill the columns the old flow never wrote                      [bug 7]
-- ----------------------------------------------------------------------------
update public.web_conversations c
   set message_count = m.n
  from (
    select conversation_id, count(*) as n
      from public.web_messages
     group by conversation_id
  ) m
 where m.conversation_id = c.id
   and c.message_count is distinct from m.n;

-- Detect language from the visitor's own messages only; Layla mirrors the
-- visitor, so assistant rows would just echo whatever she already chose.
update public.web_conversations c
   set lang = case when exists (
         select 1 from public.web_messages m
          where m.conversation_id = c.id
            and m.role = 'user'
            and m.content ~ '[؀-ۿ]'
       ) then 'ar' else 'en' end
 where c.lang is null;


-- ============================================================================
-- VERIFICATION — read-only, safe to run repeatedly.
-- ============================================================================

-- A. seq never CONTRADICTS created_at. Expect zero rows.
--
--    Phrased as a pairwise check rather than comparing rank()s, because ties are
--    legitimate: two messages in the same turn routinely share created_at, and a
--    rank()-vs-rank() comparison reports those as a mismatch even when seq is
--    perfectly correct. A contradiction is the real defect: an earlier seq
--    carrying a strictly later timestamp.
-- select a.conversation_id, a.seq as earlier_seq, b.seq as later_seq
--   from public.web_messages a
--   join public.web_messages b
--     on b.conversation_id = a.conversation_id
--    and b.seq > a.seq
--  where b.created_at < a.created_at;

-- B. Backfill landed. Expect message_count to equal the real row count, and
--    lang to be non-null everywhere.
-- select c.id, c.lang, c.message_count,
--        (select count(*) from public.web_messages m where m.conversation_id = c.id) as actual
--   from public.web_conversations c
--  order by c.created_at;

-- C. Grants are correct. Expect exactly one row per function, service_role only,
--    and NOTHING for anon/authenticated/public.
-- select p.proname, r.rolname
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   cross join lateral (values ('anon'),('authenticated'),('service_role'),('public')) as v(rolname)
--   join pg_roles r on r.rolname = v.rolname
--  where n.nspname = 'public'
--    and p.proname in ('web_bump_rate','web_check_rate','web_start_turn','web_finish_turn')
--    and has_function_privilege(r.rolname, p.oid, 'EXECUTE')
--  order by p.proname, r.rolname;

-- D. Round-trip the whole turn cycle on a throwaway session, then clean up.
--    Run as one block.
-- select public.web_check_rate('ip:verify:test', 'global:verify:test');
-- select public.web_start_turn('web:verify-migration-001', 'I own a cafe in Muscat', 'en');
-- -- expect history = []  (first turn)
-- select public.web_start_turn('web:verify-migration-001', 'what do you recommend?', 'en');
-- -- expect history = the cafe message ONLY, and NOT the message just sent
-- delete from public.web_conversations where session_key = 'web:verify-migration-001';
-- delete from public.web_rate_limits   where bucket_key like '%verify:test';
