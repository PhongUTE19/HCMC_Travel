import React, { useState, useEffect } from 'react';
import HealthBadge from './components/HealthBadge';
import UserChatView from './components/user/UserChatView';
import AdminDashboard from './components/admin/AdminDashboard';
import { ToastProvider } from './context/ToastContext';
import { fetchHealth } from './services/userApi';
import { USER_ROLES, STATUS_KEYS, UI_LABELS } from './constants';

export default function App() {
  const [role, setRole] = useState(USER_ROLES.USER);
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
          status: STATUS_KEYS.ERROR,
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
    <ToastProvider>
      <div className="app-container">
        <header className="app-header">
          <div className="split-layout">
            <div>
              <h1 className="app-title">{UI_LABELS.APP.TITLE}</h1>
              <p className="app-subtitle">
                {role === USER_ROLES.USER
                  ? UI_LABELS.APP.USER_SUBTITLE
                  : UI_LABELS.APP.ADMIN_SUBTITLE}
              </p>
            </div>
            <div className="row-layout">
              <button
                type="button"
                data-role={role}
                className="btn btn-secondary"
                onClick={() => {
                  setRole(role === USER_ROLES.USER ? USER_ROLES.ADMIN : USER_ROLES.USER);
                }}
                title={role === USER_ROLES.USER ? UI_LABELS.APP.SWITCH_TO_ADMIN_TITLE : UI_LABELS.APP.SWITCH_TO_USER_TITLE}
              >
                {role === USER_ROLES.USER ? UI_LABELS.APP.SWITCH_TO_ADMIN_BTN : UI_LABELS.APP.SWITCH_TO_USER_BTN}
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

        {role === USER_ROLES.USER ? (
          <UserChatView health={health} onRefreshHealth={checkHealth} />
        ) : (
          <AdminDashboard />
        )}
      </div>
    </ToastProvider>
  );
}