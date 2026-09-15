create table if not exists public.account_settings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  ad_account_id uuid not null unique references public.ad_accounts(id) on delete cascade,
  performance_mode text not null default 'cpa' check (performance_mode in ('cpa','roas')),
  primary_outcome text not null default 'maintain' check (primary_outcome in ('reduce','maintain','scale')),
  aggressiveness text not null default 'balanced' check (aggressiveness in ('cautious','balanced','aggressive')),
  budget_variance numeric(6,2) not null default 10 check (budget_variance between 0 and 100),
  pause_over_budget boolean not null default false,
  target_market text,
  brand_terms text[] not null default '{}',
  competitors text[] not null default '{}',
  industry text,
  account_structure text,
  algorithm_settings jsonb not null default '{"lookback_days":60,"max_bid_increase":30,"max_bid_decrease":30,"pause_multiplier":1.5,"max_impression_share":80}'::jsonb,
  active_improvement_types text[] not null default array['negative_keyword','search_term_review','keyword_opportunity','budget','cpa_spike','device','location','search_partners'],
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_settings_organisation_id_idx on public.account_settings(organisation_id);
alter table public.account_settings enable row level security;

drop policy if exists "account_settings_select_member" on public.account_settings;
create policy "account_settings_select_member" on public.account_settings
for select to authenticated
using ((select public.is_org_member(organisation_id)));

drop policy if exists "account_settings_write_manager" on public.account_settings;
create policy "account_settings_write_manager" on public.account_settings
for all to authenticated
using ((select public.has_org_role(organisation_id, array['owner','admin','manager']::public.org_role[])))
with check ((select public.has_org_role(organisation_id, array['owner','admin','manager']::public.org_role[])));

grant select, insert, update, delete on table public.account_settings to authenticated;

-- RLS uses this helper, but anonymous API callers do not need to invoke it directly.
revoke execute on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
