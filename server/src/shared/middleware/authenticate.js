import { UnauthorizedError } from '../errors/index.js';
import { createSupabaseAuthClient } from '../integrations/supabase.js';

let tokenVerifier = null;

function extractBearerToken(authHeader) {
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) {
    throw new UnauthorizedError('Authentication token is required.');
  }
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

async function verifyWithSupabase(token) {
  const client = createSupabaseAuthClient();
  if (!client) {
    throw new UnauthorizedError('Authentication is not configured.');
  }
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new UnauthorizedError('Invalid or expired authentication token.');
  }
  return data.user;
}

async function verifyToken(token) {
  return (tokenVerifier || verifyWithSupabase)(token);
}

function toVerifiedIdentity(user, token) {
  const requestedRole = user.app_metadata?.role;
  // Only a verified app_metadata role may elevate access.  All other users
  // deliberately receive the least-privileged role.
  const role = requestedRole === 'admin' ? 'admin' : 'user';
  return { id: user.id, email: user.email || '', role, token };
}

// Test seam: production always uses Supabase Auth's getUser verification.
export function setTokenVerifierForTests(verifier) {
  tokenVerifier = verifier;
}

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
export async function authenticate(req, res, next) {
  try {
    const token = extractBearerToken(req.headers?.authorization);
    req.user = toVerifiedIdentity(await verifyToken(token), token);
    next();
  } catch (error) {
    next(error instanceof UnauthorizedError ? error : new UnauthorizedError('Invalid or expired authentication token.'));
  }
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
export async function optionalAuthenticate(req, res, next) {
  if (!req.headers?.authorization) return next();
  try {
    const token = extractBearerToken(req.headers.authorization);
    req.user = toVerifiedIdentity(await verifyToken(token), token);
  } catch {
    // Optional auth never turns an otherwise public endpoint into a 401.
  }
  next();
}
