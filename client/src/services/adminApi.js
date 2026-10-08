/**
 * Admin API service to communicate with Express backend admin endpoints.
 */

export async function fetchAdminStatus() {
  const res = await fetch('/api/admin/status');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch admin status (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function fetchDocuments() {
  const res = await fetch('/api/admin/documents');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch documents (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function fetchDocumentContent(filename) {
  const res = await fetch(`/api/admin/documents/${encodeURIComponent(filename)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch document content (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function saveDocument(filename, content, overwrite = false) {
  const res = await fetch('/api/admin/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filename, content, overwrite }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to save document (HTTP ${res.status})`);
  }
  return data;
}

export async function updateDocument(filename, content) {
  const res = await fetch(`/api/admin/documents/${encodeURIComponent(filename)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to update document (HTTP ${res.status})`);
  }
  return data;
}

export async function deleteDocument(filename) {
  const res = await fetch(`/api/admin/documents/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to delete document (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Fetches parsed markdown chunks with optional pagination and keyword search.
 * @param {Object} options
 * @param {number} [options.limit=10] - Number of items per page (10, 30, 50)
 * @param {number} [options.offset=0] - Offset index for pagination
 * @param {string} [options.search=''] - Keyword search term
 */
export async function fetchChunks({ limit = 10, offset = 0, search = '' } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit.toString());
  if (offset !== undefined) params.set('offset', offset.toString());
  if (search && search.trim()) params.set('q', search.trim());

  const qs = params.toString();
  const url = `/api/admin/chunks${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch chunks (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function triggerIndexing() {
  const res = await fetch('/api/admin/index', {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Indexing failed (HTTP ${res.status})`);
  }
  return data;
}

export async function fetchSystemPrompt() {
  const res = await fetch('/api/admin/prompt');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch system prompt (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function updateSystemPrompt(prompt) {
  const res = await fetch('/api/admin/prompt', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to update system prompt (HTTP ${res.status})`);
  }
  return data;
}
