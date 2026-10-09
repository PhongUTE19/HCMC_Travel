import React from 'react';

export default function AnswerSection({ answer, sources }) {
  if (!answer) return null;

  return (
    <div className="answer-section">
      <h3 className="answer-title">Assistant Response</h3>
      <div className="answer-content">
        <p className="answer-text">{answer}</p>
      </div>

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

              const displayTitle = src.title || (src.sectionNumber ? `Section ${src.sectionNumber}: ${src.sectionTitle}` : 'Handbook Section');
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
    </div>
  );
}
