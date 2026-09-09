-- ============================================================================
-- 003 — Accounts, email OTP, and sessions
--
-- Adds the first real identity layer to the site. Until now the only rows here
-- were anonymous chat sessions keyed by a browser-generated `web:<uuid>`; this
-- migration introduces a person with a verified email address, and the session
-- behind the `bf_session` cookie that api/_lib/cookies.js was written for in
-- c9e904b ("add the strictly-necessary cookie layer, ahead of accounts").
--
-- HOW TO APPLY:  Supabase Dashboard -> SQL Editor -> paste -> Run.
--   Project: svmrfzahbgmvesclbqke (bznsflow-web-chat, ap-southeast-1)
--   Or via psql through the POOLER host aws-1-ap-southeast-1.pooler.supabase.com
--   (aws-0 resolves but rejects the tenant — see web-chatbot/SETUP.md).
--
-- SAFETY: additive and idempotent. Creates three tables, six functions and four
-- indexes; alters nothing that exists and drops no data. Safe to re-run.
--
-- Verification queries are at the bottom of this file.
--
-- ONE THING TO KNOW: this puts customer PII (name, email, phone) in the same
-- free-tier project as the anonymous chat logs. The free tier takes NO BACKUPS.
-- api/keepalive.js stops the project pausing, but nothing here protects against
-- loss. Move to Pro before this table matters.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The account
--
-- Profile columns are deliberately NULLABLE. A row is created the instant an
-- email is proven — before we know the person's name — and is completed one
-- step later by auth_complete_profile. That ordering is what keeps unverified
-- profile data out of the database entirely: there is no staging table and no
-- pending_profile blob, because nothing is stored until the code is right.
--
-- `email` carries the unique constraint that makes find-or-create a single
-- statement in auth_verify_code. It is stored already lowercased and trimmed;
-- every function here re-normalises defensively rather than trusting the caller.
-- ----------------------------------------------------------------------------
create table if not exists public.web_accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  phone         text,                             -- E.164, e.g. +971501234567
  country       text,                             -- ISO-3166 alpha-2
  industry      text,                             -- slug from src/lib/industries.js
  lang          text,
  verified_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  -- False until the CRM sheet row is confirmed written. The sheet push is
  -- allowed to fail without failing the sign-in, so this is the retry marker.
  sheet_synced  boolean not null default false
);


-- ----------------------------------------------------------------------------
-- 2. Pending one-time codes
--
-- Only the HASH is stored, never the code — a database dump must not hand over
-- live login codes. The hash is salted with the email and peppered with
-- AUTH_OTP_PEPPER (held in the environment, not here), so a dump alone cannot
-- brute-force the 10^6 space offline.
--
-- `attempts` is what makes a 6-digit code safe: five wrong guesses kill the row.
-- ----------------------------------------------------------------------------
create table if not exists public.web_auth_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  attempts    integer not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Serves both the "newest live code for this email" lookup and the per-email
-- throttle count, which are the only two ways this table is ever read.
create index if not exists web_auth_codes_email_idx
  on public.web_auth_codes (email, created_at desc);


