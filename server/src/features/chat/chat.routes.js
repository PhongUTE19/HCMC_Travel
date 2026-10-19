import express from 'express';
import * as chatController from './chat.controller.js';
import { validateRequest } from '../../shared/middleware/validateRequest.js';
import { chatRequestSchema } from './chat.schema.js';

const router = express.Router();

const chatValidation = validateRequest({ body: chatRequestSchema });

// POST /api/user/chat
router.post('/chat', chatValidation, chatController.chat);

// POST /api/user/chat/stream
router.post('/chat/stream', chatValidation, chatController.chatStream);

export default router;
