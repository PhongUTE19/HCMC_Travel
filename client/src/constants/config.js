export const USER_ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

export const STATUS_KEYS = Object.freeze({
  OK: 'ok',
  ERROR: 'error',
});

export const FILE_EXTENSIONS = Object.freeze({
  MARKDOWN: '.md',
});

export const PAGINATION = Object.freeze({
  DEFAULT_LIMIT: 10,
  DEFAULT_OFFSET: 0,
  OPTIONS: [10, 30, 50],
});

export const API_ENDPOINTS = Object.freeze({
  HEALTH: '/api/health',
  USER_CHAT: '/api/user/chat',
  ADMIN_STATUS: '/api/admin/status',
  ADMIN_DOCUMENTS: '/api/admin/documents',
  ADMIN_CHUNKS: '/api/admin/chunks',
  ADMIN_INDEX: '/api/admin/index',
  ADMIN_PROMPT: '/api/admin/prompt',
});

export const HTTP_METHODS = Object.freeze({
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
});

export const ADMIN_PANELS = Object.freeze({
  DOCUMENTS: 'documents',
  CHUNKS: 'chunks',
  PROMPT: 'prompt',
});

export const TOAST_TYPES = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
});

export const TOAST_DURATIONS = Object.freeze({
  SUCCESS: 4000,
  INFO: 4000,
  WARNING: 6000,
  ERROR: 8000,
});
