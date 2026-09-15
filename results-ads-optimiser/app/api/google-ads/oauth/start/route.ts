import { NextResponse } from 'next/server';
import { getGoogleAdsAuthUrl } from '@/lib/google-ads';

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local first.' }, { status: 500 });
  }
  return NextResponse.redirect(getGoogleAdsAuthUrl());
}
