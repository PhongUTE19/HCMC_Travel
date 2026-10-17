import React from 'react';
import { UI_LABELS } from '../constants';

export default function SuccessMessage({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="status-msg success-msg">
      <span>{UI_LABELS.COMMON.SUCCESS_PREFIX}{message}</span>
      {onDismiss && (
        <button className="dismiss-btn" onClick={onDismiss} title={UI_LABELS.COMMON.DISMISS}>
          {UI_LABELS.COMMON.CLOSE}
        </button>
      )}
    </div>
  );
}
