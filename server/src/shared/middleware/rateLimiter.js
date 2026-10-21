import { rateLimit } from 'express-rate-limit';
import { HTTP_STATUS } from '../../constants/index.js';

/**
 * Creates a rate limiter instance with standardized error format and test-environment bypass.
 *
 * @param {object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests allowed per window per IP
 * @param {string} options.message - Human-readable error message
 * @returns {import('express').RequestHandler}
 */
function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler: (req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        error: message,
      });
    },
  });
}

/**
 * General API rate limiter for standard endpoints.
 * 300 requests per 15 minutes.
 */
export const apiRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests from this IP. Please try again after 15 minutes.',
});

/**
 * Rate limiter for expensive AI chat and streaming endpoints.
 * 30 requests per minute per IP to protect downstream LLM provider quotas.
 */
export const chatRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many chat requests. Please slow down and try again shortly.',
});

/**
 * Rate limiter for expensive knowledge re-indexing endpoints.
 * 10 requests per 15 minutes per IP to protect vector database and embedding operations.
 */
export const indexingRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Knowledge re-indexing requested too frequently. Please try again later.',
});
