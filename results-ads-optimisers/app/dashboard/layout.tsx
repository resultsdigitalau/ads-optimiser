import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: memberships } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .limit(1);

  if (!memberships?.length) redirect('/onboarding');

  return children;
}
