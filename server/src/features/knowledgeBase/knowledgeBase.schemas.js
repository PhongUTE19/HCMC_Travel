import { z } from 'zod';
import { PAGINATION_LIMITS } from '../../constants/index.js';

/**
 * Parses integer parameters from query string with defaults and clamping.
 * Preserves exact parseInt semantics, including decimal truncation,
 * partial numeric parsing ("12abc"), negative clamping, and array handling.
 * 
 * @param {unknown} val - Raw query parameter value
 * @param {number} defaultVal - Default integer value
 * @param {number} [minVal] - Minimum bound
 * @param {number} [maxVal] - Maximum bound
 * @returns {number} Clamped integer
 */
export function parseIntegerParam(val, defaultVal, minVal, maxVal) {
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
export function parseSearchParam(q, search) {
  const raw = q !== undefined && q !== '' ? q : search;
  if (raw === undefined || raw === null) return '';
  const val = Array.isArray(raw) ? raw[0] : raw;
  return typeof val === 'string' ? val.trim() : String(val).trim();
}

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
