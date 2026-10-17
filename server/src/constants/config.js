/**
 * Server Configuration Constants
 * Centralized repository for operational limits, retries, thresholds, and defaults.
 */

export const STATUS_KEYS = Object.freeze({
  OK: 'ok',
  ERROR: 'error',
});

export const VECTOR_CONFIG = Object.freeze({
  DEFAULT_SIZE: 3072,
  DISTANCE_COSINE: 'Cosine',
});

export const RETRY_CONFIG = Object.freeze({
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1200,
});

export const RETRIEVAL_CONFIG = Object.freeze({
  DEFAULT_TOP_K: 4,
  MIN_CANDIDATE_POOL: 6,
  AMENDMENT_SCORE_THRESHOLD: 0.55,
  SCORE_PRECISION: 4,
});

export const PROMPT_CONSTRAINTS = Object.freeze({
  MIN_LENGTH: 20,
  MAX_LENGTH: 10000,
});

export const PAGINATION_LIMITS = Object.freeze({
  DEFAULT_LIMIT: 10,
  MIN_LIMIT: 1,
  MAX_LIMIT: 50,
  DEFAULT_OFFSET: 0,
});

export const SERVER_CONFIG_DEFAULTS = Object.freeze({
  PORT: 3000,
  DEFAULT_PORT_STR: '3000',
  SIMILARITY_THRESHOLD: 0.60,
  DEFAULT_SIMILARITY_THRESHOLD_STR: '0.60',
  TOP_K: 4,
  DEFAULT_TOP_K_STR: '4',
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  EMBEDDING_MODEL: 'gemini-embedding-001',
  QDRANT_COLLECTION: 'Student_Handbook',
  PLACEHOLDER_KEY: 'your_gemini_api_key_here',
});
