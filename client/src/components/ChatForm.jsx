import React, { useState } from 'react';

export default function ChatForm({ onSubmit, loading }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSubmit(input);
  };

  return (
    <form className="chat-form" onSubmit={handleSubmit}>
      <div className="input-group">
        <input
          type="text"
          id="message-input"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about HCMC food, landmarks, or attractions..."
          disabled={loading}
          autoComplete="off"
        />
        <button
          type="submit"
          id="submit-btn"
          className="submit-btn"
          disabled={!input.trim() || loading}
        >
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </div>
    </form>
  );
}
