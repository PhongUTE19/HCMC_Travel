import React, { useState } from 'react';

function RetrievedChunkItem({ chunk, threshold }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayTitle =
    chunk.title ||
    (chunk.sectionNumber
      ? `Section ${chunk.sectionNumber}: ${chunk.sectionTitle}`
      : 'Handbook Section');

  return (
    <div className={`chunk-card ${chunk.passedToLLM ? 'chunk-card-passed' : 'chunk-card-filtered'}`}>
      <div className="chunk-card-header">
        <div className="chunk-card-title-group">
          <span className="chunk-rank-badge" title="Retriever rank">#{chunk.rank}</span>
          <span className="chunk-id-badge" title="Chunk identifier">{chunk.id}</span>
          <span className="chunk-source-badge" title="Source document">{chunk.source}</span>
          {chunk.passedToLLM ? (
            <span className="chunk-status-badge status-passed" title="Passed to LLM generation context">
              ✓ Passed to LLM
            </span>
          ) : (
            <span className="chunk-status-badge status-filtered" title={`Filtered out by similarity threshold (< ${threshold})`}>
              ✕ Filtered out (&lt; {threshold})
            </span>
          )}
          {chunk.score !== undefined && (
            <span className="chunk-score-badge" title="Cosine similarity score">
              Score: {typeof chunk.score === 'number' ? chunk.score.toFixed(4) : chunk.score}
            </span>
          )}
          <h4 className="chunk-title">{displayTitle}</h4>
        </div>
        <button
          type="button"
          className="btn-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'Expand content'}
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
      <h3 className="answer-title">Assistant Response</h3>
      <div className="answer-content">
        <p className="answer-text">{answer}</p>
      </div>

      {/* Supporting Sources List (used in answer) */}
      {sources && sources.length > 0 && (
        <div className="sources-container">
          <h4 className="sources-title">Supporting Sources & Evidence:</h4>
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

              const displayTitle =
                src.title ||
                (src.sectionNumber
                  ? `Section ${src.sectionNumber}: ${src.sectionTitle}`
                  : 'Handbook Section');
              const docName = src.source || 'Student Handbook';
              const chunkId = src.id;

              return (
                <li key={index} className="source-item">
                  <span className="source-badge">[{index + 1}]</span>
                  <span className="source-title"><strong>{displayTitle}</strong></span>
                  <span className="source-meta">({docName}{chunkId ? ` • ${chunkId}` : ''})</span>
                  {src.score !== undefined && (
                    <span className="source-score" title="Cosine Similarity Score">
                      {typeof src.score === 'number' ? src.score.toFixed(4) : src.score}
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
            {showChunks ? '▼ Hide retrieved chunks' : `▶ Show retrieved chunks (${retrievedChunks.length})`}
          </button>
          {retrieval && (
            <span className="diagnostics-pill">
              Retrieved: <strong>{retrievedChunks.length}</strong> | Passed to LLM: <strong>{usedChunks.length}</strong> | Threshold: <strong>{threshold}</strong>
            </span>
          )}
        </div>

        {showChunks && (
          <div className="diagnostics-panel" id="retrieval-diagnostics-panel">
            {hasRetrievalError ? (
              <div className="retrieval-error-banner" role="alert">
                <strong>Retrieval Failure:</strong> {retrieval.error}
              </div>
            ) : retrievedChunks.length === 0 ? (
              <div className="retrieval-empty-banner">
                No chunks were retrieved from the knowledge base for this question.
              </div>
            ) : (
              <>
                <div className="diagnostics-summary-bar">
                  <span><strong>Candidate Pool:</strong> {retrievedChunks.length} chunks</span>
                  <span><strong>Threshold:</strong> {threshold}</span>
                  {bestScore !== undefined && (
                    <span><strong>Top Similarity Score:</strong> {typeof bestScore === 'number' ? bestScore.toFixed(4) : bestScore}</span>
                  )}
                  <span>
                    <strong>Status:</strong> {usedChunks.length > 0 ? 'Passed to LLM generation' : 'Filtered out before generation'}
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
