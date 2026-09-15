create index if not exists account_settings_updated_by_idx
on public.account_settings(updated_by);

drop policy if exists "account_settings_write_manager" on public.account_settings;

create policy "account_settings_insert_manager" on public.account_settings
for insert to authenticated
with check ((select public.has_org_role(organisation_id, array['owner','admin','manager']::public.org_role[])));

create policy "account_settings_update_manager" on public.account_settings
for update to authenticated
using ((select public.has_org_role(organisation_id, array['owner','admin','manager']::public.org_role[])))
with check ((select public.has_org_role(organisation_id, array['owner','admin','manager']::public.org_role[])));

create policy "account_settings_delete_manager" on public.account_settings
for delete to authenticated
using ((select public.has_org_role(organisation_id, array['owner','admin','manager']::public.org_role[])));
