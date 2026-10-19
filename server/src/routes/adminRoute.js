import express from 'express';
import * as adminController from '../controllers/adminController.js';
import {
  validateRequest,
  createDocumentSchema,
  updateDocumentSchema,
  documentParamsSchema,
  updatePromptSchema,
  paginationQuerySchema,
} from '../validation/index.js';

const router = express.Router();

// System status and sync overview
router.get('/status', adminController.getStatus);

// Document management CRUD
router.get('/documents', adminController.getDocuments);
router.get(
  '/documents/:filename',
  validateRequest({ params: documentParamsSchema }),
  adminController.getDocument
);
router.post(
  '/documents',
  validateRequest({ body: createDocumentSchema }),
  adminController.createDocument
);
router.put(
  '/documents/:filename',
  validateRequest({ params: documentParamsSchema, body: updateDocumentSchema }),
  adminController.updateDocument
);
router.delete(
  '/documents/:filename',
  validateRequest({ params: documentParamsSchema }),
  adminController.deleteDocument
);

// Paginated chunks review
router.get(
  '/chunks',
  validateRequest({ query: paginationQuerySchema }),
  adminController.getChunks
);

// Cloud re-indexing trigger
router.post('/index', adminController.triggerIndexing);

// System prompt management
router.get('/prompt', adminController.getPrompt);
router.put(
  '/prompt',
  validateRequest({ body: updatePromptSchema }),
  adminController.updatePrompt
);
router.post('/prompt/reset', adminController.resetPrompt);

export default router;
