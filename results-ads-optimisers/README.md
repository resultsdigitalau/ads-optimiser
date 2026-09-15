# Pilot Ads

An agency-first Google Ads optimisation platform with live reporting, recommendations, alerts and account controls.

## Product areas

- Connected account dashboard and Google Ads OAuth
- Evidence-backed improvements with approval, timed dismissal and restore workflows
- Performance dashboard, 15-part scorecard, segment analysis and trend reporting
- Search term N-gram analysis and multi-account campaign management
- Budget, CPA, ROAS, safeguard and algorithm settings per account
- Connection and performance alerts
- Organisation audit log for settings and recommendation decisions

Approving an improvement records the decision and its evidence in Pilot Ads. It does not mutate the Google Ads account directly in this release.

## Vercel

- Framework Preset: Next.js
- Root Directory: `results-ads-optimisers`
- Build Command: default
- Output Directory: default/blank
- Install Command: default

## Local preview

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Launch note

The review cards on the marketing homepage are explicitly marked as demo/sample content. Replace them with verified customer reviews before public launch. Pricing is also a front-end concept until billing is connected.


## Supabase authentication setup

This build includes live Supabase signup, login, email confirmation, agency workspace onboarding, protected dashboard sessions and logout.

Database changes are tracked in `supabase/migrations` and include the per-account optimisation control plane with organisation-scoped row level security.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Google Ads access also requires:

- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_DEVELOPER_TOKEN`

In Supabase Authentication > URL Configuration, set the Site URL to your production domain and add your Vercel preview URL patterns as redirect URLs.
