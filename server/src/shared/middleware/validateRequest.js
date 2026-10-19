import { ValidationError } from '../errors/index.js';
import { HTTP_STATUS } from '../../constants/index.js';

export { ValidationError };

/**
 * Validates untrusted input data synchronously against a Zod schema.
 * On failure, throws an operational AppError (defaulting to ValidationError)
 * containing the first human-readable validation error message.
 * 
 * Invariants:
 * 1. Never leaks raw Zod issue objects, stack traces, or credentials to clients.
 * 2. Maps to HTTP 400 Bad Request by default.
 * 3. Supports injecting domain error classes (e.g. ChatOrchestrationError, DocumentServiceError)
 *    to preserve backward compatibility with existing tests and error catchers.
 * 
 * @template T
 * @param {import('zod').ZodType<T>} schema - Zod validation schema
 * @param {unknown} data - Untrusted input data to validate
 * @param {object} [options]
 * @param {new (msg: string, status?: number) => Error} [options.errorClass] - Custom error class to instantiate
 * @returns {T} Validated, sanitized, and parsed data
 */
export function validate(schema, data, options = {}) {
  if (!schema || typeof schema.safeParse !== 'function') {
    throw new TypeError('[Validator] Expected a valid Zod schema with safeParse method.');
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues?.[0];
    const message = firstIssue?.message || 'Invalid input.';
    const ErrorClass = options.errorClass || ValidationError;
    throw new ErrorClass(message, HTTP_STATUS.BAD_REQUEST);
  }
  return result.data;
}

/**
 * Assigns a property to an object if configurable, ignoring errors in mock/restricted environments.
 */
function assignIfWritable(target, property, value) {
  try {
    target[property] = value;
  } catch {
    // Non-configurable property in test/mock environment
  }
}

/**
 * Express middleware factory for validating request body, params, and/or query.
 * Stores validated and parsed data canonically in `res.locals.validated`.
 * Does not mutate `req.query` (which is a getter in Express 5) or create duplicate `req.validated`.
 * 
 * @param {object} schemas
 * @param {import('zod').ZodType} [schemas.body]
 * @param {import('zod').ZodType} [schemas.params]
 * @param {import('zod').ZodType} [schemas.query]
 * @param {object} [options]
 * @param {new (msg: string, status?: number) => Error} [options.errorClass]
 * @returns {import('express').RequestHandler}
 */
export function validateRequest(schemas = {}, options = {}) {
  return (req, res, next) => {
    try {
      res.locals = res.locals || {};
      res.locals.validated = res.locals.validated || {};

      if (schemas.params) {
        const validated = validate(schemas.params, req.params, options);
        res.locals.validated.params = validated;
        assignIfWritable(req, 'params', validated);
      }

      if (schemas.query) {
        // In Express 5, req.query is a getter. Validated query is stored canonically on res.locals.validated.
        res.locals.validated.query = validate(schemas.query, req.query, options);
      }

      if (schemas.body) {
        const validated = validate(schemas.body, req.body, options);
        res.locals.validated.body = validated;
        assignIfWritable(req, 'body', validated);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
