import React, { useState } from 'react';
import { UI_LABELS } from '../../constants';
import { formatSectionTitle, formatScore } from '../../utils/formatters';

function RetrievedChunkItem({ chunk, threshold }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayTitle = formatSectionTitle(chunk);

  return (
    <div className="card">
      <div className="card-header split-layout">
        <div className="row-layout">
          <span className="badge">#{chunk.rank}</span>
          <span className="badge">{chunk.id}</span>
          <span className="badge">{chunk.source}</span>
          <span className="badge">
            {chunk.passedToLLM
              ? UI_LABELS.ANSWER_SECTION.PASSED_TO_LLM_BADGE
              : UI_LABELS.ANSWER_SECTION.FILTERED_OUT_BADGE(threshold)}
          </span>
          {chunk.score !== undefined && (
            <span className="badge">
              {UI_LABELS.ANSWER_SECTION.SCORE_LABEL}{formatScore(chunk.score)}
            </span>
          )}
          <h4 className="card-title">{displayTitle}</h4>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? UI_LABELS.COMMON.COLLAPSE : UI_LABELS.ANSWER_SECTION.EXPAND_CONTENT}
        </button>
      </div>
      <div className="card-body">
        <pre className={`card-content ${isExpanded ? 'expanded' : ''}`}>
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
    <div className="panel">
      <h3 className="panel-title">{UI_LABELS.ANSWER_SECTION.ASSISTANT_RESPONSE}</h3>
      <div className="panel-body">
        <p>{answer}</p>
      </div>

      {/* Supporting Sources List (used in answer) */}
      {sources && sources.length > 0 && (
        <div className="panel-body">
          <h4 className="card-title">{UI_LABELS.ANSWER_SECTION.SUPPORTING_SOURCES}</h4>
          <ul className="card-list">
            {sources.map((src, index) => {
              if (typeof src === 'string') {
                return (
                  <li key={index} className="card">
                    <span className="badge">[{index + 1}]</span>
                    <span>{src}</span>
                  </li>
                );
              }

              const displayTitle = formatSectionTitle(src);
              const docName = src.source || UI_LABELS.ANSWER_SECTION.DEFAULT_DOC_NAME;
              const chunkId = src.id;

              return (
                <li key={index} className="card">
                  <span className="badge">[{index + 1}]</span>
                  <span><strong>{displayTitle}</strong></span>
                  <span>({docName}{chunkId ? ` • ${chunkId}` : ''})</span>
                  {src.score !== undefined && (
                    <span className="badge">
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
      <div className="panel-body">
        <div className="panel-header split-layout">
          <button
            type="button"
            id="toggle-retrieved-chunks-btn"
            className="btn btn-secondary"
            onClick={() => setShowChunks(!showChunks)}
          >
            {showChunks ? UI_LABELS.ANSWER_SECTION.HIDE_CHUNKS : UI_LABELS.ANSWER_SECTION.SHOW_CHUNKS(retrievedChunks.length)}
          </button>
          {retrieval && (
            <span className="badge">
              {UI_LABELS.ANSWER_SECTION.RETRIEVED_LABEL}<strong>{retrievedChunks.length}</strong> | {UI_LABELS.ANSWER_SECTION.PASSED_TO_LLM_LABEL}<strong>{usedChunks.length}</strong> | {UI_LABELS.ANSWER_SECTION.THRESHOLD_LABEL}<strong>{threshold}</strong>
            </span>
          )}
        </div>

        {showChunks && (
          <div className="panel-body" id="retrieval-diagnostics-panel">
            {hasRetrievalError ? (
              <div className="alert alert-error" role="alert">
                <strong>{UI_LABELS.ANSWER_SECTION.RETRIEVAL_FAILURE}</strong> {retrieval.error}
              </div>
            ) : retrievedChunks.length === 0 ? (
              <div className="empty-state">
                {UI_LABELS.ANSWER_SECTION.NO_CHUNKS_RETRIEVED}
              </div>
            ) : (
              <>
                <div className="card-header split-layout">
                  <span><strong>{UI_LABELS.ANSWER_SECTION.CANDIDATE_POOL}</strong> {retrievedChunks.length}{UI_LABELS.ANSWER_SECTION.CHUNKS_SUFFIX}</span>
                  <span><strong>{UI_LABELS.ANSWER_SECTION.THRESHOLD_LABEL}</strong> {threshold}</span>
                  {bestScore !== undefined && (
                    <span><strong>{UI_LABELS.ANSWER_SECTION.TOP_SIMILARITY_SCORE}</strong> {formatScore(bestScore)}</span>
                  )}
                  <span>
                    <strong>{UI_LABELS.ANSWER_SECTION.STATUS_LABEL}</strong> {usedChunks.length > 0 ? UI_LABELS.ANSWER_SECTION.STATUS_PASSED : UI_LABELS.ANSWER_SECTION.STATUS_FILTERED}
                  </span>
                </div>

                <div className="card-list">
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
