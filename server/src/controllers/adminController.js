import * as adminService from '../services/adminService.js';
import { HTTP_STATUS } from '../constants/index.js';

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
 * GET /api/admin/documents/:filename
 */
export async function getDocument(req, res, next) {
  try {
    const result = await adminService.readDocument(req.params.filename);
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
    const { filename, content, overwrite } = req.body;
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
    const { content } = req.body;
    const result = await adminService.updateDocument(req.params.filename, content);
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
    const result = await adminService.removeDocument(req.params.filename);
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
    const { limit = '10', offset = '0', q, search } = req.query;
    const result = await adminService.getPaginatedChunks({
      limit,
      offset,
      search: q || search || '',
    });
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
    const { prompt } = req.body;
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
