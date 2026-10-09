import React, { useState, useEffect } from 'react';
import HealthBadge from './components/HealthBadge';
import UserChatView from './components/user/UserChatView';
import AdminDashboard from './components/admin/AdminDashboard';
import { fetchHealth } from './services/userApi';

export default function App() {
  const [role, setRole] = useState('user'); // 'user' | 'admin'
  const [health, setHealth] = useState({
    status: '',
    indexedChunks: 0,
    loading: true,
    error: null,
  });

  // Check backend health on initial load or role switch
  const checkHealth = () => {
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
  };

  useEffect(() => {
    checkHealth();
  }, [role]);

  return (
    <div className={`app-container ${role === 'admin' ? 'app-container--admin' : ''}`}>
      <header className="app-header">
        <div className="header-top-row">
          <div>
            <h1 className="app-title">Student Handbook Assistant</h1>
            <p className="app-subtitle">
              {role === 'user'
                ? 'React Frontend with RAG & Google Gemini'
                : 'Admin Knowledge Base Manager'}
            </p>
          </div>
          <div className="header-actions">
            <button
              id="role-switch-btn"
              className={`role-switch-btn ${role === 'admin' ? 'role-switch-btn--admin' : ''}`}
              onClick={() => {
                setRole(role === 'user' ? 'admin' : 'user');
              }}
              title={role === 'user' ? 'Switch to Knowledge Management' : 'Switch back to Chat Interface'}
            >
              {role === 'user' ? '⚙ Switch to Admin' : '💬 Switch to User'}
            </button>
          </div>
        </div>

        <HealthBadge
          status={health.status}
          indexedChunks={health.indexedChunks}
          loading={health.loading}
          error={health.error}
        />
      </header>

      {role === 'user' ? <UserChatView /> : <AdminDashboard />}
    </div>
  );
}