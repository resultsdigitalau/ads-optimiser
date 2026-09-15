# Pilot Ads

Front-end SaaS prototype for an agency-first Google Ads optimisation platform.

## Vercel

- Framework Preset: Next.js
- Root Directory: `results-ads-optimiser` if this folder is uploaded inside the outer ZIP/repository structure
- Build Command: default
- Output Directory: default/blank
- Install Command: default

## Local preview

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Important launch note

The review cards on the marketing homepage are explicitly marked as demo/sample content. Replace them with verified customer reviews before public launch. Pricing is also a front-end concept until billing is connected.


## Supabase authentication setup

This build includes live Supabase signup, login, email confirmation, agency workspace onboarding, protected dashboard sessions and logout.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

In Supabase Authentication > URL Configuration, set the Site URL to your production domain and add your Vercel preview URL patterns as redirect URLs.
