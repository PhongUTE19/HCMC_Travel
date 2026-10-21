const request = async (url, options = {}) => {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed.');
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
