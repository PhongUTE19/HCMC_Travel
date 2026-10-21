import { ForbiddenError, UnauthorizedError } from '../errors/index.js';

/**
 * Authorization middleware factory.
 * Enforces role-based or permission-based access control using verified `req.user` context.
 *
 * @param {...string} allowedRoles - Roles permitted to access the route (e.g. 'admin', 'user')
 * @returns {import('express').RequestHandler}
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required prior to authorization check.'));
    }

    const userRole = req.user.role;
    if (!userRole || (allowedRoles.length > 0 && !allowedRoles.includes(userRole))) {
      return next(new ForbiddenError('You do not have permission to access this resource.'));
    }

    next();
  };
}

export const requireRole = authorize;
