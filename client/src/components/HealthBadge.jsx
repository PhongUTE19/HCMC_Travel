import React from 'react';
import { UI_LABELS } from '../constants';

export default function HealthBadge({ status, indexedChunks, loading, error }) {
  if (loading) {
    return (
      <div className="badge">
        {UI_LABELS.HEALTH.CHECKING}
      </div>
    );
  }

  if (error) {
    return (
      <div className="badge">
        {UI_LABELS.HEALTH.OFFLINE}
      </div>
    );
  }

  return (
    <div className="badge">
      {UI_LABELS.HEALTH.ONLINE_PREFIX}{indexedChunks}{UI_LABELS.HEALTH.INDEXED_CHUNKS_SUFFIX}
    </div>
  );
}
