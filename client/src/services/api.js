/**
 * API service to communicate with the Express backend endpoints.
 * Routes are proxied via Vite (/api -> http://localhost:3000/api).
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
  const res = await fetch('/api/chat', {
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