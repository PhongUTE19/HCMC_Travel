import * as userService from '../services/userService.js';
import { SERVER_MESSAGES, HTTP_STATUS } from '../constants/index.js';

function handleError(res, error) {
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({ error: error.message || SERVER_MESSAGES.ERRORS.CHAT_PROCESSING_FAILED });
}

/**
 * Handles user chat POST requests:
 * POST /api/user/chat
 */
export async function chat(req, res) {
  try {
    const { message } = req.body;
    const result = await userService.processChat(message);
    res.json(result);
  } catch (error) {
    console.error('[UserController] Chat error:', error.message);
    handleError(res, error);
  }
}
