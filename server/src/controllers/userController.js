import * as userService from '../services/userService.js';

function handleError(res, error) {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({ error: error.message || 'An unexpected error occurred processing your request.' });
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
