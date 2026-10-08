import React from 'react';

export default function HealthBadge({ status, indexedChunks, loading, error }) {
  if (loading) {
    return (
      <div className="health-badge health-badge--loading">
        ● Checking server status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-badge health-badge--error">
        ● Server: Offline / Disconnected
      </div>
    );
  }

  return (
    <div className="health-badge health-badge--online">
      ● Server: Online | Memory: {indexedChunks} indexed chunks
    </div>
  );
}
