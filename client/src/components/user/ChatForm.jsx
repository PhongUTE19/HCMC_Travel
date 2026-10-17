import React, { useState } from 'react';
import { UI_LABELS } from '../../constants';

export default function ChatForm({ onSubmit, loading }) {
  const [inputMessage, setInputMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;
    onSubmit(inputMessage);
    setInputMessage('');
  };

  return (
    <form className="chat-form" onSubmit={handleSubmit}>
      <div className="input-group">
        <input
          type="text"
          className="chat-input"
          placeholder={UI_LABELS.CHAT_FORM.INPUT_PLACEHOLDER}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="submit-btn"
          disabled={loading || !inputMessage.trim()}
        >
          {UI_LABELS.CHAT_FORM.SEND_BUTTON}
        </button>
      </div>
    </form>
  );
}
