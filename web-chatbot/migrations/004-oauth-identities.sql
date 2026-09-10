-- ============================================================================
-- 004 — Social sign-in identities (Google, Microsoft, LinkedIn)
--
-- Adds a second way to prove an email address. 003 established that an account
-- is a verified email plus a session; this migration says that a provider
-- vouching for that email counts as proof too, and records WHICH provider so
-- the same person coming back is recognised rather than duplicated.
--
-- Pairs with api/_lib/oidc.js, api/auth-oauth.js and api/auth-callback.js.
--
-- HOW TO APPLY:  Supabase Dashboard -> SQL Editor -> paste -> Run.
--   Project: svmrfzahbgmvesclbqke (bznsflow-web-chat, ap-southeast-1)
--
-- SAFETY: additive and idempotent. Creates one table, two indexes and one
-- function, and REPLACES two functions from 003 (see the needs_profile note
-- below). Drops no data. Safe to re-run.
--
-- Verification queries are at the bottom of this file.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The identity
--
-- One row per (provider, person). An account can have several: signing in with
-- Google today and Microsoft next month links both to one web_accounts row.
--
-- WHY (provider, subject) IS THE KEY, AND NOT THE EMAIL:
-- `subject` is the provider's own opaque, stable, long-lived id for that person. It
-- survives them changing their email address upstream, which the email obviously
-- does not. Matching primarily on email would also mean that anyone who can
-- present a token bearing an address owns the account behind it — which is
-- exactly the nOAuth vulnerability class. Email is a LINKING hint, used once,
-- and only when the provider verified it. See api/_lib/oidc.js.
--
-- `email` is stored for audit only: it records what the provider asserted at
-- link time. Nothing reads it to authenticate.
-- ----------------------------------------------------------------------------
create table if not exists public.web_identities (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.web_accounts(id) on delete cascade,
  provider      text not null,            -- 'google' | 'microsoft' | 'linkedin'
  subject       text not null,            -- the provider's `sub` claim
  email         text,                     -- as asserted at link time; audit only
  created_at    timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  unique (provider, subject)
);

create index if not exists web_identities_account_idx
  on public.web_identities (account_id);

-- Serves the "has this person linked this provider before" lookup, which is
-- the first thing auth_oauth_login asks on every single sign-in.
create index if not exists web_identities_provider_subject_idx
  on public.web_identities (provider, subject);


