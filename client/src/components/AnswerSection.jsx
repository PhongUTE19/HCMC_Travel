import React from 'react';

export default function AnswerSection({ answer, sources }) {
  if (!answer) return null;

  return (
    <div className="answer-section">
      <h3 className="answer-title">Response:</h3>
      <div className="answer-text">{answer}</div>

      {sources && sources.length > 0 && (
        <div className="sources-container">
          <h4 className="sources-title">Retrieved Sources:</h4>
          <ul className="sources-list">
            {sources.map((src, index) => (
              <li key={index} className="source-item">
                <span className="source-badge">📄 {src.title}</span>
                <span className="source-meta">({src.source})</span>
                <span className="source-score">score: {src.score}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
