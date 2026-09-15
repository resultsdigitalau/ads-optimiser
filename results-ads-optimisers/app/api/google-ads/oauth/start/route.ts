import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAdsAuthUrl } from '@/lib/google-ads';

export async function GET(req: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/dashboard/connect-google-ads?error=Google+OAuth+credentials+are+not+configured', req.url));
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: membership } = await supabase
    .from('organisation_members')
    .select('organisation_id, role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.redirect(new URL('/dashboard/connect-google-ads?error=Only+an+owner+or+admin+can+connect+Google+Ads', req.url));
  }

  const state = randomUUID();
  const redirectUri = new URL('/api/google-ads/oauth/callback', req.url).toString();
  const cookieStore = await cookies();
  cookieStore.set('pilot_google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(getGoogleAdsAuthUrl(redirectUri, state));
}
