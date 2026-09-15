import Link from 'next/link';

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card auth-centred">
        <Link href="/" className="auth-logo"><img src="/pilot-ads-logo.png" alt="Pilot Ads" /></Link>
        <div className="mail-icon">✉</div>
        <h1>Check your inbox</h1>
        <p className="auth-subtitle">We sent a confirmation link{params.email ? <> to <strong>{params.email}</strong></> : null}. Confirm your email to finish creating your Pilot Ads account.</p>
        <Link className="outline-button full" href="/login">Back to login</Link>
      </section>
    </main>
  );
}
