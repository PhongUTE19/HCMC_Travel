import React, { useState } from 'react';
import { UI_LABELS } from '../../constants';
import { formatSectionTitle, formatScore } from '../../utils/formatters';

function RetrievedChunkItem({ chunk, threshold }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayTitle = formatSectionTitle(chunk);

  return (
    <div className={`chunk-card ${chunk.passedToLLM ? 'chunk-card-passed' : 'chunk-card-filtered'}`}>
      <div className="chunk-card-header">
        <div className="chunk-card-title-group">
          <span className="chunk-rank-badge" title={UI_LABELS.ANSWER_SECTION.RETRIEVER_RANK_TITLE}>#{chunk.rank}</span>
          <span className="chunk-id-badge" title={UI_LABELS.ANSWER_SECTION.CHUNK_ID_TITLE}>{chunk.id}</span>
          <span className="chunk-source-badge" title={UI_LABELS.ANSWER_SECTION.SOURCE_DOC_TITLE}>{chunk.source}</span>
          {chunk.passedToLLM ? (
            <span className="chunk-status-badge status-passed" title={UI_LABELS.ANSWER_SECTION.PASSED_TO_LLM_TITLE}>
              {UI_LABELS.ANSWER_SECTION.PASSED_TO_LLM_BADGE}
            </span>
          ) : (
            <span className="chunk-status-badge status-filtered" title={UI_LABELS.ANSWER_SECTION.FILTERED_OUT_TITLE(threshold)}>
              {UI_LABELS.ANSWER_SECTION.FILTERED_OUT_BADGE(threshold)}
            </span>
          )}
          {chunk.score !== undefined && (
            <span className="chunk-score-badge" title={UI_LABELS.ANSWER_SECTION.COSINE_SCORE_TITLE}>
              {UI_LABELS.ANSWER_SECTION.SCORE_LABEL}{formatScore(chunk.score)}
            </span>
          )}
          <h4 className="chunk-title">{displayTitle}</h4>
        </div>
        <button
          type="button"
          className="btn-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? UI_LABELS.COMMON.COLLAPSE : UI_LABELS.ANSWER_SECTION.EXPAND_CONTENT}
        </button>
      </div>
      <div className="chunk-card-body">
        <pre className={`chunk-content-text ${isExpanded ? 'expanded' : 'collapsed'}`}>
          {chunk.content}
        </pre>
      </div>
    </div>
  );
}

export default function AnswerSection({ answer, sources, retrieval }) {
  const [showChunks, setShowChunks] = useState(false);

  if (!answer) return null;

  const retrievedChunks = retrieval?.retrievedChunks || [];
  const usedChunks = retrieval?.usedChunks || [];
  const threshold = retrieval?.similarityThreshold ?? 0.6;
  const bestScore = retrieval?.bestScore;
  const hasRetrievalError = Boolean(retrieval?.error);

  return (
    <div className="answer-section">
      <h3 className="answer-title">{UI_LABELS.ANSWER_SECTION.ASSISTANT_RESPONSE}</h3>
      <div className="answer-content">
        <p className="answer-text">{answer}</p>
      </div>

      {/* Supporting Sources List (used in answer) */}
      {sources && sources.length > 0 && (
        <div className="sources-container">
          <h4 className="sources-title">{UI_LABELS.ANSWER_SECTION.SUPPORTING_SOURCES}</h4>
          <ul className="sources-list">
            {sources.map((src, index) => {
              if (typeof src === 'string') {
                return (
                  <li key={index} className="source-item">
                    <span className="source-badge">[{index + 1}]</span>
                    <span>{src}</span>
                  </li>
                );
              }

              const displayTitle = formatSectionTitle(src);
              const docName = src.source || UI_LABELS.ANSWER_SECTION.DEFAULT_DOC_NAME;
              const chunkId = src.id;

              return (
                <li key={index} className="source-item">
                  <span className="source-badge">[{index + 1}]</span>
                  <span className="source-title"><strong>{displayTitle}</strong></span>
                  <span className="source-meta">({docName}{chunkId ? ` • ${chunkId}` : ''})</span>
                  {src.score !== undefined && (
                    <span className="source-score" title={UI_LABELS.ANSWER_SECTION.COSINE_SCORE_TITLE}>
                      {formatScore(src.score)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Diagnostics / Retrieved Chunks Inspection Control */}
      <div className="retrieval-diagnostics">
        <div className="diagnostics-header">
          <button
            type="button"
            id="toggle-retrieved-chunks-btn"
            className="btn-toggle-diagnostics"
            onClick={() => setShowChunks(!showChunks)}
          >
            {showChunks ? UI_LABELS.ANSWER_SECTION.HIDE_CHUNKS : UI_LABELS.ANSWER_SECTION.SHOW_CHUNKS(retrievedChunks.length)}
          </button>
          {retrieval && (
            <span className="diagnostics-pill">
              {UI_LABELS.ANSWER_SECTION.RETRIEVED_LABEL}<strong>{retrievedChunks.length}</strong> | {UI_LABELS.ANSWER_SECTION.PASSED_TO_LLM_LABEL}<strong>{usedChunks.length}</strong> | {UI_LABELS.ANSWER_SECTION.THRESHOLD_LABEL}<strong>{threshold}</strong>
            </span>
          )}
        </div>

        {showChunks && (
          <div className="diagnostics-panel" id="retrieval-diagnostics-panel">
            {hasRetrievalError ? (
              <div className="retrieval-error-banner" role="alert">
                <strong>{UI_LABELS.ANSWER_SECTION.RETRIEVAL_FAILURE}</strong> {retrieval.error}
              </div>
            ) : retrievedChunks.length === 0 ? (
              <div className="retrieval-empty-banner">
                {UI_LABELS.ANSWER_SECTION.NO_CHUNKS_RETRIEVED}
              </div>
            ) : (
              <>
                <div className="diagnostics-summary-bar">
                  <span><strong>{UI_LABELS.ANSWER_SECTION.CANDIDATE_POOL}</strong> {retrievedChunks.length}{UI_LABELS.ANSWER_SECTION.CHUNKS_SUFFIX}</span>
                  <span><strong>{UI_LABELS.ANSWER_SECTION.THRESHOLD_LABEL}</strong> {threshold}</span>
                  {bestScore !== undefined && (
                    <span><strong>{UI_LABELS.ANSWER_SECTION.TOP_SIMILARITY_SCORE}</strong> {formatScore(bestScore)}</span>
                  )}
                  <span>
                    <strong>{UI_LABELS.ANSWER_SECTION.STATUS_LABEL}</strong> {usedChunks.length > 0 ? UI_LABELS.ANSWER_SECTION.STATUS_PASSED : UI_LABELS.ANSWER_SECTION.STATUS_FILTERED}
                  </span>
                </div>

                <div className="chunks-list">
                  {retrievedChunks.map((chunk) => (
                    <RetrievedChunkItem
                      key={chunk.id || chunk.rank}
                      chunk={chunk}
                      threshold={threshold}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
