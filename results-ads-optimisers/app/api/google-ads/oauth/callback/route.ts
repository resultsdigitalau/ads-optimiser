import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAccountEmail, getGoogleOAuthClient } from '@/lib/google-ads';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');
  const destination = new URL('/dashboard/connect-google-ads', req.url);

  if (oauthError) {
    destination.searchParams.set('error', oauthError === 'access_denied' ? 'Google Ads access was cancelled.' : `Google OAuth error: ${oauthError}`);
    return NextResponse.redirect(destination);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get('pilot_google_oauth_state')?.value;
  cookieStore.delete('pilot_google_oauth_state');

  if (!code || !state || !expectedState || state !== expectedState) {
    destination.searchParams.set('error', 'Google sign-in could not be verified. Please try again.');
    return NextResponse.redirect(destination);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return NextResponse.redirect(new URL('/login', req.url));

  const { data: membership } = await supabase
    .from('organisation_members')
    .select('organisation_id, role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    destination.searchParams.set('error', 'Only an agency owner or admin can connect Google Ads.');
    return NextResponse.redirect(destination);
  }

  try {
    const redirectUri = new URL('/api/google-ads/oauth/callback', req.url).toString();
    const client = getGoogleOAuthClient(redirectUri);
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) throw new Error('Google did not return an access token.');
    if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Reconnect and approve offline access.');

    const email = await getGoogleAccountEmail(tokens.access_token);

    const { data: connection, error: connectionError } = await supabase
      .from('google_connections')
      .insert({
        organisation_id: membership.organisation_id,
        connected_by: userId,
        google_account_email: email,
        status: 'connected',
        scopes: (tokens.scope || '').split(' ').filter(Boolean),
        last_synced_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (connectionError || !connection) throw connectionError || new Error('Could not create Google connection.');

    const { error: secretError } = await supabase.rpc('store_google_oauth_credentials', {
      p_connection_id: connection.id,
      p_refresh_token: tokens.refresh_token,
    });

    if (secretError) {
      await supabase.from('google_connections').delete().eq('id', connection.id);
      throw secretError;
    }

    destination.searchParams.set('connection', connection.id);
    destination.searchParams.set('connected', '1');
    return NextResponse.redirect(destination);
  } catch (error) {
    destination.searchParams.set('error', error instanceof Error ? error.message : 'Google Ads connection failed.');
    return NextResponse.redirect(destination);
  }
}
