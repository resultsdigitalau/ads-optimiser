import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { login } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect('/dashboard');

  const params = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-logo"><img src="/pilot-ads-logo.png" alt="Pilot Ads" /></Link>
        <div className="auth-kicker">WELCOME BACK</div>
        <h1>Log in to Pilot Ads</h1>
        <p className="auth-subtitle">Manage your agency workspace, connected accounts and optimisation opportunities.</p>
        {params.error ? <div className="auth-error">{params.error}</div> : null}
        <form className="auth-form">
          <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@agency.com" /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="Your password" /></label>
          <button className="blue-button auth-submit" formAction={login}>Log in <span>→</span></button>
        </form>
        <p className="auth-switch">New to Pilot Ads? <Link href="/signup">Start your free trial</Link></p>
      </section>
    </main>
  );
}
