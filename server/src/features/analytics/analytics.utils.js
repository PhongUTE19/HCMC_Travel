import {
  OUTCOMES,
  PERCENTILES,
  TIME_WINDOW_MS,
  DEFAULT_TIME_RANGE,
} from './analytics.constants.js';

/**
 * Resolves starting and ending ISO timestamps based on timeRange or explicit date bounds.
 *
 * @param {object} [filters={}]
 * @returns {{ start: string | null, end: string | null }}
 */
export function resolveTimeBounds(filters = {}) {
  let start = null;
  const end = filters.endDate ? new Date(filters.endDate).toISOString() : new Date().toISOString();

  if (filters.startDate) {
    start = new Date(filters.startDate).toISOString();
  } else if (filters.timeRange && filters.timeRange !== 'all') {
    const windowMs = TIME_WINDOW_MS[filters.timeRange] || TIME_WINDOW_MS[DEFAULT_TIME_RANGE];
    start = new Date(Date.now() - windowMs).toISOString();
  }

  return { start, end };
}

/**
 * Calculates a specific percentile from an already sorted array of numeric values.
 *
 * @param {number[]} sortedValues - Array of sorted numbers (ascending)
 * @param {number} quantile - Number between 0 and 1 (e.g. 0.5, 0.95)
 * @returns {number}
 */
export function calculatePercentile(sortedValues, quantile) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    return 0;
  }
  const index = Math.floor(sortedValues.length * quantile);
  const clampedIndex = Math.min(Math.max(0, index), sortedValues.length - 1);
  return sortedValues[clampedIndex] ?? 0;
}

/**
 * Calculates summary metrics, token totals, and latency percentiles from records.
 *
 * @param {Array<object>} records
 * @returns {object}
 */
export function calculateOverviewMetrics(records = []) {
  const totalRequests = records.length;
  let successCount = 0;
  let failureCount = 0;
  let refusalCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let recordsWithMissingTokens = 0;

  const latencies = [];

  for (const rec of records) {
    if (rec.outcome === OUTCOMES.SUCCESS) successCount++;
    else if (rec.outcome === OUTCOMES.FAILURE) failureCount++;
    else if (rec.outcome === OUTCOMES.REFUSAL) refusalCount++;

    if (rec.tokenUsage?.tokenCountsAvailable && typeof rec.tokenUsage.totalTokens === 'number') {
      inputTokens += rec.tokenUsage.inputTokens || 0;
      outputTokens += rec.tokenUsage.outputTokens || 0;
      totalTokens += rec.tokenUsage.totalTokens || 0;
    } else {
      recordsWithMissingTokens++;
    }

    if (typeof rec.durationMs === 'number') {
      latencies.push(rec.durationMs);
    }
  }

  latencies.sort((a, b) => a - b);
  const sumLatency = latencies.reduce((acc, v) => acc + v, 0);
  const avgLatencyMs = latencies.length > 0 ? Math.round(sumLatency / latencies.length) : 0;

  const p50LatencyMs = calculatePercentile(latencies, PERCENTILES.P50);
  const p95LatencyMs = calculatePercentile(latencies, PERCENTILES.P95);

  const successRate = totalRequests > 0 ? Number(((successCount / totalRequests) * 100).toFixed(1)) : 0;
  const failureRate = totalRequests > 0 ? Number(((failureCount / totalRequests) * 100).toFixed(1)) : 0;
  const refusalRate = totalRequests > 0 ? Number(((refusalCount / totalRequests) * 100).toFixed(1)) : 0;

  return {
    totalRequests,
    successCount,
    failureCount,
    refusalCount,
    successRate,
    failureRate,
    refusalRate,
    inputTokens,
    outputTokens,
    totalTokens,
    recordsWithMissingTokens,
    avgLatencyMs,
    p50LatencyMs,
    p95LatencyMs,
  };
}

/**
 * Groups timestamped records into chronological hourly or daily buckets.
 *
 * @param {Array<object>} records
 * @param {boolean} isHourly
 * @returns {Array<object>}
 */
export function groupRecordsIntoTimeBuckets(records = [], isHourly = false) {
  const buckets = new Map();

  for (const rec of records) {
    const d = new Date(rec.timestamp);
    const key = isHourly
      ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:00`
      : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        timestamp: key,
        dateLabel: key,
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        refusalCount: 0,
        totalTokens: 0,
        durationSum: 0,
        avgLatencyMs: 0,
      });
    }

    const b = buckets.get(key);
    b.totalRequests++;
    if (rec.outcome === OUTCOMES.SUCCESS) b.successCount++;
    else if (rec.outcome === OUTCOMES.FAILURE) b.failureCount++;
    else if (rec.outcome === OUTCOMES.REFUSAL) b.refusalCount++;

    if (rec.tokenUsage?.totalTokens) {
      b.totalTokens += rec.tokenUsage.totalTokens;
    }
    if (rec.durationMs) {
      b.durationSum += rec.durationMs;
    }
    b.avgLatencyMs = Math.round(b.durationSum / b.totalRequests);
  }

  return Array.from(buckets.values());
}

/**
 * Calculates frequency distributions for features, models, operations, and outcomes.
 *
 * @param {Array<object>} records
 * @returns {object}
 */
export function calculateDistributions(records = []) {
  const featureMap = new Map();
  const modelMap = new Map();
  const operationMap = new Map();
  const outcomeMap = new Map();
  const total = records.length;

  for (const rec of records) {
    const f = rec.feature || 'unknown';
    const m = rec.model || 'unknown';
    const op = rec.operation || 'unknown';
    const out = rec.outcome || 'unknown';

    featureMap.set(f, (featureMap.get(f) || 0) + 1);
    modelMap.set(m, (modelMap.get(m) || 0) + 1);
    operationMap.set(op, (operationMap.get(op) || 0) + 1);
    outcomeMap.set(out, (outcomeMap.get(out) || 0) + 1);
  }

  const formatDist = (map) =>
    Array.from(map.entries()).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }));

  return {
    byFeature: formatDist(featureMap),
    byModel: formatDist(modelMap),
    byOperation: formatDist(operationMap),
    byOutcome: formatDist(outcomeMap),
    total,
  };
}

/**
 * Filters in-memory records based on time bounds, feature, model, and outcome.
 *
 * @param {Array<object>} records
 * @param {object} [filters={}]
 * @returns {Array<object>}
 */
export function filterInMemoryRecords(records = [], filters = {}) {
  const { start, end } = resolveTimeBounds(filters);

  return records.filter((rec) => {
    if (start && rec.timestamp < start) return false;
    if (end && rec.timestamp > end) return false;
    if (filters.feature && filters.feature !== 'all' && rec.feature !== filters.feature) return false;
    if (filters.model && filters.model !== 'all' && rec.model !== filters.model) return false;
    if (filters.outcome && filters.outcome !== 'all' && rec.outcome !== filters.outcome) return false;
    return true;
  });
}
