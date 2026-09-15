'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signup(formData: FormData) {
  const fullName = String(formData.get('full_name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!fullName || !email || password.length < 8) {
    redirect('/signup?error=Enter%20your%20name,%20email%20and%20a%20password%20of%20at%20least%208%20characters');
  }

  const headerStore = await headers();
  const origin = headerStore.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}
