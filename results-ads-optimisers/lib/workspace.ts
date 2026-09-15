import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getGoogleAdsPerformance, getGoogleAdsSearchTerms, getGoogleOAuthClient } from '@/lib/google-ads';

export type WorkspaceAccount = {
  id: string;
  organisation_id: string;
  customer_id: string;
  descriptive_name: string;
  currency_code: string | null;
  status: string;
  google_connection_id: string | null;
  manager_customer_id: string | null;
  optimisation_score: number | null;
  last_synced_at: string | null;
};

export async function getWorkspace() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  const { data: membership } = userId
    ? await supabase.from('organisation_members').select('organisation_id, role').eq('user_id', userId).limit(1).maybeSingle()
    : { data: null } as any;

  const organisationId = membership?.organisation_id as string | undefined;
  const { data: organisation } = organisationId
    ? await supabase.from('organisations').select('id,name,subscription_plan,trial_ends_at').eq('id', organisationId).maybeSingle()
    : { data: null } as any;

  const { data: accounts } = organisationId
    ? await supabase
        .from('ad_accounts')
        .select('id,organisation_id,customer_id,descriptive_name,currency_code,status,google_connection_id,manager_customer_id,optimisation_score,last_synced_at')
        .eq('organisation_id', organisationId)
        .eq('is_manager', false)
        .order('descriptive_name')
    : { data: [] } as any;

  return {
    supabase,
    userId,
    organisationId,
    organisation,
    role: membership?.role as string | undefined,
    accounts: (accounts ?? []) as WorkspaceAccount[],
  };
}

export async function getAccessToken(supabase: Awaited<ReturnType<typeof createClient>>, connectionId: string) {
  const { data: refreshToken, error } = await supabase.rpc('get_google_oauth_refresh_token', { p_connection_id: connectionId });
  if (error || !refreshToken) throw new Error('Could not read Google Ads credentials.');
  const oauth = getGoogleOAuthClient();
  oauth.setCredentials({ refresh_token: refreshToken });
  const access = await oauth.getAccessToken();
  const token = typeof access === 'string' ? access : access?.token;
  if (!token) throw new Error('Could not refresh Google Ads access.');
  return token;
}

export async function loadAccountPerformance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  account: WorkspaceAccount,
  days = 60,
) {
  if (!account.google_connection_id) throw new Error('Google Ads is not connected.');
  const token = await getAccessToken(supabase, account.google_connection_id);
  return getGoogleAdsPerformance(token, account.customer_id, account.manager_customer_id, days);
}

export async function loadAccountSearchTerms(
  supabase: Awaited<ReturnType<typeof createClient>>,
  account: WorkspaceAccount,
  days = 90,
) {
  if (!account.google_connection_id) throw new Error('Google Ads is not connected.');
  const token = await getAccessToken(supabase, account.google_connection_id);
  return getGoogleAdsSearchTerms(token, account.customer_id, account.manager_customer_id, days);
}

export const metricNumber = (value: string | number | undefined | null) => Number(value ?? 0) || 0;

export function money(value: number, currency = 'AUD', decimals = 0) {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `$${value.toFixed(decimals)}`;
  }
}

export function compactNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-AU', { maximumFractionDigits: decimals }).format(value);
}

export function percentChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

