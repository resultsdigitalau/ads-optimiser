import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createWorkspace } from './actions';

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');

  const { data: memberships } = await supabase.from('organisation_members').select('organisation_id').limit(1);
  if (memberships?.length) redirect('/dashboard');

  const params = await searchParams;
  return (
    <main className="auth-page onboarding-page">
      <section className="auth-card">
        <img className="onboarding-logo" src="/pilot-ads-logo.png" alt="Pilot Ads" />
        <div className="auth-kicker">STEP 1 OF 2</div>
        <h1>Name your agency workspace</h1>
        <p className="auth-subtitle">Your workspace keeps your team, client accounts, recommendations and audit history separate from every other Pilot Ads customer.</p>
        {params.error ? <div className="auth-error">{params.error}</div> : null}
        <form className="auth-form">
          <label>Agency name<input name="agency_name" required placeholder="Acme Performance Agency" /></label>
          <button className="blue-button auth-submit" formAction={createWorkspace}>Create workspace <span>→</span></button>
        </form>
        <div className="workspace-preview"><span className="workspace-icon">A</span><div><strong>Your agency</strong><small>Private Pilot Ads workspace</small></div><em>Owner</em></div>
      </section>
    </main>
  );
}