-- ----------------------------------------------------------------------------
-- 3. Sessions
--
-- The cookie holds a 32-byte random token; this table holds only its SHA-256.
-- Same reasoning as the codes: read access to this table must not be enough to
-- impersonate anyone.
-- ----------------------------------------------------------------------------
create table if not exists public.web_sessions (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,
  account_id   uuid not null references public.web_accounts(id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null
);

create index if not exists web_sessions_account_idx
  on public.web_sessions (account_id);
create index if not exists web_sessions_expires_idx
  on public.web_sessions (expires_at);


-- ----------------------------------------------------------------------------
-- 4. Request a code
--
-- Throttling lives here rather than in the function app because it has to be
-- atomic with the insert: two concurrent requests must not both pass a check
-- and then both write. Two limits, and they do different jobs —
--   * 60 seconds between sends stops the resend button being a mail cannon;
--   * 5 per hour bounds how much of the Gmail quota one address can burn.
--
-- Issuing a new code invalidates every older one for that address, so a mailbox
-- holding three codes still only has one that works: the newest.
-- ----------------------------------------------------------------------------
create or replace function public.auth_request_code(
  p_email        text,
  p_code_hash    text,
  p_ttl_minutes  integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email    text := lower(btrim(p_email));
  v_last     timestamptz;
  v_recent   integer;
begin
  if v_email = '' or p_code_hash is null or p_code_hash = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select max(created_at) into v_last
    from public.web_auth_codes
   where email = v_email;

  if v_last is not null and v_last > now() - interval '60 seconds' then
    return jsonb_build_object('ok', false, 'reason', 'too_soon');
  end if;

  select count(*) into v_recent
    from public.web_auth_codes
   where email = v_email
     and created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;

  -- Only the newest code may ever be valid.
  update public.web_auth_codes
     set consumed_at = now()
   where email = v_email
     and consumed_at is null;

  insert into public.web_auth_codes (email, code_hash, expires_at)
       values (v_email, p_code_hash, now() + make_interval(mins => greatest(p_ttl_minutes, 1)));

  -- Opportunistic prune, bounded so no single request pays a large delete.
  -- Mirrors web_check_rate; keeps the table from growing without pg_cron.
  if random() < 0.01 then
    delete from public.web_auth_codes
     where id in (
       select id from public.web_auth_codes
        where created_at < now() - interval '1 day'
        limit 500
     );
    delete from public.web_sessions
     where id in (
       select id from public.web_sessions
        where expires_at < now() - interval '7 days'
        limit 500
     );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;


-- ----------------------------------------------------------------------------
-- 5. Verify a code, then find-or-create the account and open a session
--
-- One transaction on purpose. A half-finished sign-in — a consumed code with no
-- session, or a session pointing at no account — is not a state this system
-- should be able to reach, and splitting these steps across HTTP calls is how
-- it would.
--
-- The row is locked FOR UPDATE so two concurrent submissions of the same code
-- cannot both see attempts = 0 and both succeed.
--
-- `needs_profile` is what the page branches on: true sends a new visitor to the
-- profile step, false takes a returning one straight to the confirmation.
-- ----------------------------------------------------------------------------
create or replace function public.auth_verify_code(
  p_email         text,
  p_code_hash     text,
  p_session_hash  text,
  p_session_days  integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email   text := lower(btrim(p_email));
  v_code    public.web_auth_codes%rowtype;
  v_account public.web_accounts%rowtype;
begin
  if v_email = '' or p_code_hash is null or p_session_hash is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into v_code
    from public.web_auth_codes
   where email = v_email
     and consumed_at is null
     and expires_at > now()
   order by created_at desc
   limit 1
     for update;

  if not found then
    -- Covers never-requested, already-used and expired alike. The caller must
    -- not distinguish them to the visitor beyond "request a new code".
    return jsonb_build_object('ok', false, 'reason', 'no_code');
  end if;

  if v_code.attempts >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

  -- Count the attempt before judging it, so a crash mid-check cannot give a
  -- free guess.
  update public.web_auth_codes
     set attempts = attempts + 1
   where id = v_code.id;

  if v_code.code_hash is distinct from p_code_hash then
    return jsonb_build_object(
      'ok', false,
      'reason', 'bad_code',
      'attempts_left', 5 - (v_code.attempts + 1)
    );
  end if;

  update public.web_auth_codes
     set consumed_at = now()
   where id = v_code.id;

  insert into public.web_accounts (email, verified_at, last_login_at)
       values (v_email, now(), now())
  on conflict (email) do update
     set last_login_at = now()
   returning * into v_account;

  insert into public.web_sessions (token_hash, account_id, expires_at)
       values (p_session_hash, v_account.id,
               now() + make_interval(days => greatest(p_session_days, 1)))
  on conflict (token_hash) do update
     set last_seen_at = now();

  return jsonb_build_object(
    'ok', true,
    'needs_profile', v_account.name is null,
    'account', public.auth_account_json(v_account)
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- 6. Shared account projection
--
-- One place that decides which columns leave the database, so a column added
-- later is not exposed to the browser by accident.
-- ----------------------------------------------------------------------------
create or replace function public.auth_account_json(a public.web_accounts)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id',           a.id,
    'email',        a.email,
    'name',         a.name,
    'phone',        a.phone,
    'country',      a.country,
    'industry',     a.industry,
    'lang',         a.lang,
    'sheet_synced', a.sheet_synced
  );
$$;


-- ----------------------------------------------------------------------------
-- 7. Complete the profile
--
-- Authorised by the session hash, not by an account id from the client: the
-- browser never names which account it is editing, so there is nothing to tamper
-- with. Only ever fills a profile for the session actually presented.
-- ----------------------------------------------------------------------------
create or replace function public.auth_complete_profile(
  p_session_hash text,
  p_name         text,
  p_phone        text,
  p_country      text,
  p_industry     text,
  p_lang         text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_id uuid;
  v_account    public.web_accounts%rowtype;
begin
  select s.account_id into v_account_id
    from public.web_sessions s
   where s.token_hash = p_session_hash
     and s.expires_at > now();

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_session');
  end if;

  update public.web_accounts
     set name     = btrim(p_name),
         phone    = btrim(p_phone),
         country  = btrim(p_country),
         industry = btrim(p_industry),
         lang     = p_lang
   where id = v_account_id
   returning * into v_account;

  return jsonb_build_object('ok', true, 'account', public.auth_account_json(v_account));
end;
$$;


-- ----------------------------------------------------------------------------
-- 8. Resolve a session, and end one
-- ----------------------------------------------------------------------------
create or replace function public.auth_session(p_session_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account public.web_accounts%rowtype;
begin
  if p_session_hash is null or p_session_hash = '' then
    return jsonb_build_object('ok', false);
  end if;

  select a.* into v_account
    from public.web_sessions s
    join public.web_accounts a on a.id = s.account_id
   where s.token_hash = p_session_hash
     and s.expires_at > now();

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  update public.web_sessions
     set last_seen_at = now()
   where token_hash = p_session_hash;

  return jsonb_build_object(
    'ok', true,
    'needs_profile', v_account.name is null,
    'account', public.auth_account_json(v_account)
  );
end;
$$;

create or replace function public.auth_sign_out(p_session_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.web_sessions where token_hash = p_session_hash;
  return jsonb_build_object('ok', true);
end;
$$;


-- ----------------------------------------------------------------------------
-- 9. Mark the CRM row written
--
-- The sheet push is allowed to fail without failing a sign-in the visitor
-- completed correctly, so this flag is how a failed push stays findable.
-- ----------------------------------------------------------------------------
create or replace function public.auth_mark_synced(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.web_accounts set sheet_synced = true where id = p_account_id;
  return jsonb_build_object('ok', true);
end;
$$;


-- ----------------------------------------------------------------------------
-- 10. Lock it all down
--
-- The 2026-08-08 incident is the reason this section is not optional: RLS on the
-- TABLES was already correct, but Postgres grants EXECUTE on new functions to
-- PUBLIC by default, and the anon key really could call web_bump_rate in
-- production. Every function above is SECURITY DEFINER, so the same mistake here
-- would hand the anon key the ability to mint sessions.
-- ----------------------------------------------------------------------------
alter table public.web_accounts   enable row level security;
alter table public.web_auth_codes enable row level security;
alter table public.web_sessions   enable row level security;
-- No policies on purpose → anon/authenticated are denied everything.
-- The service-role key bypasses RLS, which is the only way in.

revoke all on function public.auth_request_code(text, text, integer)                    from public, anon, authenticated;
revoke all on function public.auth_verify_code(text, text, text, integer)               from public, anon, authenticated;
revoke all on function public.auth_complete_profile(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.auth_session(text)                                        from public, anon, authenticated;
revoke all on function public.auth_sign_out(text)                                       from public, anon, authenticated;
revoke all on function public.auth_mark_synced(uuid)                                    from public, anon, authenticated;
revoke all on function public.auth_account_json(public.web_accounts)                    from public, anon, authenticated;

grant execute on function public.auth_request_code(text, text, integer)                    to service_role;
grant execute on function public.auth_verify_code(text, text, text, integer)               to service_role;
grant execute on function public.auth_complete_profile(text, text, text, text, text, text) to service_role;
grant execute on function public.auth_session(text)                                        to service_role;
grant execute on function public.auth_sign_out(text)                                       to service_role;
grant execute on function public.auth_mark_synced(uuid)                                    to service_role;
-- auth_account_json needs no explicit grant: it is an internal projection helper,
-- called only from the functions above, which run as their definer. It keeps
-- service_role EXECUTE anyway, from the schema-wide default grant Supabase
-- applies to that role — harmless, since service_role is the trusted caller.


-- ============================================================================
-- VERIFICATION — run these after applying.
--
-- 1. All three tables exist with RLS on and zero policies:
--
-- select c.relname, c.relrowsecurity, count(p.polname) as policies
--   from pg_class c
--   left join pg_policy p on p.polrelid = c.oid
--  where c.relname in ('web_accounts','web_auth_codes','web_sessions')
--  group by c.relname, c.relrowsecurity;
--   -> three rows, relrowsecurity = true, policies = 0
--
-- 2. No function is callable by anon (this is the 2026-08-08 regression check):
--
-- select p.proname,
--        has_function_privilege('anon',         p.oid, 'execute') as anon,
--        has_function_privilege('authenticated', p.oid, 'execute') as auth,
--        has_function_privilege('service_role',  p.oid, 'execute') as svc
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname like 'auth\_%';
--   -> anon and auth false everywhere; svc true except auth_account_json
--
-- 3. End-to-end smoke, using a hash that matches nothing real:
--
-- select public.auth_request_code('smoke@example.com', 'deadbeef', 10);
--   -> {"ok": true}
-- select public.auth_request_code('smoke@example.com', 'deadbeef', 10);
--   -> {"ok": false, "reason": "too_soon"}
-- select public.auth_verify_code('smoke@example.com', 'wrong', 'sess-hash', 30);
--   -> {"ok": false, "reason": "bad_code", "attempts_left": 4}
-- select public.auth_verify_code('smoke@example.com', 'deadbeef', 'sess-hash', 30);
--   -> {"ok": true, "needs_profile": true, "account": {...}}
-- select public.auth_session('sess-hash');
--   -> {"ok": true, ...}
--
-- 4. Clean up the smoke rows (cascades to the session):
--
-- delete from public.web_auth_codes where email = 'smoke@example.com';
-- delete from public.web_accounts   where email = 'smoke@example.com';
-- ============================================================================
