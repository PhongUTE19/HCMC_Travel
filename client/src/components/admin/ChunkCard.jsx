import React, { useState } from 'react';
import { UI_LABELS } from '../../constants';

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
          {isExpanded ? UI_LABELS.COMMON.COLLAPSE : UI_LABELS.COMMON.EXPAND}
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
