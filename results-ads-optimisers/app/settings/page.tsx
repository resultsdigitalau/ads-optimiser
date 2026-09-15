import { AppShell } from '@/components/AppShell';
import { getWorkspace } from '@/lib/workspace';
import { saveAccountSettings } from './actions';

const improvementTypes = [
  ['negative_keyword', 'Negative keywords'],
  ['keyword_opportunity', 'Search-term opportunities'],
  ['pause_keyword', 'Pause underperforming keywords'],
  ['budget', 'Budget pacing'],
  ['cpa_spike', 'CPA changes'],
  ['device', 'Device adjustments'],
  ['location', 'Location adjustments'],
  ['search_partners', 'Search Partner performance'],
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ account?: string; saved?: string }> }) {
  const params = await searchParams;
  const { supabase, accounts } = await getWorkspace();
  const account = accounts.find((item) => item.id === params.account) ?? accounts[0];
  const [{ data: target }, { data: settings }] = account ? await Promise.all([
    supabase.from('account_targets').select('*').eq('ad_account_id', account.id).maybeSingle(),
    supabase.from('account_settings').select('*').eq('ad_account_id', account.id).maybeSingle(),
  ]) : [{ data: null }, { data: null }] as any;
  const algorithm = (settings?.algorithm_settings ?? {}) as Record<string, number>;
  const active = new Set<string>(settings?.active_improvement_types?.length ? settings.active_improvement_types : improvementTypes.map(([value]) => value));

  return <AppShell active="settings">
    <div className="dash-head"><div><h1>Account settings</h1><p>Set the goals, safeguards and context that Pilot Ads uses for every recommendation.</p></div></div>
    {params.saved ? <div className="notice success">Settings saved. New recommendations will use these rules.</div> : null}
    {!account ? <section className="dash-card empty-panel"><h2>Connect a Google Ads account first</h2><p>Account-level controls appear here after an account has been imported.</p></section> : <form action={saveAccountSettings} className="settings-layout">
      <aside className="settings-index dash-card">
        <label className="field-label">Google Ads account</label>
        <select name="account_id" defaultValue={account.id}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.descriptive_name}</option>)}</select>
        <a href="#goals">Goals and budget</a><a href="#algorithm">Algorithm</a><a href="#context">Account context</a><a href="#types">Improvement types</a>
        <button className="primary-button" type="submit">Save account settings</button>
      </aside>
      <div className="settings-panels">
        <section id="goals" className="dash-card form-section"><div className="section-heading"><div><span>01</span><h2>Goals and budget</h2></div><p>Recommendations are measured against these commercial targets.</p></div>
          <div className="form-grid three"><label>Performance mode<select name="performance_mode" defaultValue={settings?.performance_mode ?? 'cpa'}><option value="cpa">Cost per conversion (CPA)</option><option value="roas">Return on ad spend (ROAS)</option></select></label><label>Monthly budget<input name="monthly_budget" type="number" min="0" step="0.01" defaultValue={target?.monthly_budget ?? ''}/></label><label>Acceptable variance (%)<input name="budget_variance" type="number" min="0" max="100" defaultValue={settings?.budget_variance ?? 10}/></label><label>Target CPA<input name="target_cpa" type="number" min="0" step="0.01" defaultValue={target?.target_cpa ?? ''}/></label><label>Target ROAS<input name="target_roas" type="number" min="0" step="0.01" defaultValue={target?.target_roas ?? ''}/></label><label>Minimum conversions<input name="minimum_conversions" type="number" min="1" defaultValue={target?.minimum_conversions ?? 3}/></label><label className="span-two">Primary conversion<input name="primary_conversion" defaultValue={target?.primary_conversion ?? ''} placeholder="Qualified lead, sale or booking"/></label><label className="check-field"><input name="pause_over_budget" type="checkbox" defaultChecked={Boolean(settings?.pause_over_budget)}/><span><strong>Protect the monthly budget</strong><small>Flag campaigns for pausing when spend exceeds the budget and variance.</small></span></label></div>
        </section>

        <section id="algorithm" className="dash-card form-section"><div className="section-heading"><div><span>02</span><h2>Recommendation algorithm</h2></div><p>Choose the optimisation posture, then fine-tune its evidence thresholds.</p></div>
          <div className="choice-grid"><label><input type="radio" name="primary_outcome" value="reduce" defaultChecked={settings?.primary_outcome === 'reduce'}/><span><strong>Reduce wasted spend</strong><small>Prioritise efficiency and tighter exclusions.</small></span></label><label><input type="radio" name="primary_outcome" value="maintain" defaultChecked={!settings || settings.primary_outcome === 'maintain'}/><span><strong>Maintain efficiency</strong><small>Balance savings and account growth.</small></span></label><label><input type="radio" name="primary_outcome" value="scale" defaultChecked={settings?.primary_outcome === 'scale'}/><span><strong>Scale conversions</strong><small>Act sooner on proven demand.</small></span></label></div>
          <div className="form-grid five compact-fields"><label>Aggressiveness<select name="aggressiveness" defaultValue={settings?.aggressiveness ?? 'balanced'}><option value="cautious">Cautious</option><option value="balanced">Balanced</option><option value="aggressive">Aggressive</option></select></label><label>Lookback days<input name="lookback_days" type="number" min="14" max="365" defaultValue={algorithm.lookback_days ?? 60}/></label><label>Max bid increase (%)<input name="max_bid_increase" type="number" min="0" max="100" defaultValue={algorithm.max_bid_increase ?? 30}/></label><label>Max bid decrease (%)<input name="max_bid_decrease" type="number" min="0" max="100" defaultValue={algorithm.max_bid_decrease ?? 30}/></label><label>Pause multiplier<input name="pause_multiplier" type="number" min="1" max="10" step="0.1" defaultValue={algorithm.pause_multiplier ?? 1.5}/></label><label>Max impression share (%)<input name="max_impression_share" type="number" min="0" max="100" defaultValue={algorithm.max_impression_share ?? 80}/></label></div>
        </section>

        <section id="context" className="dash-card form-section"><div className="section-heading"><div><span>03</span><h2>Account context</h2></div><p>Give the engine enough business knowledge to avoid technically correct but commercially poor suggestions.</p></div>
          <div className="form-grid two"><label>Industry<input name="industry" defaultValue={settings?.industry ?? ''} placeholder="Plumbing, hair salon, automotive"/></label><label>Brand terms<input name="brand_terms" defaultValue={(settings?.brand_terms ?? []).join(', ')} placeholder="Brand name, product brands"/></label><label className="span-two">Target market<textarea name="target_market" defaultValue={settings?.target_market ?? ''} placeholder="Who the business serves, where they are located and what counts as a valuable lead."/></label><label className="span-two">Competitor websites<input name="competitors" defaultValue={(settings?.competitors ?? []).join(', ')} placeholder="https://competitor.com.au, https://another.com.au"/></label><label className="span-two">Account structure<textarea name="account_structure" defaultValue={settings?.account_structure ?? ''} placeholder="Explain brand, service and location campaign groupings."/></label><label className="span-two">Never recommend these terms<input name="excluded_terms" defaultValue={(target?.excluded_terms ?? []).join(', ')} placeholder="jobs, DIY, emergency services"/></label></div>
        </section>

        <section id="types" className="dash-card form-section"><div className="section-heading"><div><span>04</span><h2>Active improvement types</h2></div><p>Disable any recommendation type that is unsuitable for this account.</p></div><div className="toggle-grid">{improvementTypes.map(([value, label]) => <label key={value}><input name="improvement_types" type="checkbox" value={value} defaultChecked={active.has(value)}/><span>{label}</span></label>)}</div></section>
        <div className="sticky-save"><span>Settings for <strong>{account.descriptive_name}</strong></span><button className="primary-button" type="submit">Save account settings</button></div>
      </div>
    </form>}
  </AppShell>;
}

