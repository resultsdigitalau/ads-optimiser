'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function str(formData: FormData, key: string) {
  return String(formData.get(key) || '');
}

function num(formData: FormData, key: string) {
  const value = Number(formData.get(key) || 0);
  return Number.isFinite(value) ? value : 0;
}

async function saveRecommendation(formData: FormData, status: 'approved' | 'dismissed') {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error('You must be signed in.');

  const { data: membership } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!membership?.organisation_id) throw new Error('No Pilot Ads workspace was found.');

  const recommendationKey = str(formData, 'recommendation_key');
  const adAccountId = str(formData, 'ad_account_id');
  const kind = str(formData, 'kind');
  const searchTerm = str(formData, 'search_term');
  const accountName = str(formData, 'account_name');
  const campaignName = str(formData, 'campaign_name');
  const adGroupName = str(formData, 'ad_group_name');
  const currency = str(formData, 'currency') || 'AUD';
  const priority = str(formData, 'priority') || 'low';
  const reason = str(formData, 'reason');
  const spend = num(formData, 'spend');
  const clicks = num(formData, 'clicks');
  const impressions = num(formData, 'impressions');
  const conversions = num(formData, 'conversions');
  const confidence = num(formData, 'confidence');

  if (!recommendationKey || !adAccountId || !searchTerm) {
    throw new Error('Recommendation details are incomplete.');
  }

  const title = kind === 'negative'
    ? `Review “${searchTerm}” as a negative keyword`
    : kind === 'promote'
      ? `Review “${searchTerm}” as a keyword opportunity`
      : `Review high-cost search term “${searchTerm}”`;

  const summary = kind === 'negative'
    ? `${searchTerm} spent ${currency} ${spend.toFixed(2)} with no recorded conversions.`
    : kind === 'promote'
      ? `${searchTerm} recorded ${conversions.toFixed(1)} conversions and may deserve dedicated keyword coverage.`
      : `${searchTerm} has meaningful spend without a recorded conversion.`;

  const now = new Date();
  const sourceEnd = now.toISOString().slice(0, 10);
  const sourceStartDate = new Date(now);
  sourceStartDate.setUTCDate(sourceStartDate.getUTCDate() - 59);
  const sourceStart = sourceStartDate.toISOString().slice(0, 10);

  const row = {
    organisation_id: membership.organisation_id,
    ad_account_id: adAccountId,
    recommendation_key: recommendationKey,
    recommendation_type: kind === 'negative' ? 'negative_keyword' : kind === 'promote' ? 'keyword_opportunity' : 'search_term_review',
    title,
    summary,
    explanation: reason,
    priority,
    status,
    confidence,
    estimated_monthly_impact: kind === 'promote' ? 0 : spend / 2,
    payload: {
      search_term: searchTerm,
      account_name: accountName,
      campaign_name: campaignName,
      ad_group_name: adGroupName,
      currency,
      spend,
      clicks,
      impressions,
      conversions,
      action_mode: 'review_only',
      reviewed_by_user_id: userId,
    },
    source_window_start: sourceStart,
    source_window_end: sourceEnd,
    detected_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const { error } = await supabase
    .from('recommendations')
    .upsert(row, { onConflict: 'organisation_id,recommendation_key' });

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    organisation_id: membership.organisation_id,
    actor_user_id: userId,
    event_type: status === 'approved' ? 'recommendation_approved' : 'recommendation_dismissed',
    entity_type: 'recommendation',
    metadata: {
      recommendation_key: recommendationKey,
      kind,
      search_term: searchTerm,
      account_name: accountName,
      status,
    },
  });

  revalidatePath('/improvements');
}

export async function approveRecommendation(formData: FormData) {
  await saveRecommendation(formData, 'approved');
}

export async function dismissRecommendation(formData: FormData) {
  await saveRecommendation(formData, 'dismissed');
}
