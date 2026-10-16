// A fixed, fictional reporting cohort, separate from the six active work examples.
// These completed records never enter a production API or a sending workflow.
export const REPORT = Array.from({ length: 12 }, (_, i) => ({
  id: `DEMO-${201 + i}`,
  title: { en: ['Brand film', 'Product photography', 'Podcast production', 'Social edits'][i % 4], ar: ['فيلم علامة تجارية', 'تصوير منتجات', 'إنتاج بودكاست', 'مقاطع اجتماعية'][i % 4] },
  week: Math.floor(i / 3),
  onTime: i % 5 !== 0,
  approvalHours: 18 + i * 6,
  revisionRounds: i % 4 === 0 ? 3 : 1,
  includedRounds: 2,
  revenueMinor: 180000 + i * 25000,
  directCostMinor: 95000 + i * 14000,
}));

export function reportMetrics(rows = REPORT) {
  const hours = rows.map(r => r.approvalHours).sort((a,b)=>a-b);
  const middle = Math.floor(hours.length / 2);
  return [
    rows.length ? rows.filter(r=>r.onTime).length / rows.length * 100 : null,
    hours.length ? hours.length % 2 ? hours[middle] : (hours[middle-1]+hours[middle])/2 : null,
    rows.length ? rows.filter(r=>r.revisionRounds>r.includedRounds).length / rows.length * 100 : null,
    rows.length ? rows.reduce((sum,r)=>sum+r.revenueMinor-r.directCostMinor,0) : null,
  ];
}

export function metricIndex(value) {
  return ['0','1','2','3'].includes(String(value)) ? Number(value) : 0;
}
