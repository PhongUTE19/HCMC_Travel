import * as adminService from '../services/adminService.js';

function handleError(res, error) {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({ error: error.message || 'An unexpected error occurred.' });
}

/**
 * GET /api/admin/status
 */
export async function getStatus(req, res) {
  try {
    const status = await adminService.getAdminStatus();
    res.json(status);
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * GET /api/admin/documents
 */
export async function getDocuments(req, res) {
  try {
    const documents = await adminService.listDocuments();
    res.json({ documents });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * GET /api/admin/documents/:filename
 */
export async function getDocument(req, res) {
  try {
    const result = await adminService.readDocument(req.params.filename);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * POST /api/admin/documents
 */
export async function createDocument(req, res) {
  try {
    const { filename, content, overwrite } = req.body;
    const result = await adminService.saveDocument({ filename, content, overwrite });
    res.status(201).json({
      success: true,
      filename: result.filename,
      message: result.message,
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * PUT /api/admin/documents/:filename
 */
export async function updateDocument(req, res) {
  try {
    const { content } = req.body;
    const result = await adminService.updateDocument(req.params.filename, content);
    res.json({
      success: true,
      filename: result.filename,
      message: result.message,
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * DELETE /api/admin/documents/:filename
 */
export async function deleteDocument(req, res) {
  try {
    const result = await adminService.removeDocument(req.params.filename);
    res.json({
      success: true,
      filename: result.filename,
      message: result.message,
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * GET /api/admin/chunks
 */
export async function getChunks(req, res) {
  try {
    const { limit = '10', offset = '0', q, search } = req.query;
    const result = await adminService.getPaginatedChunks({
      limit,
      offset,
      search: q || search || '',
    });
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * POST /api/admin/index
 */
export async function triggerIndexing(req, res) {
  try {
    const result = await adminService.executeIndexing();
    res.json({
      success: true,
      message: result.message,
      indexedChunks: result.indexedChunks,
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * GET /api/admin/prompt
 */
export function getPrompt(req, res) {
  try {
    const prompt = adminService.getSystemPrompt();
    res.json({ prompt });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * PUT /api/admin/prompt
 */
export function updatePrompt(req, res) {
  try {
    const { prompt } = req.body;
    const result = adminService.saveSystemPrompt(prompt);
    res.json({
      success: true,
      message: result.message,
      prompt: result.prompt,
    });
  } catch (error) {
    handleError(res, error);
  }
}
