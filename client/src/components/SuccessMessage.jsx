import React from 'react';

export default function SuccessMessage({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="status-msg success-msg">
      <span>✓ {message}</span>
      {onDismiss && (
        <button className="dismiss-btn" onClick={onDismiss} title="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
