import React from 'react';
import ChunkCard from './ChunkCard';
import { UI_LABELS, PAGINATION } from '../../constants';

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
          <h3 className="panel-title">{UI_LABELS.CHUNK_REVIEW.TITLE} ({totalChunks})</h3>
          <span className="panel-subtitle">
            {UI_LABELS.CHUNK_REVIEW.SUBTITLE}
          </span>
        </div>
        <div className="panel-search-bar">
          <input
            type="text"
            className="search-input"
            placeholder={UI_LABELS.CHUNK_REVIEW.SEARCH_PLACEHOLDER}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Pagination Controls Bar */}
      <div className="chunk-pagination-bar">
        <div className="pagination-info">
          <span>
            {UI_LABELS.CHUNK_REVIEW.SHOWING} <strong>{startIdx}–{endIdx}</strong> {UI_LABELS.CHUNK_REVIEW.OF} <strong>{totalChunks}</strong> {UI_LABELS.CHUNK_REVIEW.CHUNKS}
          </span>
          <div className="page-size-selector">
            <label htmlFor="limit-select">{UI_LABELS.CHUNK_REVIEW.PER_PAGE}</label>
            <select
              id="limit-select"
              className="page-size-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              {PAGINATION.OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pagination-nav-actions">
          <button
            className="btn btn-secondary btn-sm"
            disabled={offset === 0 || loading}
            onClick={onPrevPage}
            title={UI_LABELS.CHUNK_REVIEW.PREVIOUS_TITLE}
          >
            {UI_LABELS.CHUNK_REVIEW.PREVIOUS}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={!hasMore || loading}
            onClick={onNextPage}
            title={UI_LABELS.CHUNK_REVIEW.NEXT_TITLE}
          >
            {UI_LABELS.CHUNK_REVIEW.NEXT}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <span className="spinner"></span> {UI_LABELS.CHUNK_REVIEW.LOADING_CHUNKS}
        </div>
      ) : chunks.length === 0 ? (
        <div className="empty-state">
          {searchQuery
            ? UI_LABELS.CHUNK_REVIEW.NO_MATCHING_CHUNKS
            : UI_LABELS.CHUNK_REVIEW.NO_CHUNKS_AVAILABLE}
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
