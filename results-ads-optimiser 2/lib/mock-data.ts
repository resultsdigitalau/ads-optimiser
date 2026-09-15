export const accounts = [
  { id: 'client-account-1', name: 'Harbour Plumbing Co.', initials:'HP', score: 72, spend: 6842, conversions: 36, cpa: 190.06, improvements: 8, priority: 'high', change:-6.4, status:'Needs attention' },
  { id: 'client-account-2', name: 'Northside Dental', initials:'ND', score: 91, spend: 11840, conversions: 129, cpa: 91.78, improvements: 2, priority: 'low', change:12.7, status:'Performing well' },
  { id: 'client-account-3', name: 'Bright Spark Electrical', initials:'BS', score: 84, spend: 4750, conversions: 52, cpa: 91.35, improvements: 5, priority: 'medium', change:8.2, status:'Healthy' },
  { id: 'client-account-4', name: 'Lumen Mortgage Co.', initials:'LM', score: 68, spend: 5330, conversions: 27, cpa: 197.41, improvements: 10, priority: 'high', change:-11.8, status:'Needs attention' },
  { id: 'client-account-5', name: 'Oak & Ivy Landscaping', initials:'OI', score: 88, spend: 3624, conversions: 44, cpa: 82.36, improvements: 2, priority: 'low', change:14.1, status:'Performing well' },
];

export const recommendations = [
  { id:'r1', severity:'high', category:'Wasted spend', title:'CPA has increased 31%', description:'Cost increased while conversion volume declined. Three search terms account for $384 of spend with no conversions.', impact:'$310/mo', confidence:94 },
  { id:'r2', severity:'high', category:'Search terms', title:'Add 9 negative keywords', description:'Employment, training and DIY searches are generating clicks without meaningful lead intent.', impact:'$214/mo', confidence:97 },
  { id:'r3', severity:'medium', category:'Device performance', title:'Mobile CPA is 46% above desktop', description:'Mobile traffic is consuming 62% of spend but is converting materially below the account average.', impact:'$185/mo', confidence:88 },
  { id:'r4', severity:'medium', category:'Budget pacing', title:'Budget pacing is 18% over target', description:'At the current run rate this account is projected to exceed its monthly budget.', impact:'$420/mo', confidence:99 }
];

export const weeklyPerformance = [42,48,45,58,61,66,63,74,78,72,82,88];
