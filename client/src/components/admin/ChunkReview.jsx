import React from 'react';
import ChunkCard from './ChunkCard';

export default function ChunkReview({
  chunks,
  totalChunks,
  limit,
  offset,
  hasMore,
  searchQuery,
  loading,
  onSearchChange,
  onLimitChange,
  onPrevPage,
  onNextPage,
}) {
  const startIdx = totalChunks === 0 ? 0 : offset + 1;
  const endIdx = totalChunks === 0 ? 0 : Math.min(offset + chunks.length, totalChunks);

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Indexed Chunk Review ({totalChunks})</h3>
          <span className="panel-subtitle">
            Inspect how documents are chunked by "## " headers before vectorization.
          </span>
        </div>
        <div className="panel-search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search chunks by title, source, or text..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Pagination Controls Bar */}
      <div className="chunk-pagination-bar">
        <div className="pagination-info">
          <span>
            Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{totalChunks}</strong> chunks
          </span>
          <div className="page-size-selector">
            <label htmlFor="limit-select">Per page:</label>
            <select
              id="limit-select"
              className="page-size-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="pagination-nav-actions">
          <button
            className="btn btn-secondary btn-sm"
            disabled={offset === 0 || loading}
            onClick={onPrevPage}
            title="Load previous batch of chunks"
          >
            ← Previous
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={!hasMore || loading}
            onClick={onNextPage}
            title="Load next batch of chunks"
          >
            Next →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <span className="spinner"></span> Loading chunks...
        </div>
      ) : chunks.length === 0 ? (
        <div className="empty-state">
          {searchQuery
            ? 'No chunks match the search filter.'
            : 'No chunks available in knowledge base.'}
        </div>
      ) : (
        <div className="chunks-list">
          {chunks.map((chunk) => (
            <ChunkCard key={chunk.id} chunk={chunk} />
          ))}
        </div>
      )}
    </div>
  );
}
