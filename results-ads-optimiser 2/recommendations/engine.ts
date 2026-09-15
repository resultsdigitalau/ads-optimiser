export type SearchTermMetric = {
  searchTerm: string;
  cost: number;
  clicks: number;
  conversions: number;
  conversionValue?: number;
};

export type Recommendation = {
  type: 'NEGATIVE_KEYWORD' | 'HIGH_COST_ZERO_CONV' | 'CPA_SPIKE';
  severity: 'high' | 'medium' | 'low';
  title: string;
  reason: string;
  confidence: number;
  estimatedMonthlyImpact?: number;
  payload: Record<string, unknown>;
};

const lowIntentPatterns = [/\bjobs?\b/i,/\bsalary\b/i,/\bcareer\b/i,/\bapprentice/i,/\bcourse\b/i,/\bdiy\b/i,/\bfree\b/i,/\bhow to\b/i];

export function analyseSearchTerms(rows: SearchTermMetric[]): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const row of rows) {
    const lowIntent = lowIntentPatterns.some(rx => rx.test(row.searchTerm));
    if (lowIntent && row.clicks >= 3 && row.conversions === 0) {
      recs.push({
        type: 'NEGATIVE_KEYWORD', severity: row.cost >= 100 ? 'high' : 'medium',
        title: `Consider excluding “${row.searchTerm}”`,
        reason: `${row.clicks} clicks and $${row.cost.toFixed(2)} spend with no conversions. Search intent appears low value.`,
        confidence: 96,
        estimatedMonthlyImpact: row.cost,
        payload: { searchTerm: row.searchTerm, suggestedMatchType: 'PHRASE' }
      });
    } else if (row.cost >= 100 && row.clicks >= 10 && row.conversions === 0) {
      recs.push({
        type: 'HIGH_COST_ZERO_CONV', severity: 'high',
        title: `High spend with no conversions: “${row.searchTerm}”`,
        reason: `${row.clicks} clicks have spent $${row.cost.toFixed(2)} without a recorded primary conversion.`,
        confidence: 90,
        estimatedMonthlyImpact: row.cost * 0.7,
        payload: { searchTerm: row.searchTerm }
      });
    }
  }
  return recs;
}

export function detectCpaSpike(currentCpa: number, previousCpa: number, conversions: number): Recommendation | null {
  if (!previousCpa || conversions < 5) return null;
  const increase = (currentCpa - previousCpa) / previousCpa;
  if (increase < 0.3) return null;
  return {
    type:'CPA_SPIKE', severity:'high',
    title:`CPA has increased ${Math.round(increase*100)}%`,
    reason:`Current CPA is $${currentCpa.toFixed(2)} compared with $${previousCpa.toFixed(2)} in the comparison period.`,
    confidence:92,
    payload:{currentCpa,previousCpa,conversions}
  };
}
