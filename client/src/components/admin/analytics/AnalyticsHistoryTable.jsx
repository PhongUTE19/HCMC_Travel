import React, { useState } from 'react';
import { ANALYTICS_CONFIG, ANALYTICS_CHART_CONFIG, UI_LABELS } from '../../../constants';
import { validatePagination } from '../../../utils';

function formatTimestamp(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return isoString;
  }
}

export default function AnalyticsHistoryTable({
  historyData,
  filters,
  onChangeFilters,
  loading = false,
}) {
  const [expandedRowId, setExpandedRowId] = useState(null);

  const {
    records = [],
    page = 1,
    limit = 20,
    total = 0,
    totalPages = 1,
  } = historyData || {};

  const fromIndex = total > 0 ? (page - 1) * limit + 1 : 0;
  const toIndex = Math.min(page * limit, total);

  const toggleExpand = (id) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const handlePageChange = (newPage) => {
    const val = validatePagination(newPage, limit);
    const validPage = val.isValid && val.page ? val.page : 1;
    onChangeFilters({
      ...filters,
      page: Math.max(1, Math.min(validPage, totalPages)),
    });
  };

  const handleLimitChange = (newLimit) => {
    const val = validatePagination(1, newLimit);
    const validLimit = val.isValid && val.limit ? val.limit : 20;
    onChangeFilters({
      ...filters,
      limit: validLimit,
      page: 1,
    });
  };

  return (
    <div className="analytics-history-card" role="region" aria-label="Request history">
      <div className="analytics-chart-header">
        <div>
          <h4 className="analytics-chart-title">{UI_LABELS.ANALYTICS.HISTORY.TITLE}</h4>
          <p className="analytics-subtitle" style={{ fontSize: 'var(--font-size-xs)', marginTop: '2px' }}>
            {UI_LABELS.ANALYTICS.HISTORY.SUBTITLE}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            {UI_LABELS.ANALYTICS.HISTORY.PAGE_SIZE}
          </span>
          <select
            className="analytics-filter-select"
            style={{ height: '30px', fontSize: 'var(--font-size-xs)', padding: '0 6px' }}
            value={limit}
            onChange={(e) => handleLimitChange(e.target.value)}
          >
            {ANALYTICS_CONFIG.PAGE_SIZE_OPTIONS.map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="analytics-table-wrapper">
        <table className="analytics-history-table">
          <thead>
            <tr>
              <th>{UI_LABELS.ANALYTICS.HISTORY.TH_TIMESTAMP}</th>
              <th>{UI_LABELS.ANALYTICS.HISTORY.TH_FEATURE}</th>
              <th>{UI_LABELS.ANALYTICS.HISTORY.TH_MODEL}</th>
              <th>{UI_LABELS.ANALYTICS.HISTORY.TH_OUTCOME}</th>
              <th>{UI_LABELS.ANALYTICS.HISTORY.TH_LATENCY}</th>
              <th>{UI_LABELS.ANALYTICS.HISTORY.TH_TOKENS}</th>
              <th>{UI_LABELS.ANALYTICS.HISTORY.TH_PROMPT_VERSION}</th>
              <th>{UI_LABELS.ANALYTICS.HISTORY.TH_ATTEMPTS}</th>
              <th>{UI_LABELS.ANALYTICS.HISTORY.TH_DETAILS}</th>
            </tr>
          </thead>
          <tbody>
            {loading && records.length === 0 ? (
              <tr>
                <td colSpan="9" className="analytics-state-message">
                  {UI_LABELS.ANALYTICS.HISTORY.LOADING}
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="9" className="analytics-state-message">
                  {UI_LABELS.ANALYTICS.HISTORY.EMPTY_STATE}
                </td>
              </tr>
            ) : (
              records.map((rec) => {
                const isExpanded = expandedRowId === rec.id;
                const hasErrorOrRefusal = Boolean(rec.error || rec.refusalReason || rec.outcome !== 'success');
                const hasTokens = rec.tokenUsage?.tokenCountsAvailable;

                return (
                  <React.Fragment key={rec.id}>
                    <tr>
                      <td style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-family-mono)' }}>
                        {formatTimestamp(rec.timestamp)}
                      </td>
                      <td>
                        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{rec.feature}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {rec.operation}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{rec.model || '—'}</td>
                      <td>
                        <span className={`analytics-outcome-badge analytics-outcome-badge--${rec.outcome}`}>
                          {rec.outcome}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div>{rec.durationMs !== null ? `${rec.durationMs} ms` : '—'}</div>
                        {rec.timeToFirstTokenMs !== null && rec.timeToFirstTokenMs !== undefined && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            TTFT: {rec.timeToFirstTokenMs} ms
                          </div>
                        )}
                      </td>
                      <td>
                        {hasTokens ? (
                          <span title={`Input: ${rec.tokenUsage.inputTokens}, Output: ${rec.tokenUsage.outputTokens}, Total: ${rec.tokenUsage.totalTokens}`}>
                            {rec.tokenUsage.totalTokens?.toLocaleString()}
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>
                              ({rec.tokenUsage.inputTokens} / {rec.tokenUsage.outputTokens})
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            Unavailable
                          </span>
                        )}
                      </td>
                      <td>
                        {rec.promptVersion ? (
                          <span
                            className="analytics-hash-pill"
                            title={`Full prompt SHA-256: ${rec.promptVersion}`}
                          >
                            {rec.promptVersion.slice(0, ANALYTICS_CHART_CONFIG.PROMPT_HASH_DISPLAY_LENGTH)}…
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {rec.attemptCount || (rec.attempts ? rec.attempts.length : 1)}
                      </td>
                      <td>
                        {hasErrorOrRefusal ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            onClick={() => toggleExpand(rec.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Failure / Error Detail Row */}
                    {isExpanded && hasErrorOrRefusal && (
                      <tr>
                        <td colSpan="9" style={{ background: 'var(--color-slate-50)', padding: 'var(--space-3)' }}>
                          <div className="analytics-error-detail">
                            {rec.refusal && (
                              <div style={{ marginBottom: '4px' }}>
                                <strong>Refusal Reason:</strong> {rec.refusalReason || 'Model refused to process request'}
                              </div>
                            )}
                            {rec.error && (
                              <div>
                                <strong>Error [{rec.error.category || rec.error.code || 'UNKNOWN'}]:</strong>{' '}
                                {rec.error.message || 'Operation failed'}
                              </div>
                            )}
                            {rec.attempts && rec.attempts.length > 1 && (
                              <div style={{ marginTop: '6px', fontSize: '0.75rem' }}>
                                <strong>Attempts history:</strong>
                                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                  {rec.attempts.map((att, i) => (
                                    <li key={i}>
                                      Attempt #{att.attemptNumber}: {att.status} ({att.durationMs} ms){' '}
                                      {att.error ? `— ${att.error.message}` : ''}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="analytics-pagination">
        <span className="analytics-pagination-info">
          {UI_LABELS.ANALYTICS.HISTORY.PAGINATION_SHOWING(fromIndex, toIndex, total)}
        </span>
        <div className="analytics-pagination-controls">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
            disabled={page <= 1 || loading}
            onClick={() => handlePageChange(page - 1)}
          >
            {UI_LABELS.ANALYTICS.HISTORY.PREVIOUS}
          </button>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
            disabled={page >= totalPages || loading}
            onClick={() => handlePageChange(page + 1)}
          >
            {UI_LABELS.ANALYTICS.HISTORY.NEXT}
          </button>
        </div>
      </div>
    </div>
  );
}
