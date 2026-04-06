# MWLCRM

## Environment setup

Use `.env.local` for local development secrets and keep `.env.example` as the template without real credentials. Prisma CLI is configured through `prisma.config.ts` to load `.env.local` directly.

### Local development

Use the Supabase session pooler on port `5432` for `DATABASE_URL` and add the Prisma pooler flags:

```env
DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@[YOUR_POOLER_HOST]:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@[YOUR_POOLER_HOST]:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_SUPABASE_ANON_KEY]"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### Vercel production

Use the transaction pooler on port `6543` for `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@[YOUR_POOLER_HOST]:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@[YOUR_POOLER_HOST]:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_SUPABASE_ANON_KEY]"
NEXT_PUBLIC_SITE_URL="https://[YOUR_DOMAIN]"
```

### Notes

- Local and Vercel should not use the same `DATABASE_URL` port.
- Local uses `5432`.
- Vercel uses `6543`.
- After changing environment variables, restart the local dev server or redeploy on Vercel.
- Local development should only require `.env.local`.

## Meta Campaign Sync

- Sync config is centralized at `src/config/campaignSync.ts`.
- Vercel Cron invokes `GET /api/internal/cron/meta-campaign-sync` every minute (`vercel.json`).
- Effective sync cadence is controlled by `campaignSyncConfig.cron.intervalMinutes` (default `30`).
- Add these env vars in Vercel/local when running the sync:
  - `META_ACCESS_TOKEN`
  - `META_AD_ACCOUNT_ID`
  - `META_APP_ID`
  - `META_APP_SECRET`
  - `META_BUSINESS_ID`
  - `CRON_SECRET` (recommended in production; required by route auth when set)
