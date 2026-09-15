import { OAuth2Client } from 'google-auth-library';

export const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';
export const GOOGLE_EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';
export const GOOGLE_OPENID_SCOPE = 'openid';
export const GOOGLE_ADS_API_VERSION = 'v25';

export type GoogleAdsAccountCandidate = {
  customerId: string;
  name: string;
  currencyCode: string | null;
  timeZone: string | null;
  isManager: boolean;
  status: string;
  level: number;
  loginCustomerId: string;
};

export function getGoogleOAuthClient(redirectUri?: string) {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function getGoogleAdsAuthUrl(redirectUri: string, state: string) {
  return getGoogleOAuthClient(redirectUri).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    state,
    scope: [GOOGLE_OPENID_SCOPE, GOOGLE_EMAIL_SCOPE, GOOGLE_ADS_SCOPE],
  });
}

function apiHeaders(accessToken: string, loginCustomerId?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Developer tokens were sunset on 9 September 2026. The API currently
  // ignores an existing token, so retain support for migrated projects while
  // allowing new Cloud-project-based access to work without one.
  if (process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
    headers['developer-token'] = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  }
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId.replace(/-/g, '');
  return headers;
}

export async function listAccessibleCustomers(accessToken: string) {
  const res = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`,
    { headers: apiHeaders(accessToken), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Google Ads API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ resourceNames?: string[] }>;
}

export async function getGoogleAccountEmail(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { email?: string };
  return body.email ?? null;
}

async function queryCustomerClients(accessToken: string, loginCustomerId: string) {
  const customerId = loginCustomerId.replace(/-/g, '');
  const query = `
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.currency_code,
      customer_client.time_zone,
      customer_client.manager,
      customer_client.status,
      customer_client.level
    FROM customer_client
  `;

  const res = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: 'POST',
      headers: apiHeaders(accessToken, customerId),
      body: JSON.stringify({ query, pageSize: 10000 }),
      cache: 'no-store',
    }
  );

  if (!res.ok) throw new Error(`Google Ads hierarchy error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{
    results?: Array<{
      customerClient?: {
        id?: string;
        descriptiveName?: string;
        currencyCode?: string;
        timeZone?: string;
        manager?: boolean;
        status?: string;
        level?: string | number;
      };
    }>;
  }>;
}

export async function listGoogleAdsAccountCandidates(accessToken: string) {
  const accessible = await listAccessibleCustomers(accessToken);
  const directIds = (accessible.resourceNames ?? []).map((name) => name.split('/').pop()).filter(Boolean) as string[];
  const merged = new Map<string, GoogleAdsAccountCandidate>();

  for (const directId of directIds) {
    try {
      const hierarchy = await queryCustomerClients(accessToken, directId);
      for (const row of hierarchy.results ?? []) {
        const account = row.customerClient;
        if (!account?.id) continue;
        const id = String(account.id);
        const candidate: GoogleAdsAccountCandidate = {
          customerId: id,
          name: account.descriptiveName || `Google Ads ${id}`,
          currencyCode: account.currencyCode ?? null,
          timeZone: account.timeZone ?? null,
          isManager: Boolean(account.manager),
          status: account.status || 'UNKNOWN',
          level: Number(account.level ?? 0),
          loginCustomerId: directId,
        };

        const existing = merged.get(id);
        if (!existing || candidate.level < existing.level) merged.set(id, candidate);
      }
    } catch {
      // A directly accessible account can still be imported even if hierarchy
      // discovery is unavailable for that account.
      if (!merged.has(directId)) {
        merged.set(directId, {
          customerId: directId,
          name: `Google Ads ${directId}`,
          currencyCode: null,
          timeZone: null,
          isManager: false,
          status: 'UNKNOWN',
          level: 0,
          loginCustomerId: directId,
        });
      }
    }
  }

  return [...merged.values()].sort((a, b) => {
    if (a.isManager !== b.isManager) return a.isManager ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
