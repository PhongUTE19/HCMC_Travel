import { HTTP_STATUS } from '../../constants/index.js';

/**
 * Base Application Error class.
 * Provides unified HTTP status mapping, operational error discrimination,
 * and clean stack capture across all domain services.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error description
   * @param {number} [statusCode=HTTP_STATUS.INTERNAL_SERVER_ERROR] - HTTP status code
   * @param {boolean} [isOperational=true] - Whether this is an expected operational error
   */
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Operational error thrown when request validation fails.
 */
export class ValidationError extends AppError {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
    super(message, statusCode);
  }
}

/**
 * Operational error thrown when a requested route or entity is not found (404).
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.', statusCode = HTTP_STATUS.NOT_FOUND) {
    super(message, statusCode);
  }
}

/**
 * Operational error thrown when authentication credentials are required or invalid (401).
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.', statusCode = HTTP_STATUS.UNAUTHORIZED) {
    super(message, statusCode);
  }
}

/**
 * Operational error thrown when an authenticated user lacks permission for a resource (403).
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden.', statusCode = HTTP_STATUS.FORBIDDEN) {
    super(message, statusCode);
  }
}

/**
 * Operational error thrown when request rate limits are exceeded (429).
 */
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests.', statusCode = HTTP_STATUS.TOO_MANY_REQUESTS) {
    super(message, statusCode);
  }
}
