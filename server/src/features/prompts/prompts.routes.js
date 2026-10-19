import express from 'express';
import * as promptsController from './prompts.controller.js';
import { validateRequest } from '../../shared/middleware/validateRequest.js';
import { updatePromptSchema } from './prompts.schemas.js';

const router = express.Router();

// GET /api/admin/prompt
router.get('/', promptsController.getPrompt);

// PUT /api/admin/prompt
router.put('/', validateRequest({ body: updatePromptSchema }), promptsController.updatePrompt);

// POST /api/admin/prompt/reset
router.post('/reset', promptsController.resetPrompt);

export default router;
