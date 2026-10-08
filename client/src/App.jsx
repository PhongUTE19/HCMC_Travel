import React, { useState, useEffect } from 'react';
import HealthBadge from './components/HealthBadge';
import ChatForm from './components/ChatForm';
import AnswerSection from './components/AnswerSection';
import ErrorMessage from './components/ErrorMessage';
import { fetchHealth, sendChatMessage } from './services/api';

export default function App() {
  const [health, setHealth] = useState({
    status: '',
    indexedChunks: 0,
    loading: true,
    error: null,
  });

  const [loading, setLoading] = useState(false);
  const [answerData, setAnswerData] = useState(null);
  const [error, setError] = useState(null);

  // Check backend health on initial load
  useEffect(() => {
    fetchHealth()
      .then((data) => {
        setHealth({
          status: data.status,
          indexedChunks: data.indexedChunks,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        setHealth({
          status: 'error',
          indexedChunks: 0,
          loading: false,
          error: err.message,
        });
      });
  }, []);

  const handleSendMessage = async (message) => {
    setError(null);
    setLoading(true);

    try {
      const data = await sendChatMessage(message);
      setAnswerData(data);
    } catch (err) {
      setError(err.message || 'Failed to communicate with assistant.');
      setAnswerData(null);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'What is Ben Thanh Market?',
    'Where can I eat Com Tam broken rice?',
    'What is linear algebra?',
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">HCMC Travel Assistant</h1>
        <p className="app-subtitle">
          React Frontend with Local RAG & Google Gemini
        </p>
        <HealthBadge
          status={health.status}
          indexedChunks={health.indexedChunks}
          loading={health.loading}
          error={health.error}
        />
      </header>

      <main className="app-main">
        <div className="sample-chips">
          <span className="chips-label">Quick test:</span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              className="chip-btn"
              disabled={loading}
              onClick={() => handleSendMessage(q)}
            >
              {q}
            </button>
          ))}
        </div>

        <ChatForm onSubmit={handleSendMessage} loading={loading} />

        {loading && (
          <div className="status-msg loading-msg">
            <span className="spinner"></span> Thinking... Retrieving context and generating response...
          </div>
        )}

        <ErrorMessage message={error} />

        {answerData && (
          <AnswerSection
            answer={answerData.answer}
            sources={answerData.sources}
          />
        )}
      </main>
    </div>
  );
}