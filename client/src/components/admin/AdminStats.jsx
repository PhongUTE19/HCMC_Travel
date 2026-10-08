import React from 'react';

export default function AdminStats({ status, indexing }) {
  return (
    <div className="admin-stats-grid">
      <div className="stat-card">
        <span className="stat-label">Knowledge Files</span>
        <span className="stat-value">{status ? status.documentCount : '...'}</span>
        <span className="stat-sub">.md documents</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">File Chunks</span>
        <span className="stat-value">{status ? status.totalFileChunks : '...'}</span>
        <span className="stat-sub">Parsed sections</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Qdrant Cloud Vectors</span>
        <span className="stat-value">{status ? status.indexedChunks : '...'}</span>
        <span className="stat-sub">Vector points in DB</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Sync Status</span>
        <span
          className={`stat-badge ${
            status?.isSynced ? 'stat-badge--synced' : 'stat-badge--unsynced'
          }`}
        >
          {indexing
            ? '● Indexing in progress'
            : status?.isSynced
            ? '● In Sync'
            : '● Out of Sync'}
        </span>
        <span className="stat-sub">
          {status?.lastIndexedAt
            ? `Last indexed: ${new Date(status.lastIndexedAt).toLocaleTimeString()}`
            : 'Ready to sync'}
        </span>
      </div>
    </div>
  );
}
