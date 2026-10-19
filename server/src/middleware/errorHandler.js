import { HTTP_STATUS, SERVER_MESSAGES } from '../constants/index.js';

/**
 * Express-compatible centralized error-handling middleware.
 * 
 * Invariants:
 * 1. Checks `res.headersSent` to avoid writing headers after an SSE stream has begun.
 * 2. Maps operational AppErrors to their declared HTTP status codes.
 * 3. Sanitizes unexpected internal (5xx) errors so internal infrastructure,
 *    stack traces, or provider secrets are never leaked to clients.
 * 4. Consistently formats JSON errors as `{ error: message }`.
 * 
 * @param {Error} err - Captured exception
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export function errorHandler(err, req, res, next) {
  // If headers have already been sent (e.g. during active SSE streaming),
  // delegate to Express default handler to terminate the socket safely.
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || (typeof err.status === 'number' ? err.status : HTTP_STATUS.INTERNAL_SERVER_ERROR);
  const isOperational = err.isOperational === true || (statusCode >= 400 && statusCode < 500);

  // Log unexpected internal errors only (avoiding log noise on standard client validation errors)
  if (statusCode >= 500 && !err.isOperational) {
    console.error(`[ErrorHandler] Unexpected internal error on ${req.method} ${req.originalUrl}:`, err.message);
  }

  // Safe client response message
  const clientMessage = isOperational
    ? (err.message || SERVER_MESSAGES.ERRORS.UNEXPECTED)
    : SERVER_MESSAGES.ERRORS.UNEXPECTED;

  res.status(statusCode).json({
    error: clientMessage,
  });
}
