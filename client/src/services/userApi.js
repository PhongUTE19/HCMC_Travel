/**
 * User API service to communicate with Express backend chat and health endpoints.
 */

export async function fetchHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Health check failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function sendChatMessage(message) {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error('Message cannot be empty');
  }
  const res = await fetch('/api/user/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: trimmed }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Server responded with HTTP ${res.status}`);
  }

  return data;
}
