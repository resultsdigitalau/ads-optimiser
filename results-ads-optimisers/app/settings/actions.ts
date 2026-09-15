'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getWorkspace } from '@/lib/workspace';

const text = (formData: FormData, key: string) => String(formData.get(key) || '').trim();
const optionalNumber = (formData: FormData, key: string) => {
  const raw = text(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};
const csv = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export async function saveAccountSettings(formData: FormData) {
  const { supabase, userId, organisationId, accounts } = await getWorkspace();
  if (!userId || !organisationId) redirect('/login');

  const accountId = text(formData, 'account_id');
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw new Error('This Google Ads account is not available in your workspace.');

  const target = {
    organisation_id: organisationId,
    ad_account_id: accountId,
    monthly_budget: optionalNumber(formData, 'monthly_budget'),
    target_cpa: optionalNumber(formData, 'target_cpa'),
    target_roas: optionalNumber(formData, 'target_roas'),
    primary_conversion: text(formData, 'primary_conversion') || null,
    minimum_conversions: Math.max(1, optionalNumber(formData, 'minimum_conversions') || 3),
    excluded_terms: csv(text(formData, 'excluded_terms')),
    updated_at: new Date().toISOString(),
  };
  const { error: targetError } = await supabase.from('account_targets').upsert(target, { onConflict: 'ad_account_id' });
  if (targetError) throw targetError;

  const settings = {
    organisation_id: organisationId,
    ad_account_id: accountId,
    performance_mode: text(formData, 'performance_mode') || 'cpa',
    primary_outcome: text(formData, 'primary_outcome') || 'maintain',
    aggressiveness: text(formData, 'aggressiveness') || 'balanced',
    budget_variance: optionalNumber(formData, 'budget_variance') || 10,
    pause_over_budget: formData.get('pause_over_budget') === 'on',
    target_market: text(formData, 'target_market') || null,
    brand_terms: csv(text(formData, 'brand_terms')),
    competitors: csv(text(formData, 'competitors')),
    industry: text(formData, 'industry') || null,
    account_structure: text(formData, 'account_structure') || null,
    algorithm_settings: {
      lookback_days: optionalNumber(formData, 'lookback_days') || 60,
      max_bid_increase: optionalNumber(formData, 'max_bid_increase') || 30,
      max_bid_decrease: optionalNumber(formData, 'max_bid_decrease') || 30,
      pause_multiplier: optionalNumber(formData, 'pause_multiplier') || 1.5,
      max_impression_share: optionalNumber(formData, 'max_impression_share') || 80,
    },
    active_improvement_types: formData.getAll('improvement_types').map(String),
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };
  const { error: settingsError } = await supabase.from('account_settings').upsert(settings, { onConflict: 'ad_account_id' });
  if (settingsError) throw settingsError;

  await supabase.from('audit_logs').insert({
    organisation_id: organisationId,
    actor_user_id: userId,
    event_type: 'account_settings_updated',
    entity_type: 'ad_account',
    entity_id: accountId,
    metadata: { performance_mode: settings.performance_mode, primary_outcome: settings.primary_outcome, aggressiveness: settings.aggressiveness },
  });

  revalidatePath('/settings');
  redirect(`/settings?account=${accountId}&saved=1`);
}