-- ----------------------------------------------------------------------------
-- 2. Sign in with a provider
--
-- One transaction, for the same reason auth_verify_code is one: a linked
-- identity with no session, or a session pointing at a half-created account, is
-- not a state this system should be able to reach.
--
-- RESOLUTION ORDER — the security-critical part of this file:
--
--   1. (provider, subject) already known  -> that account. Authoritative.
--   2. else, email verified AND an account has that email -> LINK to it.
--      This is what makes "signed up by email code in June, clicked Google in
--      September" resolve to one account instead of two.
--   3. else, email NOT verified -> refuse. Never create, never link.
--   4. else -> create the account and the identity together.
--
-- Step 3 is the whole defence. An unverified email arriving at step 2 would let
-- anyone who can mint a token claim any existing account by address alone.
-- ----------------------------------------------------------------------------
create or replace function public.auth_oauth_login(
  p_provider       text,
  p_subject        text,
  p_email          text,
  p_email_verified boolean,
  p_name           text,
  p_session_hash   text,
  p_session_days   integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_provider   text := lower(btrim(p_provider));
  v_subject    text := btrim(p_subject);
  v_email      text := lower(btrim(p_email));
  v_name       text := nullif(btrim(coalesce(p_name, '')), '');
  v_account_id uuid;
  v_account    public.web_accounts%rowtype;
begin
  if v_provider = '' or v_subject = '' or p_session_hash is null or p_session_hash = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  -- 1. Known identity.
  select i.account_id into v_account_id
    from public.web_identities i
   where i.provider = v_provider
     and i.subject  = v_subject;

  if found then
    update public.web_identities
       set last_login_at = now(),
           email         = coalesce(nullif(v_email, ''), email)
     where provider = v_provider and subject = v_subject;
  else
    -- Everything past here needs a verified address.
    if v_email = '' or coalesce(p_email_verified, false) is not true then
      return jsonb_build_object('ok', false, 'reason', 'email_unverified');
    end if;

    -- 2. Link to the existing account with this address, if there is one.
    select a.id into v_account_id
      from public.web_accounts a
     where a.email = v_email;

    -- 4. Otherwise create it.
    if not found then
      insert into public.web_accounts (email, verified_at, last_login_at, name)
           values (v_email, now(), now(), v_name)
      on conflict (email) do update
         set last_login_at = now()
       returning id into v_account_id;
    end if;

    insert into public.web_identities (account_id, provider, subject, email)
         values (v_account_id, v_provider, v_subject, v_email)
    on conflict (provider, subject) do update
       set last_login_at = now();
  end if;

  -- Fill in a name we did not have, but never overwrite one the person typed
  -- themselves on the profile step — theirs is the better data.
  update public.web_accounts
     set last_login_at = now(),
         name          = coalesce(name, v_name)
   where id = v_account_id
   returning * into v_account;

  insert into public.web_sessions (token_hash, account_id, expires_at)
       values (p_session_hash, v_account_id,
               now() + make_interval(days => greatest(p_session_days, 1)))
  on conflict (token_hash) do update
     set last_seen_at = now();

  return jsonb_build_object(
    'ok', true,
    'needs_profile', v_account.phone is null,
    'account', public.auth_account_json(v_account)
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- 3. Redefine "needs profile" as "we cannot build a CRM row yet"
--
-- 003 used `name is null`, which was exactly right when the emailed code was
-- the only way in: nothing was known about a new visitor, so a null name meant
-- a blank form.
--
-- A social sign-in breaks that. Google hands us a name, so `name is null` would
-- be FALSE for a brand-new person and the profile step would be skipped —
-- taking phone, country and industry with it. Those are the lead. The CRM push
-- in api/auth-session.js would then write a row with no way to contact anyone.
--
-- `phone is null` is the honest test, because the phone is the one field only
-- the profile form can supply. No existing row changes meaning: anyone who
-- finished the form has both, anyone who did not has neither.
--
-- Both functions are otherwise byte-identical to 003.
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
    return jsonb_build_object('ok', false, 'reason', 'no_code');
  end if;

  if v_code.attempts >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

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
    'needs_profile', v_account.phone is null,   -- was: name is null
    'account', public.auth_account_json(v_account)
  );
end;
$$;

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
    'needs_profile', v_account.phone is null,   -- was: name is null
    'account', public.auth_account_json(v_account)
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. Lock it all down
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and every
-- function here is SECURITY DEFINER. Skipping this block would hand the anon
-- key the ability to mint a session for any address it names. This is the
-- 2026-08-08 incident, and it is why 003 carries the same section.
-- ----------------------------------------------------------------------------
alter table public.web_identities enable row level security;
-- No policies on purpose → anon/authenticated are denied everything.
-- The service-role key bypasses RLS, which is the only way in.

revoke all on function public.auth_oauth_login(text, text, text, boolean, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.auth_oauth_login(text, text, text, boolean, text, text, integer)
  to service_role;

-- Re-assert for the two replaced functions: CREATE OR REPLACE keeps the old
-- grants, but a fresh database applying 004 without 003 would not have them.
revoke all on function public.auth_verify_code(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.auth_session(text)                          from public, anon, authenticated;
grant execute on function public.auth_verify_code(text, text, text, integer) to service_role;
grant execute on function public.auth_session(text)                          to service_role;


-- ============================================================================
-- VERIFICATION — run these after applying.
--
-- 1. The table exists with RLS on and zero policies:
--
-- select c.relname, c.relrowsecurity, count(p.polname) as policies
--   from pg_class c
--   left join pg_policy p on p.polrelid = c.oid
--  where c.relname = 'web_identities'
--  group by c.relname, c.relrowsecurity;
--   -> one row, relrowsecurity = true, policies = 0
--
-- 2. Nothing is callable by anon (the 2026-08-08 regression check):
--
-- select p.proname,
--        has_function_privilege('anon',          p.oid, 'execute') as anon,
--        has_function_privilege('authenticated', p.oid, 'execute') as auth,
--        has_function_privilege('service_role',  p.oid, 'execute') as svc
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname like 'auth\_%';
--   -> anon and auth false everywhere; svc true except auth_account_json
--
-- 3. An unverified email is refused outright:
--
-- select public.auth_oauth_login('google','sub-1','smoke@example.com',false,'S','h1',30);
--   -> {"ok": false, "reason": "email_unverified"}
--
-- 4. A verified one creates the account, and asks for the profile:
--
-- select public.auth_oauth_login('google','sub-1','smoke@example.com',true,'Smoke','h1',30);
--   -> {"ok": true, "needs_profile": true, "account": {... "name": "Smoke" ...}}
--
-- 5. THE LINKING TEST. The same address arriving by emailed code must land on
--    the SAME account, not a second one:
--
-- select public.auth_request_code('smoke@example.com','deadbeef',10);
-- select public.auth_verify_code('smoke@example.com','deadbeef','h2',30);
-- select count(*) from public.web_accounts where email = 'smoke@example.com';
--   -> 1
--
-- 6. And a second provider links rather than duplicating:
--
-- select public.auth_oauth_login('microsoft','sub-2','smoke@example.com',true,'Smoke','h3',30);
-- select count(*) from public.web_accounts   where email = 'smoke@example.com';  -- -> 1
-- select count(*) from public.web_identities;                                    -- -> 2
--
-- 7. Clean up (cascades to identities and sessions):
--
-- delete from public.web_auth_codes where email = 'smoke@example.com';
-- delete from public.web_accounts   where email = 'smoke@example.com';
-- ============================================================================
