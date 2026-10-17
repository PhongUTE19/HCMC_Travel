import React from 'react';
import { UI_LABELS } from '../constants';

export default function HealthBadge({ status, indexedChunks, loading, error }) {
  if (loading) {
    return (
      <div className="health-badge health-badge--loading">
        {UI_LABELS.HEALTH.CHECKING}
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-badge health-badge--error">
        {UI_LABELS.HEALTH.OFFLINE}
      </div>
    );
  }

  return (
    <div className="health-badge health-badge--online">
      {UI_LABELS.HEALTH.ONLINE_PREFIX}{indexedChunks}{UI_LABELS.HEALTH.INDEXED_CHUNKS_SUFFIX}
    </div>
  );
}
