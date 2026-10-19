import { HTTP_STATUS } from '../constants/index.js';

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
