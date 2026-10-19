import * as knowledgeService from './knowledge.service.js';
import { paginationQuerySchema } from './knowledge.schemas.js';
import { validate } from '../../shared/middleware/validateRequest.js';

/**
 * Retrieves pre-validated request data populated by validation middleware,
 * or falls back to direct schema validation when called in standalone unit tests.
 */
function getValidatedData(res, property, schema, fallbackData, errorClass) {
  return res?.locals?.validated?.[property] || validate(schema, fallbackData, { errorClass });
}

/**
 * GET /api/admin/status
 */
export async function getStatus(req, res, next) {
  try {
    const status = await knowledgeService.getAdminStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/chunks
 */
export async function getChunks(req, res, next) {
  try {
    const params = getValidatedData(res, 'query', paginationQuerySchema, req.query);
    const result = await knowledgeService.getPaginatedChunks(params);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/index
 */
export async function triggerIndexing(req, res, next) {
  try {
    const result = await knowledgeService.executeIndexing();
    res.json({
      success: true,
      message: result.message,
      indexedChunks: result.indexedChunks,
    });
  } catch (error) {
    next(error);
  }
}
