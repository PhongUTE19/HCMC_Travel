import express from 'express';
import * as knowledgeController from './knowledge.controller.js';
import { validateRequest } from '../../shared/middleware/validateRequest.js';
import { paginationQuerySchema } from './knowledge.schemas.js';

const router = express.Router();

// System status and sync overview
router.get('/status', knowledgeController.getStatus);

// Paginated chunks review
router.get(
  '/chunks',
  validateRequest({ query: paginationQuerySchema }),
  knowledgeController.getChunks
);

// Cloud re-indexing trigger
router.post('/index', knowledgeController.triggerIndexing);

export default router;
