# Ads Optimiser SaaS

MVP scaffold for a multi-tenant, Opteo-style Google Ads optimisation SaaS built for agencies.

## Product model

The platform owner does **not** connect or preload its own client accounts.

Each subscribing agency gets an isolated workspace:

1. Agency user signs up.
2. A workspace/organisation is created.
3. The agency chooses a subscription plan.
4. The agency connects its own Google account through OAuth.
5. The agency selects its own Google Ads manager account and client accounts.
6. Only that organisation can read or act on those client accounts.
7. Recommendations and Google Ads mutations are scoped to the agency workspace.

## Included in this build

- Generic SaaS dashboard with sample/demo accounts only
- Organisation/workspace tenant model
- Organisation membership and roles
- Subscription table ready for Stripe
- Per-organisation Google OAuth connections
- Per-organisation Google Ads accounts
- Account targets, metrics, recommendations and audit log
- Row Level Security foundations for tenant isolation
- Recommendation rules for low-intent search terms, high-cost zero-conversion terms and CPA spikes
- Google Ads OAuth start/callback routes
- Accessible customer discovery stub

## Critical security rules

- Never store a platform-wide Google Ads refresh token.
- Never use the platform owner's MCC as a shared gateway to customer data.
- Encrypt every agency OAuth refresh token at rest.
- Store every connected account with an `organisation_id`.
- Enforce tenant access in Supabase RLS and again in server-side application code.
- Never expose Google OAuth refresh tokens to the browser.
- Use the Supabase service role only in trusted server-side code.
- Log every Google Ads mutation with user, organisation, before state and after state.

## Google Ads onboarding

The platform uses one application-level Google OAuth client, but every agency separately grants access to its own Google Ads data.

Flow:

```text
Agency signs up
  -> creates workspace
  -> Connect Google Ads
  -> Google OAuth consent
  -> choose accessible manager/customer accounts
  -> save encrypted refresh token against organisation
  -> import selected accounts
```

`manager_customer_id` is stored per agency connection/account. It must not be configured globally as the platform owner's MCC.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## Next implementation steps

1. Add Supabase Auth sign-up/sign-in screens.
2. Create workspace onboarding after registration.
3. Add Stripe Checkout and plan/account limits.
4. Persist OAuth refresh tokens encrypted against the signed-in organisation.
5. Add manager-account and client-account selection UI.
6. Add GAQL sync for campaigns, search terms, conversions and budget pacing.
7. Run recommendation rules after each sync.
8. Add review/apply workflows for negative keywords and other supported changes.
9. Record before/after state for every mutation.
10. Add scheduled sync jobs, usage limits and agency billing.
