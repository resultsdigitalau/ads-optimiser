import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthClient, listAccessibleCustomers } from '@/lib/google-ads';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing OAuth code' }, { status: 400 });

  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) return NextResponse.json({ error:'No access token returned' }, { status:500 });

  // TODO: encrypt and persist tokens.refresh_token server-side in Supabase.
  const customers = await listAccessibleCustomers(tokens.access_token);
  return NextResponse.json({ connected: true, customers, note: 'MVP callback is working. Next step is persisting the refresh token and importing MCC child accounts.' });
}
