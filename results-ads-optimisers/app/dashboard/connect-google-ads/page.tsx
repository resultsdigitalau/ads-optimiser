import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getGoogleOAuthClient, listGoogleAdsAccountCandidates } from '@/lib/google-ads';
import { importGoogleAdsAccounts } from './actions';

export default async function ConnectGoogleAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ connection?: string; connected?: string; imported?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  const { data: membership } = userId
    ? await supabase
        .from('organisation_members')
        .select('organisation_id, role, organisations(name)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
    : { data: null } as any;

  const { data: connectedAccounts } = membership
    ? await supabase
        .from('ad_accounts')
        .select('id, customer_id, descriptive_name, status, is_manager, last_synced_at')
        .eq('organisation_id', membership.organisation_id)
        .order('descriptive_name')
    : { data: [] } as any;

  let candidates: Awaited<ReturnType<typeof listGoogleAdsAccountCandidates>> = [];
  let candidateError: string | null = null;

  if (params.connection) {
    try {
      const { data: connection } = await supabase
        .from('google_connections')
        .select('id, organisation_id, google_account_email')
        .eq('id', params.connection)
        .single();

      if (!connection || connection.organisation_id !== membership?.organisation_id) {
        throw new Error('This Google Ads connection is not available in your workspace.');
      }

      const { data: refreshToken, error: tokenError } = await supabase.rpc('get_google_oauth_refresh_token', {
        p_connection_id: params.connection,
      });
      if (tokenError || !refreshToken) throw new Error('Could not read the Google connection credentials.');

      const oauthClient = getGoogleOAuthClient();
      oauthClient.setCredentials({ refresh_token: refreshToken });
      const access = await oauthClient.getAccessToken();
      const accessToken = typeof access === 'string' ? access : access?.token;
      if (!accessToken) throw new Error('Could not refresh access to Google Ads.');

      candidates = await listGoogleAdsAccountCandidates(accessToken);
    } catch (error) {
      candidateError = error instanceof Error ? error.message : 'Could not load Google Ads accounts.';
    }
  }

  const canConnect = membership && ['owner', 'admin'].includes(membership.role);

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div className="blue-kicker">GOOGLE ADS CONNECTION</div>
          <h1 style={{ margin: '8px 0 8px' }}>Connect your agency Google Ads accounts</h1>
          <p style={{ maxWidth: 720, color: '#667085', lineHeight: 1.6 }}>
            Sign in with the Google account that has access to your MCC or client accounts. Pilot Ads will show the accounts it can access, then you choose exactly which ones to import into this workspace.
          </p>
        </div>
        <Link href="/dashboard" className="outline-button">Back to dashboard</Link>
      </div>

      {params.error ? <div className="auth-error" style={{ marginBottom: 20 }}>{params.error}</div> : null}
      {candidateError ? <div className="auth-error" style={{ marginBottom: 20 }}>{candidateError}</div> : null}
      {params.imported ? (
        <div style={{ padding: '14px 16px', background: '#ecfdf3', border: '1px solid #abefc6', borderRadius: 12, color: '#067647', marginBottom: 20 }}>
          Google Ads accounts imported successfully.
        </div>
      ) : null}

      <section className="dash-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>1. Connect Google</h2>
            <p style={{ margin: '6px 0 0', color: '#667085' }}>
              Uses Google OAuth. Your refresh token is stored in a private database schema and is not exposed to the browser.
            </p>
          </div>
          {canConnect ? (
            <a href="/api/google-ads/oauth/start" className="blue-button">Connect Google Ads →</a>
          ) : (
            <span style={{ color: '#667085' }}>Owner or admin access required</span>
          )}
        </div>
      </section>

      {params.connection ? (
        <section className="dash-card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ margin: 0 }}>2. Choose accounts to import</h2>
            <p style={{ margin: '6px 0 0', color: '#667085' }}>
              We found {candidates.length} account{candidates.length === 1 ? '' : 's'} available through this Google login.
            </p>
          </div>

          {candidates.length ? (
            <form action={importGoogleAdsAccounts}>
              <input type="hidden" name="connection_id" value={params.connection} />
              <div style={{ display: 'grid', gap: 10 }}>
                {candidates.map((account) => (
                  <label key={account.customerId} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, alignItems: 'center', padding: '14px 16px', border: '1px solid #e4e7ec', borderRadius: 12, cursor: 'pointer' }}>
                    <input type="checkbox" name="customer_id" value={account.customerId} defaultChecked={!account.isManager} />
                    <span>
                      <strong style={{ display: 'block' }}>{account.name}</strong>
                      <small style={{ color: '#667085' }}>
                        {account.customerId}{account.currencyCode ? ` · ${account.currencyCode}` : ''}{account.timeZone ? ` · ${account.timeZone}` : ''}
                      </small>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 8px', borderRadius: 999, background: account.isManager ? '#eef4ff' : '#f2f4f7', color: account.isManager ? '#3538cd' : '#475467' }}>
                      {account.isManager ? 'Manager' : 'Client'}
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                <button className="blue-button" type="submit">Import selected accounts →</button>
              </div>
            </form>
          ) : (
            <p style={{ color: '#667085' }}>No importable Google Ads accounts were returned for this login.</p>
          )}
        </section>
      ) : null}

      <section className="dash-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>Connected accounts</h2>
            <p style={{ margin: '6px 0 0', color: '#667085' }}>Accounts already attached to this Pilot Ads workspace.</p>
          </div>
          <strong>{connectedAccounts?.length ?? 0}</strong>
        </div>

        {connectedAccounts?.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {connectedAccounts.map((account: any) => (
              <div key={account.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '13px 0', borderTop: '1px solid #eaecf0' }}>
                <div>
                  <strong>{account.descriptive_name || `Google Ads ${account.customer_id}`}</strong>
                  <div style={{ color: '#667085', fontSize: 13, marginTop: 3 }}>{account.customer_id}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{account.is_manager ? 'Manager' : account.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '28px 0 8px', color: '#667085' }}>No Google Ads accounts connected yet.</div>
        )}
      </section>
    </div>
  );
}
