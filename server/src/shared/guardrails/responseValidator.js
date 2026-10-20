import { SERVER_MESSAGES, GUARDRAIL_CONFIG } from '../../constants/index.js';
import { sanitizeGeneratedOutput } from './promptInjection.js';

export class AIResponseValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'AIResponseValidationError';
    this.details = details;
    this.isOperational = true;
  }
}

export class AIResponseTimeoutError extends Error {
  constructor(message = SERVER_MESSAGES.ERRORS.AI_TIMEOUT, timeoutMs) {
    super(message);
    this.name = 'AIResponseTimeoutError';
    this.timeoutMs = timeoutMs;
    this.isOperational = true;
  }
}

/**
 * Validates a generated chat text response.
 *
 * Checks:
 * 1. Non-empty, non-whitespace content.
 * 2. Minimum length requirements.
 * 3. Sanitizes accidental prompt instruction leakage.
 *
 * @param {string} text - Raw AI response text
 * @param {object} [options]
 * @returns {{ isValid: boolean, answer: string, reason?: string }}
 */
export function validateChatResponse(text, options = {}) {
  if (text === null || text === undefined || typeof text !== 'string') {
    return {
      isValid: false,
      answer: SERVER_MESSAGES.ERRORS.AI_RESPONSE_EMPTY,
      reason: 'MISSING_OR_NULL_RESPONSE',
    };
  }

  const trimmed = text.trim();
  const minLength = options.minLength ?? GUARDRAIL_CONFIG.MIN_ANSWER_LENGTH;

  if (trimmed.length < minLength) {
    return {
      isValid: false,
      answer: SERVER_MESSAGES.ERRORS.AI_RESPONSE_EMPTY,
      reason: 'EMPTY_OR_TOO_SHORT',
    };
  }

  // Check for prompt leakage
  const { isLeaking, sanitizedText } = sanitizeGeneratedOutput(trimmed);
  if (isLeaking) {
    return {
      isValid: false,
      answer: sanitizedText,
      reason: 'SYSTEM_PROMPT_LEAKAGE_DETECTED',
    };
  }

  return {
    isValid: true,
    answer: sanitizedText,
  };
}

/**
 * Safely extracts and validates structured JSON output when an operation explicitly expects JSON.
 * (Ordinary chat responses are NOT forced into JSON).
 *
 * @template T
 * @param {string|object} raw - Raw output string or already parsed object
 * @param {object|Function} [schema] - Zod schema (with safeParse) or validation function
 * @param {object} [options]
 * @param {boolean} [options.throwOnError=false] - Whether to throw on validation error
 * @param {T} [options.fallback=null] - Fallback value if validation fails
 * @returns {{ isValid: boolean, data: T, error?: string }}
 */
export function validateStructuredOutput(raw, schema = null, options = {}) {
  const { throwOnError = false, fallback = null } = options;

  let parsed = null;

  // Handle case where input is already an object
  if (typeof raw === 'object' && raw !== null) {
    parsed = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (throwOnError) {
        throw new AIResponseValidationError('Structured response is empty.');
      }
      return { isValid: false, data: fallback, error: 'EMPTY_CONTENT' };
    }

    // Strip markdown code fences if present (e.g. ```json ... ```)
    let cleaned = trimmed;
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      cleaned = jsonBlockMatch[1].trim();
    }

    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      if (throwOnError) {
        throw new AIResponseValidationError(`Malformed JSON in structured output: ${parseErr.message}`);
      }
      return {
        isValid: false,
        data: fallback,
        error: `MALFORMED_JSON: ${parseErr.message}`,
      };
    }
  } else {
    if (throwOnError) {
      throw new AIResponseValidationError('Invalid structured response format (expected string or object).');
    }
    return { isValid: false, data: fallback, error: 'INVALID_TYPE' };
  }

  // Validate against schema if provided
  if (schema) {
    if (typeof schema.safeParse === 'function') {
      const result = schema.safeParse(parsed);
      if (!result.success) {
        const errorMsg = result.error.errors?.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
          || result.error.message;
        if (throwOnError) {
          throw new AIResponseValidationError(`Schema validation failed: ${errorMsg}`, result.error);
        }
        return {
          isValid: false,
          data: fallback,
          error: `SCHEMA_VALIDATION_FAILED: ${errorMsg}`,
        };
      }
      return { isValid: true, data: result.data };
    } else if (typeof schema === 'function') {
      try {
        const isValid = schema(parsed);
        if (!isValid) {
          if (throwOnError) {
            throw new AIResponseValidationError('Custom schema validator returned false.');
          }
          return { isValid: false, data: fallback, error: 'CUSTOM_VALIDATION_FAILED' };
        }
      } catch (err) {
        if (throwOnError) {
          throw new AIResponseValidationError(`Custom validation error: ${err.message}`);
        }
        return { isValid: false, data: fallback, error: err.message };
      }
    }
  }

  return { isValid: true, data: parsed };
}

/**
 * Wraps a promise with an upper bound timeout.
 *
 * @template T
 * @param {Promise<T>} promise - The async operation
 * @param {number} [timeoutMs=GUARDRAIL_CONFIG.DEFAULT_TIMEOUT_MS]
 * @param {string} [customMessage]
 * @returns {Promise<T>}
 */
export function withTimeout(
  promise,
  timeoutMs = GUARDRAIL_CONFIG.DEFAULT_TIMEOUT_MS,
  customMessage = SERVER_MESSAGES.ERRORS.AI_TIMEOUT
) {
  let timer = null;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new AIResponseTimeoutError(customMessage, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Returns a user-friendly error message, safely masking internal stack traces,
 * API keys, or raw provider errors.
 *
 * @param {Error|any} error
 * @returns {string} Safe user-facing error message
 */
export function formatSafeErrorMessage(error) {
  if (!error) {
    return SERVER_MESSAGES.ERRORS.SERVICE_TEMPORARILY_UNAVAILABLE;
  }

  // If operational domain error, use its clean message
  if (error.isOperational && error.message) {
    return error.message;
  }

  // Timeout error
  if (error instanceof AIResponseTimeoutError || error.name === 'AIResponseTimeoutError') {
    return SERVER_MESSAGES.ERRORS.AI_TIMEOUT;
  }

  // Generic safe fallback for internal/unexpected provider errors
  return SERVER_MESSAGES.ERRORS.SERVICE_TEMPORARILY_UNAVAILABLE;
}
