import React, { useState } from 'react';
import ChatForm from './ChatForm';
import AnswerSection from './AnswerSection';
import ErrorMessage from '../ErrorMessage';
import { sendChatMessage } from '../../services/userApi';

const SAMPLE_QUESTIONS = [
  'What is the tuition fee for the Standard Program?',
  'What are the requirements for the Aurora Scholarship?',
  'What is linear algebra?',
];

export default function UserChatView() {
  const [loading, setLoading] = useState(false);
  const [answerData, setAnswerData] = useState(null);
  const [error, setError] = useState(null);

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

  return (
    <main className="app-main">
      <div className="sample-chips">
        <span className="chips-label">Quick test:</span>
        {SAMPLE_QUESTIONS.map((q, idx) => (
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
          retrieval={answerData.retrieval}
        />
      )}
    </main>
  );
}
