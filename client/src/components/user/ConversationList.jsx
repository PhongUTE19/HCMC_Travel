import React, { useRef, useEffect } from 'react';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';
import { UI_LABELS, CHAT_CONFIG } from '../../constants';

/**
 * Renders the ordered list of conversation messages and coordinates auto-scrolling.
 */
export default function ConversationList({
  messages = [],
  showDebug = CHAT_CONFIG.DEFAULT_SHOW_DEBUG,
}) {
  const conversationRef = useRef(null);
  const bottomRef = useRef(null);
  const userScrolledUpRef = useRef(false);

  // Monitor user scroll position: pause following if scrolled up > 60px from bottom
  const handleScroll = () => {
    const el = conversationRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 60;
  };

  // Follow stream output smoothly if user has not scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current && conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [messages]);

  // Follow progressive text reveal updates without scroll jumping
  useEffect(() => {
    const el = conversationRef.current;
    if (!el || typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(() => {
      if (!userScrolledUpRef.current && conversationRef.current) {
        conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
      }
    });

    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="chat-conversation"
      ref={conversationRef}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <div className="empty-state">
          {UI_LABELS.USER_CHAT.EMPTY_STATE}
        </div>
      ) : (
        messages.map((msg) =>
          msg.role === 'user' ? (
            <UserMessage key={msg.id} message={msg} />
          ) : (
            <AssistantMessage
              key={msg.id}
              message={msg}
              showDebug={showDebug}
            />
          )
        )
      )}
      <div ref={bottomRef} style={{ height: '1px' }} />
    </div>
  );
}
