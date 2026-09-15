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

export type GoogleAdsPerformanceRow = {
  customer?: {
    id?: string | number;
    descriptiveName?: string;
    currencyCode?: string;
    timeZone?: string;
  };
  campaign?: {
    id?: string | number;
    name?: string;
    status?: string;
  };
  metrics?: {
    impressions?: string | number;
    clicks?: string | number;
    costMicros?: string | number;
    conversions?: string | number;
    conversionsValue?: string | number;
  };
  segments?: {
    date?: string;
  };
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
      body: JSON.stringify({ query }),
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

export async function getGoogleAdsPerformance(
  accessToken: string,
  customerId: string,
  loginCustomerId?: string | null
) {
  const cleanCustomerId = customerId.replace(/-/g, '');
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 59);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const query = `
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone,
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      segments.date
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
  `;

  const results: GoogleAdsPerformanceRow[] = [];
  let pageToken: string | undefined;

  do {
    const res = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/googleAds:search`,
      {
        method: 'POST',
        headers: apiHeaders(accessToken, loginCustomerId || undefined),
        body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }),
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      throw new Error(`Google Ads performance error ${res.status}: ${await res.text()}`);
    }

    const body = (await res.json()) as {
      results?: GoogleAdsPerformanceRow[];
      nextPageToken?: string;
    };
    results.push(...(body.results ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);

  return results;
}
