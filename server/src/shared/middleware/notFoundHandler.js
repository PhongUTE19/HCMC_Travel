import { NotFoundError } from '../errors/index.js';

/**
 * Centralized 404 handler for unmatched routes.
 * Emits a structured NotFoundError to the centralized error middleware.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}
