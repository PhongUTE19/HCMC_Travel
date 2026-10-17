import React from 'react';
import { UI_LABELS } from '../constants';

export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div className="status-msg error-msg" role="alert">
      <strong>{UI_LABELS.COMMON.ERROR_PREFIX}</strong>{message}
    </div>
  );
}
