import { z } from 'zod';
import {
  SERVER_MESSAGES,
  PROMPT_CONSTRAINTS,
  PAGINATION_LIMITS,
} from '../constants/index.js';

/**
 * Reusable input validation schemas using Zod.
 * Enforces API contracts and boundaries before business logic is invoked.
 */

/**
 * Parses integer parameters from query string with defaults and clamping.
 * Preserves exact pre-Phase-4 parseInt semantics, including decimal truncation,
 * partial numeric parsing ("12abc"), negative clamping, and array handling.
 * 
 * @param {unknown} val - Raw query parameter value
 * @param {number} defaultVal - Default integer value
 * @param {number} [minVal] - Minimum bound
 * @param {number} [maxVal] - Maximum bound
 * @returns {number} Clamped integer
 */
function parseIntegerParam(val, defaultVal, minVal, maxVal) {
  if (val === undefined || val === null) return defaultVal;
  const raw = Array.isArray(val) ? val[0] : val;
  const str = typeof raw === 'string' ? raw.trim() : String(raw);
  if (!str) return defaultVal;
  const parsed = parseInt(str, 10);
  if (isNaN(parsed) || (minVal !== undefined && parsed < minVal)) {
    return defaultVal;
  }
  if (maxVal !== undefined && parsed > maxVal) {
    return maxVal;
  }
  return parsed;
}

/**
 * Resolves search keyword from query parameters ('q' or 'search').
 * 
 * @param {unknown} q - 'q' query parameter
 * @param {unknown} search - 'search' query parameter
 * @returns {string} Trimmed search query string
 */
function parseSearchParam(q, search) {
  const raw = q !== undefined && q !== '' ? q : search;
  if (raw === undefined || raw === null) return '';
  const val = Array.isArray(raw) ? raw[0] : raw;
  return typeof val === 'string' ? val.trim() : String(val).trim();
}

/**
 * Schema for user chat query requests (both synchronous and streaming).
 */
export const chatRequestSchema = z.object({
  message: z.string({
    error: SERVER_MESSAGES.ERRORS.QUERY_REQUIRED,
  })
  .trim()
  .min(1, { error: SERVER_MESSAGES.ERRORS.QUERY_REQUIRED }),
  stream: z.boolean().optional(),
});

/**
 * Schema for document filename parameter and payload.
 * Ensures trimming, .md extension enforcement, path traversal rejection,
 * and alphanumeric/hyphen/underscore format without silently transforming
 * malicious paths into valid filenames.
 */
export const filenameSchema = z.string({
  error: SERVER_MESSAGES.ERRORS.FILENAME_REQUIRED,
})
.trim()
.min(1, { error: SERVER_MESSAGES.ERRORS.FILENAME_REQUIRED })
.refine((val) => !val.includes('/') && !val.includes('\\') && !val.includes('..'), {
  error: SERVER_MESSAGES.ERRORS.INVALID_FILENAME,
})
.transform((val) => (val.endsWith('.md') ? val : `${val}.md`))
.refine((name) => /^[a-zA-Z0-9_\-.]+\.md$/.test(name), {
  error: SERVER_MESSAGES.ERRORS.INVALID_FILENAME,
});

/**
 * Schema for markdown document content.
 * Requires non-empty string and at least one Level-2 section header ('## ').
 */
export const documentContentSchema = z.string({
  error: SERVER_MESSAGES.ERRORS.DOC_CONTENT_EMPTY,
})
.trim()
.min(1, { error: SERVER_MESSAGES.ERRORS.DOC_CONTENT_EMPTY })
.refine((content) => content.split('\n').some((line) => line.startsWith('## ')), {
  error: SERVER_MESSAGES.ERRORS.MISSING_SECTION_HEADER,
});

/**
 * Schema for creating a new document (POST /api/admin/documents).
 */
export const createDocumentSchema = z.object({
  filename: filenameSchema,
  content: documentContentSchema,
  overwrite: z.boolean().optional().default(false),
});

/**
 * Schema for updating an existing document (PUT /api/admin/documents/:filename).
 */
export const updateDocumentSchema = z.object({
  content: documentContentSchema,
});

/**
 * Schema for document path parameters (:filename).
 */
export const documentParamsSchema = z.object({
  filename: filenameSchema,
});

/**
 * Schema for updating the system prompt (PUT /api/admin/prompt).
 * Enforces non-empty string and 20–10,000 character boundaries.
 */
export const updatePromptSchema = z.object({
  prompt: z.string({
    error: SERVER_MESSAGES.ERRORS.PROMPT_EMPTY,
  })
  .trim()
  .min(1, { error: SERVER_MESSAGES.ERRORS.PROMPT_EMPTY })
  .min(PROMPT_CONSTRAINTS.MIN_LENGTH, { error: SERVER_MESSAGES.ERRORS.PROMPT_TOO_SHORT })
  .max(PROMPT_CONSTRAINTS.MAX_LENGTH, { error: SERVER_MESSAGES.ERRORS.PROMPT_TOO_LONG }),
});

/**
 * Schema for chunk pagination and search query parameters (GET /api/admin/chunks).
 * Parses numeric strings from query parameters, applies defaults (limit=10, offset=0),
 * and clamps within allowed bounds (1–50 limit, >=0 offset) preserving pre-Phase-4 semantics.
 */
export const paginationQuerySchema = z.object({
  limit: z.any().optional(),
  offset: z.any().optional(),
  search: z.any().optional(),
  q: z.any().optional(),
}).transform((data) => ({
  limit: parseIntegerParam(
    data.limit,
    PAGINATION_LIMITS.DEFAULT_LIMIT,
    PAGINATION_LIMITS.MIN_LIMIT,
    PAGINATION_LIMITS.MAX_LIMIT
  ),
  offset: parseIntegerParam(
    data.offset,
    PAGINATION_LIMITS.DEFAULT_OFFSET,
    PAGINATION_LIMITS.DEFAULT_OFFSET
  ),
  search: parseSearchParam(data.q, data.search),
}));
