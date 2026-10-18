/**
 * User API service to communicate with Express backend chat and health endpoints.
 */

import { API_ENDPOINTS, APP_MESSAGES, HTTP_METHODS } from '../constants';
import { apiRequest, apiJsonRequest } from './apiClient';

export function fetchHealth() {
  return apiRequest(API_ENDPOINTS.HEALTH, {}, APP_MESSAGES.API_ERROR.HEALTH_CHECK_FAILED);
}

export async function sendChatMessage(message) {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error(APP_MESSAGES.ERROR.MESSAGE_EMPTY);
  }
  return apiJsonRequest(
    API_ENDPOINTS.USER_CHAT,
    HTTP_METHODS.POST,
    { message: trimmed },
    APP_MESSAGES.API_ERROR.SERVER_ERROR
  );
}
