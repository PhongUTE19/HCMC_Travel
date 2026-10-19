import React from 'react';
import { ANALYTICS_CONFIG, UI_LABELS } from '../../../constants';

export default function AnalyticsFilters({
  filters,
  onChange,
  onRefresh,
  refreshing = false,
}) {
  const handleFilterChange = (key, value) => {
    onChange({
      ...filters,
      [key]: value,
      page: 1, // Reset to first page when filter changes
    });
  };

  return (
    <div className="analytics-filters-bar" role="search" aria-label="Analytics filters">
      <div className="analytics-filter-item">
        <label htmlFor="analytics-filter-timerange" className="analytics-filter-label">
          {UI_LABELS.ANALYTICS.FILTER_TIME_RANGE}
        </label>
        <select
          id="analytics-filter-timerange"
          className="analytics-filter-select"
          value={filters.timeRange || '7d'}
          onChange={(e) => handleFilterChange('timeRange', e.target.value)}
        >
          {ANALYTICS_CONFIG.TIME_RANGES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="analytics-filter-item">
        <label htmlFor="analytics-filter-feature" className="analytics-filter-label">
          {UI_LABELS.ANALYTICS.FILTER_FEATURE}
        </label>
        <select
          id="analytics-filter-feature"
          className="analytics-filter-select"
          value={filters.feature || 'all'}
          onChange={(e) => handleFilterChange('feature', e.target.value)}
        >
          {ANALYTICS_CONFIG.FEATURES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="analytics-filter-item">
        <label htmlFor="analytics-filter-outcome" className="analytics-filter-label">
          {UI_LABELS.ANALYTICS.FILTER_OUTCOME}
        </label>
        <select
          id="analytics-filter-outcome"
          className="analytics-filter-select"
          value={filters.outcome || 'all'}
          onChange={(e) => handleFilterChange('outcome', e.target.value)}
        >
          {ANALYTICS_CONFIG.OUTCOMES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="analytics-filter-item" style={{ minWidth: 'auto', flex: '0 0 auto' }}>
        <button
          type="button"
          className="btn btn-secondary analytics-refresh-btn"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={UI_LABELS.ANALYTICS.REFRESH_BTN}
        >
          {refreshing ? UI_LABELS.ANALYTICS.REFRESHING_BTN : UI_LABELS.ANALYTICS.REFRESH_BTN}
        </button>
      </div>
    </div>
  );
}
