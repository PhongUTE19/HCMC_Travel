import React from 'react';
import AnalyticsFilters from './AnalyticsFilters';
import AnalyticsKpiCards from './AnalyticsKpiCards';
import AnalyticsCharts from './AnalyticsCharts';
import AnalyticsHistoryTable from './AnalyticsHistoryTable';
import { useAnalytics } from '../../../hooks';
import { UI_LABELS } from '../../../constants';

export default function AdminAnalyticsDashboard() {
  const {
    filters,
    setFilters,
    loading,
    refreshing,
    error,
    overview,
    timeseries,
    breakdown,
    historyData,
    refresh,
  } = useAnalytics();

  const isDurable = overview?.persistence?.isDurable;

  return (
    <div className="analytics-container">
      {/* 1. Header with Persistence Status */}
      <div className="analytics-header">
        <div className="analytics-title-group">
          <h3 className="analytics-title">{UI_LABELS.ANALYTICS.TITLE}</h3>
          <p className="analytics-subtitle">{UI_LABELS.ANALYTICS.SUBTITLE}</p>
        </div>
        <div className="analytics-header-actions">
          <span
            className={`analytics-persistence-badge ${isDurable ? 'analytics-persistence-badge--durable' : 'analytics-persistence-badge--memory'
              }`}
            title={
              isDurable
                ? 'Analytics records are stored persistently in Supabase'
                : 'Using in-memory buffer. Set SUPABASE_URL and SUPABASE_SECRET_KEY to enable persistent storage'
            }
          >
            {isDurable ? UI_LABELS.ANALYTICS.PERSISTENCE_SUPABASE : UI_LABELS.ANALYTICS.PERSISTENCE_MEMORY}
          </span>
        </div>
      </div>

      {/* 2. Filter Toolbar */}
      <AnalyticsFilters
        filters={filters}
        onChange={setFilters}
        onRefresh={refresh}
        refreshing={refreshing}
      />

      {/* Error state */}
      {error && (
        <div className="alert alert-error" role="alert">
          <span>{UI_LABELS.COMMON.ERROR_PREFIX}{error}</span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: 'auto', padding: '2px 8px' }}
            onClick={refresh}
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. KPI Metrics */}
      <AnalyticsKpiCards overview={overview} />

      {/* 4. Visualizations */}
      <AnalyticsCharts timeseries={timeseries} breakdown={breakdown} />

      {/* 5. Request History */}
      <AnalyticsHistoryTable
        historyData={historyData}
        filters={filters}
        onChangeFilters={setFilters}
        loading={loading || refreshing}
      />
    </div>
  );
}
