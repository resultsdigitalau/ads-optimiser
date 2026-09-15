import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signup } from './actions';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect('/dashboard');
  const params = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-logo"><img src="/pilot-ads-logo.png" alt="Pilot Ads" /></Link>
        <div className="auth-kicker">14-DAY FREE TRIAL</div>
        <h1>Create your agency workspace</h1>
        <p className="auth-subtitle">Start with your own secure workspace. You can connect Google Ads accounts after setup.</p>
        {params.error ? <div className="auth-error">{params.error}</div> : null}
        <form className="auth-form">
          <label>Your name<input name="full_name" required placeholder="Sarah Mitchell" autoComplete="name" /></label>
          <label>Work email<input name="email" type="email" required placeholder="you@agency.com" autoComplete="email" /></label>
          <label>Password<input name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" /></label>
          <button className="blue-button auth-submit" formAction={signup}>Create account <span>→</span></button>
        </form>
        <div className="auth-trust"><span>✓ Secure agency workspace</span><span>✓ No client data shared between agencies</span><span>✓ Cancel any time</span></div>
        <p className="auth-switch">Already have an account? <Link href="/login">Log in</Link></p>
      </section>
    </main>
  );
}
