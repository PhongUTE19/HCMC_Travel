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
