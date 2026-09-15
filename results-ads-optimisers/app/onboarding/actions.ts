'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
}

export async function createWorkspace(formData: FormData) {
  const agencyName = String(formData.get('agency_name') || '').trim();
  if (agencyName.length < 2) redirect('/onboarding?error=Enter%20your%20agency%20name');

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const baseSlug = toSlug(agencyName) || 'agency';
  const suffix = userId.slice(0, 6).toLowerCase();
  const slug = `${baseSlug}-${suffix}`;

  const { error } = await supabase.rpc('create_organisation', {
    org_name: agencyName,
    org_slug: slug,
  });

  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  redirect('/dashboard');
}
