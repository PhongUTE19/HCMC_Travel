import React, { useState } from 'react';

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
          placeholder="Ask about tuition, programs, scholarships, dorms, or exam rules..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="submit-btn"
          disabled={loading || !inputMessage.trim()}
        >
          Send
        </button>
      </div>
    </form>
  );
}
