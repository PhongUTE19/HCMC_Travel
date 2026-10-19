import {
  fetchOverviewRecords,
  fetchTimeseriesRecords,
  fetchBreakdownRecords,
  fetchHistoryRecords,
} from './analytics.repository.js';
import {
  calculateOverviewMetrics,
  groupRecordsIntoTimeBuckets,
  calculateDistributions,
  resolveTimeBounds,
} from './analytics.utils.js';
import { PAGINATION_DEFAULTS } from './analytics.constants.js';

// Re-export resolveTimeBounds for backwards compatibility
export { resolveTimeBounds };

/**
 * Retrieves analytics overview KPIs, percentiles, token usage, and persistence state.
 *
 * @param {object} [filters={}]
 * @returns {Promise<object>}
 */
export async function getAnalyticsOverview(filters = {}) {
  const { records, isDurable, provider } = await fetchOverviewRecords(filters);
  const metrics = calculateOverviewMetrics(records);

  return {
    ...metrics,
    persistence: {
      isDurable,
      provider,
    },
  };
}

/**
 * Retrieves chronological time-series aggregations (grouped by day or hour).
 *
 * @param {object} [filters={}]
 * @returns {Promise<Array<object>>}
 */
export async function getAnalyticsTimeseries(filters = {}) {
  const records = await fetchTimeseriesRecords(filters);
  const isHourly = filters.timeRange === '1h' || filters.timeRange === '24h';
  return groupRecordsIntoTimeBuckets(records, isHourly);
}

/**
 * Retrieves dimensional breakdown distributions by feature, model, operation, and outcome.
 *
 * @param {object} [filters={}]
 * @returns {Promise<object>}
 */
export async function getAnalyticsBreakdown(filters = {}) {
  const records = await fetchBreakdownRecords(filters);
  return calculateDistributions(records);
}

/**
 * Retrieves paginated request history with filtering.
 *
 * @param {object} [filters={}]
 * @returns {Promise<{ page: number, limit: number, total: number, totalPages: number, records: Array<object> }>}
 */
export async function getAnalyticsHistory(filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || PAGINATION_DEFAULTS.DEFAULT_PAGE);
  const limit = Math.max(
    1,
    Math.min(PAGINATION_DEFAULTS.MAX_LIMIT, parseInt(filters.limit, 10) || PAGINATION_DEFAULTS.DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  const { records, total } = await fetchHistoryRecords(filters, { offset, limit });

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    records,
  };
}
