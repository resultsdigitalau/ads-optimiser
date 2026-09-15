'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGoogleOAuthClient, listGoogleAdsAccountCandidates } from '@/lib/google-ads';

export async function importGoogleAdsAccounts(formData: FormData) {
  const connectionId = String(formData.get('connection_id') || '');
  const selectedIds = formData.getAll('customer_id').map(String);

  if (!connectionId || selectedIds.length === 0) {
    redirect(`/dashboard/connect-google-ads?connection=${encodeURIComponent(connectionId)}&error=Select+at+least+one+Google+Ads+account`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: connection } = await supabase
    .from('google_connections')
    .select('id, organisation_id, google_account_email')
    .eq('id', connectionId)
    .single();

  if (!connection) redirect('/dashboard/connect-google-ads?error=Google+Ads+connection+not+found');

  const { data: refreshToken, error: tokenError } = await supabase.rpc('get_google_oauth_refresh_token', {
    p_connection_id: connectionId,
  });
  if (tokenError || !refreshToken) {
    redirect(`/dashboard/connect-google-ads?connection=${connectionId}&error=Could+not+read+Google+Ads+credentials`);
  }

  try {
    const oauthClient = getGoogleOAuthClient();
    oauthClient.setCredentials({ refresh_token: refreshToken });
    const access = await oauthClient.getAccessToken();
    const accessToken = typeof access === 'string' ? access : access?.token;
    if (!accessToken) throw new Error('Could not refresh Google access.');

    const candidates = await listGoogleAdsAccountCandidates(accessToken);
    const allowed = new Map(candidates.map((account) => [account.customerId, account]));
    const rows = selectedIds
      .map((id) => allowed.get(id))
      .filter(Boolean)
      .map((account) => ({
        organisation_id: connection.organisation_id,
        google_connection_id: connectionId,
        customer_id: account!.customerId,
        descriptive_name: account!.name,
        currency_code: account!.currencyCode,
        time_zone: account!.timeZone,
        status: account!.status === 'UNKNOWN' ? 'enabled' : account!.status.toLowerCase(),
        is_manager: account!.isManager,
        last_synced_at: new Date().toISOString(),
      }));

    if (!rows.length) throw new Error('None of the selected accounts could be verified.');

    const { error: upsertError } = await supabase
      .from('ad_accounts')
      .upsert(rows, { onConflict: 'organisation_id,customer_id' });
    if (upsertError) throw upsertError;

    const manager = rows.find((row) => row.is_manager);
    if (manager) {
      await supabase
        .from('google_connections')
        .update({
          manager_customer_id: manager.customer_id,
          manager_account_name: manager.descriptive_name,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', connectionId);
    }

    await supabase.from('audit_logs').insert({
      organisation_id: connection.organisation_id,
      actor_user_id: userId,
      event_type: 'google_ads_accounts_imported',
      entity_type: 'google_connection',
      entity_id: connectionId,
      metadata: { customer_ids: rows.map((row) => row.customer_id), count: rows.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not import Google Ads accounts.';
    redirect(`/dashboard/connect-google-ads?connection=${connectionId}&error=${encodeURIComponent(message)}`);
  }

  redirect('/dashboard/connect-google-ads?imported=1');
}
