import React, { useState } from 'react';
import ChatForm from './ChatForm';
import AnswerSection from './AnswerSection';
import ErrorMessage from '../ErrorMessage';
import { sendChatMessage } from '../../services/userApi';
import { SAMPLE_QUESTIONS, UI_LABELS, APP_MESSAGES } from '../../constants';

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
      setError(err.message || APP_MESSAGES.ERROR.CHAT_COMMUNICATION_FAILED);
      setAnswerData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-main">
      <div className="sample-chips">
        <span className="chips-label">{UI_LABELS.USER_CHAT.QUICK_TEST}</span>
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
          <span className="spinner"></span> {UI_LABELS.USER_CHAT.THINKING_MESSAGE}
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
