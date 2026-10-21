import { UnauthorizedError } from '../errors/index.js';

/**
 * Authentication verification middleware.
 * Validates request credentials (e.g. Bearer token in Authorization header)
 * and attaches verified user identity context to `req.user`.
 *
 * Prepared for real authentication provider integration (e.g. Supabase Auth / JWT).
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication token is required.'));
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(new UnauthorizedError('Invalid authentication token format.'));
  }

  // Hook point: verify JWT signature or validate against auth provider session (e.g. supabase.auth.getUser)
  // Example populated user context:
  req.user = {
    token,
    // id, email, role will be populated by the provider integration
  };

  next();
}

/**
 * Optional authentication middleware.
 * Attaches user identity to `req.user` if a valid Bearer token is present,
 * without rejecting unauthenticated requests.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      req.user = { token };
    }
  }
  next();
}
