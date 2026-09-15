create extension if not exists pgcrypto;

-- Each paying agency is an isolated tenant/workspace.
create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists organisation_members (
  organisation_id uuid references organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')) default 'member',
  primary key (organisation_id, user_id)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null unique references organisations(id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text,
  plan text not null default 'trial',
  status text not null default 'trialing',
  account_limit int not null default 5,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- OAuth credentials belong to an agency workspace, never to the platform owner.
create table if not exists google_connections (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  connected_by uuid references auth.users(id) on delete set null,
  google_email text,
  refresh_token_ciphertext text not null,
  manager_customer_id text,
  connected_at timestamptz not null default now(),
  status text not null default 'active'
);

create table if not exists ad_accounts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  google_connection_id uuid references google_connections(id) on delete set null,
  customer_id text not null,
  manager_customer_id text,
  name text not null,
  currency_code text,
  timezone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organisation_id, customer_id)
);

create table if not exists account_targets (
  ad_account_id uuid primary key references ad_accounts(id) on delete cascade,
  monthly_budget numeric(14,2),
  target_cpa numeric(14,2),
  target_roas numeric(10,4),
  primary_conversion text,
  service_exclusions text[] default '{}',
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists daily_metrics (
  id bigint generated always as identity primary key,
  ad_account_id uuid not null references ad_accounts(id) on delete cascade,
  metric_date date not null,
  campaign_id text,
  campaign_name text,
  impressions bigint default 0,
  clicks bigint default 0,
  cost numeric(14,2) default 0,
  conversions numeric(14,4) default 0,
  conversion_value numeric(14,2) default 0,
  unique(ad_account_id, metric_date, campaign_id)
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  ad_account_id uuid not null references ad_accounts(id) on delete cascade,
  type text not null,
  severity text not null check (severity in ('high','medium','low')),
  title text not null,
  reason text not null,
  confidence int check (confidence between 0 and 100),
  estimated_monthly_impact numeric(14,2),
  payload jsonb not null default '{}',
  status text not null check (status in ('open','approved','applied','dismissed','failed')) default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists recommendation_actions (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references recommendations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  google_request_id text,
  created_at timestamptz not null default now()
);

alter table organisations enable row level security;
alter table organisation_members enable row level security;
alter table subscriptions enable row level security;
alter table google_connections enable row level security;
alter table ad_accounts enable row level security;
alter table account_targets enable row level security;
alter table daily_metrics enable row level security;
alter table recommendations enable row level security;
alter table recommendation_actions enable row level security;

-- Tenant helper. SECURITY DEFINER avoids recursive RLS checks against membership rows.
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organisation_members
    where organisation_id = org_id and user_id = auth.uid()
  );
$$;

create policy "members can read organisations" on organisations
for select using (public.is_org_member(id));

create policy "members can read memberships" on organisation_members
for select using (public.is_org_member(organisation_id));

create policy "members can read subscriptions" on subscriptions
for select using (public.is_org_member(organisation_id));

create policy "members can read google connections" on google_connections
for select using (public.is_org_member(organisation_id));

create policy "members can read ad accounts" on ad_accounts
for select using (public.is_org_member(organisation_id));

create policy "members can read account targets" on account_targets
for select using (
  exists (
    select 1 from ad_accounts a
    where a.id = account_targets.ad_account_id
      and public.is_org_member(a.organisation_id)
  )
);

create policy "members can read daily metrics" on daily_metrics
for select using (
  exists (
    select 1 from ad_accounts a
    where a.id = daily_metrics.ad_account_id
      and public.is_org_member(a.organisation_id)
  )
);

create policy "members can read recommendations" on recommendations
for select using (
  exists (
    select 1 from ad_accounts a
    where a.id = recommendations.ad_account_id
      and public.is_org_member(a.organisation_id)
  )
);

create policy "members can read recommendation actions" on recommendation_actions
for select using (
  exists (
    select 1
    from recommendations r
    join ad_accounts a on a.id = r.ad_account_id
    where r.id = recommendation_actions.recommendation_id
      and public.is_org_member(a.organisation_id)
  )
);

-- Server-side service-role code handles writes after checking workspace membership and role.
