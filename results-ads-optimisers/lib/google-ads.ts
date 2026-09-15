import { OAuth2Client } from 'google-auth-library';

export const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';

export function getGoogleOAuthClient() {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/google-ads/oauth/callback`;
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
}

export function getGoogleAdsAuthUrl() {
  return getGoogleOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GOOGLE_ADS_SCOPE]
  });
}

export async function listAccessibleCustomers(accessToken: string) {
  const headers: Record<string,string> = { Authorization: `Bearer ${accessToken}` };
  if (process.env.GOOGLE_ADS_DEVELOPER_TOKEN) headers['developer-token'] = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const res = await fetch('https://googleads.googleapis.com/v25/customers:listAccessibleCustomers', { headers, cache:'no-store' });
  if (!res.ok) throw new Error(`Google Ads API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ resourceNames?: string[] }>;
}
