// Links between a six-tab sector's Insights and its Work tab: a measure's records open in Work
// with the measure, period and breakdown, and Back to Insights restores them.

/** Work's search for one measure's source records; `view` is the sector's list (e.g. 'board'). */
export const metricSearch = ({ metric, period, segment }, view = 'board') => ({ view, metric, from: 'insights', ...(period ? { period } : {}), ...(segment ? { segment } : {}) });

/** Insights' search when coming back: the measure, period and the breakdown dimension. */
export const insightsReturn = params => ({ ...(params.get('metric') ? { metric: params.get('metric') } : {}), ...(params.get('period') ? { period: params.get('period') } : {}), ...(params.get('segment') ? { segment: params.get('segment').split(':')[0] } : {}) });
