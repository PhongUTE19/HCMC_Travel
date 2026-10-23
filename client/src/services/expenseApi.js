import { getAccessToken, signOut } from './supabaseAuth';

const request = async (url, options = {}) => {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      await signOut();
      window.dispatchEvent(new CustomEvent('spendwise:unauthorized'));
    }
    throw new Error(body.error || 'Request failed.');
  }
  return body;
};
export const expenseApi = {
  // Bỏ query rỗng vì backend enum chỉ nhận giá trị filter hợp lệ.
  list: (query) => {
    const populatedQuery = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== '' && value !== undefined && value !== null),
    );
    return request(`/api/transactions?${new URLSearchParams(populatedQuery)}`);
  },
  create: (data) => request('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/transactions/${id}`, { method: 'DELETE' }),
  upload: (file) => request('/api/receipts/upload', { method: 'POST', body: JSON.stringify({ filename: file.name, mimeType: file.type, size: file.size }) }),
};
