/**
 * Admin API service to communicate with Express backend admin endpoints.
 */

import { API_ENDPOINTS, APP_MESSAGES, HTTP_METHODS, PAGINATION } from '../constants';
import { apiRequest, apiJsonRequest } from './apiClient';

export function fetchAdminStatus() {
  return apiRequest(API_ENDPOINTS.ADMIN_STATUS, {}, APP_MESSAGES.API_ERROR.FETCH_STATUS);
}

export function fetchDocuments() {
  return apiRequest(API_ENDPOINTS.ADMIN_DOCUMENTS, {}, APP_MESSAGES.API_ERROR.FETCH_DOCS);
}

export function fetchDocumentContent(filename) {
  const url = `${API_ENDPOINTS.ADMIN_DOCUMENTS}/${encodeURIComponent(filename)}`;
  return apiRequest(url, {}, APP_MESSAGES.API_ERROR.FETCH_DOC_CONTENT);
}

export function saveDocument(filename, content, overwrite = false) {
  return apiJsonRequest(
    API_ENDPOINTS.ADMIN_DOCUMENTS,
    HTTP_METHODS.POST,
    { filename, content, overwrite },
    APP_MESSAGES.API_ERROR.SAVE_DOC
  );
}

export function updateDocument(filename, content) {
  const url = `${API_ENDPOINTS.ADMIN_DOCUMENTS}/${encodeURIComponent(filename)}`;
  return apiJsonRequest(url, HTTP_METHODS.PUT, { content }, APP_MESSAGES.API_ERROR.UPDATE_DOC);
}

export function deleteDocument(filename) {
  const url = `${API_ENDPOINTS.ADMIN_DOCUMENTS}/${encodeURIComponent(filename)}`;
  return apiJsonRequest(url, HTTP_METHODS.DELETE, undefined, APP_MESSAGES.API_ERROR.DELETE_DOC);
}

/**
 * Fetches parsed markdown chunks with optional pagination and keyword search.
 * @param {Object} [options]
 * @param {number} [options.limit=10] - Number of items per page (10, 30, 50)
 * @param {number} [options.offset=0] - Offset index for pagination
 * @param {string} [options.search=''] - Keyword search term
 */
export function fetchChunks({
  limit = PAGINATION.DEFAULT_LIMIT,
  offset = PAGINATION.DEFAULT_OFFSET,
  search = '',
} = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit.toString());
  if (offset !== undefined) params.set('offset', offset.toString());
  if (search && search.trim()) params.set('q', search.trim());

  const qs = params.toString();
  const url = `${API_ENDPOINTS.ADMIN_CHUNKS}${qs ? `?${qs}` : ''}`;
  return apiRequest(url, {}, APP_MESSAGES.API_ERROR.FETCH_CHUNKS);
}

export function triggerIndexing() {
  return apiJsonRequest(API_ENDPOINTS.ADMIN_INDEX, HTTP_METHODS.POST, undefined, APP_MESSAGES.API_ERROR.TRIGGER_INDEX);
}

export function fetchSystemPrompt() {
  return apiRequest(API_ENDPOINTS.ADMIN_PROMPT, {}, APP_MESSAGES.API_ERROR.FETCH_PROMPT);
}

export function updateSystemPrompt(prompt) {
  return apiJsonRequest(
    API_ENDPOINTS.ADMIN_PROMPT,
    HTTP_METHODS.PUT,
    { prompt },
    APP_MESSAGES.API_ERROR.UPDATE_PROMPT
  );
}

export function resetSystemPrompt() {
  return apiJsonRequest(
    API_ENDPOINTS.ADMIN_PROMPT_RESET,
    HTTP_METHODS.POST,
    undefined,
    APP_MESSAGES.API_ERROR.RESET_PROMPT
  );
}
