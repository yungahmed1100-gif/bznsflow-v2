# Green Convex backend

This schema serves the Green production website, authentication, Catalyst,
Ascend, website leads/chat, and dashboard state. Production must use a dedicated
Green deployment, separate from local development and the Blue test project.

## Local development

```sh
npx convex dev --once
```

Use the development deployment created by the Convex CLI. Do not point local
development at Green production, copy a production deploy key, or place any
Convex secret in a `VITE_*` variable.

## Production configuration

Green Vercel server environment:

- `GREEN_CONVEX_CLOUD_URL`: pinned Green production cloud URL
- `CONVEX_CLOUD_URL` and `CONVEX_SITE_URL`: matching production endpoints
- `CONVEX_SERVICE_SECRET`: same server-only 64-hex secret in Vercel and Convex
- `GREEN_MESSAGING_WORKER_SECRET`: separate 64-hex worker bearer secret
- `PUBLIC_SITE_ORIGIN=https://www.bznsflowai.com`

Run `npm run green:readiness` against the target environment before release.
Production routes reject an unpinned or mismatched Convex target. Never deploy
or switch production traffic until the release gates in
[`docs/green-production-migration.md`](../docs/green-production-migration.md)
pass.

## Data migration status

`migrate.ts` is an idempotent internal importer for account and business profile
rows only. It does not cover the whole Green migration: website leads/chat,
legacy Layla conversations and customer integrations, Hasib state, and access
grants still need an approved mapping and verified row counts. It must not be
used as the sole evidence for cutover. OTP challenges and sessions are excluded;
users sign in again after migration. Keep Supabase as the untouched rollback
archive.
