import React, { useState } from 'react';
import ChatForm from './ChatForm';
import AnswerSection from './AnswerSection';
import { useToast } from '../../hooks';
import { sendChatMessage } from '../../services/userApi';
import { SAMPLE_QUESTIONS, UI_LABELS, APP_MESSAGES } from '../../constants';

export default function UserChatView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [answerData, setAnswerData] = useState(null);

  const handleSendMessage = async (message) => {
    setLoading(true);

    try {
      const data = await sendChatMessage(message);
      setAnswerData(data);
    } catch (err) {
      toast.error(err.message || APP_MESSAGES.ERROR.CHAT_COMMUNICATION_FAILED);
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
            type="button"
            className="btn btn-chip"
            disabled={loading}
            onClick={() => handleSendMessage(q)}
          >
            {q}
          </button>
        ))}
      </div>

      <ChatForm onSubmit={handleSendMessage} loading={loading} />

      {loading && (
        <div className="alert alert-info">
          <span className="spinner"></span> {UI_LABELS.USER_CHAT.THINKING_MESSAGE}
        </div>
      )}

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
