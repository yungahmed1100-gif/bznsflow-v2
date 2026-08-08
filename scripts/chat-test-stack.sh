#!/usr/bin/env bash
# Local Postgres + PostgREST standing in for Supabase, so tests/e2e-chat.mjs can
# exercise api/chat.js against a real database instead of a mock.
#
#   ./scripts/chat-test-stack.sh up      start, apply schema + migrations
#   ./scripts/chat-test-stack.sh down    tear everything down
#
# Requires Docker. Nothing here touches the live Supabase project.
set -euo pipefail

NET=bznet
PG=bz-pg
REST=bz-rest
PG_PORT=55433
REST_PORT=3001
# Matches JWT_SECRET in tests/e2e-chat.mjs. Local only — not a real credential.
JWT_SECRET="local-test-secret-that-is-at-least-32-chars-long"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

down() {
  docker rm -f "$PG" "$REST" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  echo "chat test stack: down"
}

up() {
  down
  docker network create "$NET" >/dev/null

  docker run -d --name "$PG" --network "$NET" \
    -e POSTGRES_PASSWORD=test -e POSTGRES_DB=webchat \
    -p "${PG_PORT}:5432" postgres:15-alpine >/dev/null

  for _ in $(seq 1 60); do
    docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1 && break
    sleep 1
  done

  # Recreate the roles Supabase provides. service_role needs BYPASSRLS *and*
  # table grants: BYPASSRLS only skips policies, it does not grant access, and
  # Supabase issues both by default.
  docker exec -i "$PG" psql -U postgres -d webchat -v ON_ERROR_STOP=1 -q <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator noinherit login password 'test'; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;
SQL

  docker exec -i "$PG" psql -U postgres -d webchat -v ON_ERROR_STOP=1 -q \
    < "$ROOT/web-chatbot/schema-web-chat.sql"
  for m in "$ROOT"/web-chatbot/migrations/*.sql; do
    echo "  applying $(basename "$m")"
    # stdout hidden (migrations SELECT setval, which prints a result row);
    # stderr and ON_ERROR_STOP still surface any real failure.
    docker exec -i "$PG" psql -U postgres -d webchat -v ON_ERROR_STOP=1 -q < "$m" >/dev/null
  done

  docker exec -i "$PG" psql -U postgres -d webchat -q \
    -c "grant all on all tables in schema public to service_role;" \
    -c "grant all on all sequences in schema public to service_role;" >/dev/null

  docker run -d --name "$REST" --network "$NET" -p "${REST_PORT}:3000" \
    -e PGRST_DB_URI="postgres://authenticator:test@${PG}:5432/webchat" \
    -e PGRST_DB_SCHEMA=public \
    -e PGRST_DB_ANON_ROLE=anon \
    -e PGRST_JWT_SECRET="$JWT_SECRET" \
    postgrest/postgrest:v12.2.3 >/dev/null

  for _ in $(seq 1 60); do
    curl -sf -o /dev/null "http://localhost:${REST_PORT}/" && break
    sleep 1
  done

  echo "chat test stack: up  (postgres :${PG_PORT}, postgrest :${REST_PORT})"
  echo "  run: npm run test:e2e"
}

case "${1:-up}" in
  up) up ;;
  down) down ;;
  *) echo "usage: $0 [up|down]" >&2; exit 1 ;;
esac
