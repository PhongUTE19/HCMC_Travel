import React from 'react';
import { useTextReveal } from '../../hooks';

/**
 * Renders the assistant's answer text and streaming cursor with progressive reveal.
 */
export default function AnswerContent({
  answer,
  isStreaming = false,
  isInterrupted = false,
}) {
  const { displayedText, isRevealing } = useTextReveal(answer, {
    isStreaming,
    isInterrupted,
  });

  if (!displayedText && !isStreaming && !isRevealing) return null;

  return (
    <div className="panel-body">
      <p className="message-text">
        {displayedText}
        {isRevealing && <span className="streaming-cursor" aria-hidden="true">▍</span>}
      </p>
    </div>
  );
}
