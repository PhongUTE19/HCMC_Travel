import React, { useState } from 'react';

export default function ChunkCard({ chunk }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="chunk-card">
      <div className="chunk-card-header">
        <div className="chunk-card-title-group">
          <span className="chunk-id-badge">{chunk.id}</span>
          <span className="chunk-source-badge">{chunk.source}</span>
          <h4 className="chunk-title">{chunk.title}</h4>
        </div>
        <button
          className="btn-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <div className="chunk-card-body">
        <p className={`chunk-content ${isExpanded ? 'expanded' : ''}`}>
          {chunk.content}
        </p>
      </div>
    </div>
  );
}
