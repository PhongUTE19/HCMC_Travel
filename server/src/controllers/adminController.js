import * as adminService from '../services/adminService.js';
import { HTTP_STATUS } from '../constants/index.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentParamsSchema,
  updatePromptSchema,
  paginationQuerySchema,
  validate,
} from '../validation/index.js';

/**
 * GET /api/admin/status
 */
export async function getStatus(req, res, next) {
  try {
    const status = await adminService.getAdminStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/documents
 */
export async function getDocuments(req, res, next) {
  try {
    const documents = await adminService.listDocuments();
    res.json({ documents });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves pre-validated request data populated by validation middleware,
 * or falls back to direct schema validation when called in standalone unit tests.
 */
function getValidatedData(res, property, schema, fallbackData, errorClass) {
  return res?.locals?.validated?.[property] || validate(schema, fallbackData, { errorClass });
}

/**
 * GET /api/admin/documents/:filename
 */
export async function getDocument(req, res, next) {
  try {
    const { filename } = getValidatedData(res, 'params', documentParamsSchema, req.params, adminService.DocumentServiceError);
    const result = await adminService.readDocument(filename);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/documents
 */
export async function createDocument(req, res, next) {
  try {
    const { filename, content, overwrite } = getValidatedData(res, 'body', createDocumentSchema, req.body, adminService.DocumentServiceError);
    const result = await adminService.saveDocument({ filename, content, overwrite });
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      filename: result.filename,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/documents/:filename
 */
export async function updateDocument(req, res, next) {
  try {
    const { filename } = getValidatedData(res, 'params', documentParamsSchema, req.params, adminService.DocumentServiceError);
    const { content } = getValidatedData(res, 'body', updateDocumentSchema, req.body, adminService.DocumentServiceError);
    const result = await adminService.updateDocument(filename, content);
    res.json({
      success: true,
      filename: result.filename,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/documents/:filename
 */
export async function deleteDocument(req, res, next) {
  try {
    const { filename } = getValidatedData(res, 'params', documentParamsSchema, req.params, adminService.DocumentServiceError);
    const result = await adminService.removeDocument(filename);
    res.json({
      success: true,
      filename: result.filename,
      message: result.message,
    });
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
    const result = await adminService.getPaginatedChunks(params);
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
    const result = await adminService.executeIndexing();
    res.json({
      success: true,
      message: result.message,
      indexedChunks: result.indexedChunks,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/prompt
 */
export function getPrompt(req, res, next) {
  try {
    const prompt = adminService.getSystemPrompt();
    res.json({ prompt });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/prompt
 */
export function updatePrompt(req, res, next) {
  try {
    const { prompt } = getValidatedData(res, 'body', updatePromptSchema, req.body, adminService.PromptServiceError);
    const result = adminService.saveSystemPrompt(prompt);
    res.json({
      success: true,
      message: result.message,
      prompt: result.prompt,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/prompt/reset
 * Resets active prompt back to the isolated default configuration template.
 */
export function resetPrompt(req, res, next) {
  try {
    const result = adminService.resetSystemPrompt();
    res.json({
      success: true,
      message: result.message,
      prompt: result.prompt,
    });
  } catch (error) {
    next(error);
  }
}
