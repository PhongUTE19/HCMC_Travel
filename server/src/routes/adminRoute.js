import express from 'express';
import documentsRouter from '../features/documents/documents.routes.js';
import promptsRouter from '../features/systemPrompt/systemPrompt.routes.js';
import knowledgeRouter from '../features/knowledgeBase/knowledgeBase.routes.js';
import analyticsRouter from '../features/analytics/analytics.routes.js';

const router = express.Router();

// Document management CRUD (modularized in features/documents)
router.use('/documents', documentsRouter);

// System prompt management (modularized in features/prompts)
router.use('/prompt', promptsRouter);

// AI usage analytics (modularized in features/analytics)
router.use('/analytics', analyticsRouter);

// Knowledge management: status, chunks, indexing (modularized in features/knowledge)
router.use('/', knowledgeRouter);

export default router;
