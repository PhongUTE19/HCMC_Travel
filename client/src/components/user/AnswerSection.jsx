import React from 'react';

export default function AnswerSection({ answer, sources }) {
  if (!answer) return null;

  return (
    <div className="answer-section">
      <h3 className="section-title">Assistant Response</h3>
      <div className="answer-content">
        <p>{answer}</p>
      </div>

      {sources && sources.length > 0 && (
        <div className="sources-container">
          <h4 className="sources-title">Retrieved Knowledge Sources:</h4>
          <ul className="sources-list">
            {sources.map((source, index) => (
              <li key={index} className="source-item">
                <span className="source-index">[{index + 1}]</span>
                <span className="source-name">{source}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
