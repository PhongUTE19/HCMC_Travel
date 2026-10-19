import express from 'express';
import documentsRouter from '../features/documents/documents.routes.js';
import promptsRouter from '../features/prompts/prompts.routes.js';
import knowledgeRouter from '../features/knowledge/knowledge.routes.js';

const router = express.Router();

// Document management CRUD (modularized in features/documents)
router.use('/documents', documentsRouter);

// System prompt management (modularized in features/prompts)
router.use('/prompt', promptsRouter);

// Knowledge management: status, chunks, indexing (modularized in features/knowledge)
router.use('/', knowledgeRouter);

export default router;
