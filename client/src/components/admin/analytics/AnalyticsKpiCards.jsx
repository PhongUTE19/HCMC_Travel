import React from 'react';
import { UI_LABELS } from '../../../constants';

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
}

export default function AnalyticsKpiCards({ overview }) {
  if (!overview) return null;

  const {
    totalRequests = 0,
    successCount = 0,
    failureCount = 0,
    refusalCount = 0,
    successRate = 0,
    failureRate = 0,
    refusalRate = 0,
    inputTokens = 0,
    outputTokens = 0,
    totalTokens = 0,
    recordsWithMissingTokens = 0,
    avgLatencyMs = 0,
    p95LatencyMs = 0,
  } = overview;

  return (
    <div className="analytics-kpis-grid" role="region" aria-label="KPI overview">
      {/* 1. Total Requests */}
      <div className="analytics-kpi-card">
        <span className="analytics-kpi-label">{UI_LABELS.ANALYTICS.KPIS.TOTAL_REQUESTS}</span>
        <span className="analytics-kpi-value">{formatNumber(totalRequests)}</span>
        <span className="analytics-kpi-subtext">Across selected time window</span>
      </div>

      {/* 2. Success Rate */}
      <div className="analytics-kpi-card">
        <span className="analytics-kpi-label">{UI_LABELS.ANALYTICS.KPIS.SUCCESS_RATE}</span>
        <span className="analytics-kpi-value" style={{ color: 'var(--color-green-600)' }}>
          {successRate}%
        </span>
        <span className="analytics-kpi-subtext">
          {formatNumber(successCount)} successful calls
        </span>
      </div>

      {/* 3. Failure & Refusal */}
      <div className="analytics-kpi-card">
        <span className="analytics-kpi-label">{UI_LABELS.ANALYTICS.KPIS.FAILURE_RATE}</span>
        <span className="analytics-kpi-value" style={{ color: failureRate > 0 ? 'var(--color-red-600)' : 'var(--color-text-primary)' }}>
          {failureRate}%
        </span>
        <span className="analytics-kpi-subtext">
          {formatNumber(failureCount)} errors · {formatNumber(refusalCount)} refusals ({refusalRate}%)
        </span>
      </div>

      {/* 4. Total Tokens & Completeness Warning */}
      <div className="analytics-kpi-card">
        <span className="analytics-kpi-label">{UI_LABELS.ANALYTICS.KPIS.TOTAL_TOKENS}</span>
        <span className="analytics-kpi-value">{formatNumber(totalTokens)}</span>
        <span className="analytics-kpi-subtext">
          In: {formatNumber(inputTokens)} · Out: {formatNumber(outputTokens)}
        </span>
        {recordsWithMissingTokens > 0 && (
          <div className="analytics-warning-badge" title="Provider response did not include complete token metadata">
            {UI_LABELS.ANALYTICS.KPIS.INCOMPLETE_TOKENS_WARNING(recordsWithMissingTokens)}
          </div>
        )}
      </div>

      {/* 5. Latency Metrics */}
      <div className="analytics-kpi-card">
        <span className="analytics-kpi-label">{UI_LABELS.ANALYTICS.KPIS.LATENCY_TITLE}</span>
        <span className="analytics-kpi-value">
          {avgLatencyMs} <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'normal' }}>ms</span>
        </span>
        <span className="analytics-kpi-subtext">
          p95: {p95LatencyMs} ms
        </span>
      </div>
    </div>
  );
}
