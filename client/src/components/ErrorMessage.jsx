import React from 'react';

export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div className="status-msg error-msg" role="alert">
      <strong>Error: </strong> {message}
    </div>
  );
}
