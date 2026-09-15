import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');
  return children;
}
