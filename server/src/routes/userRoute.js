import express from 'express';
import * as userController from '../controllers/userController.js';
import { validateRequest, chatRequestSchema } from '../validation/index.js';

const router = express.Router();

const chatValidation = validateRequest({ body: chatRequestSchema });

// POST /api/user/chat
router.post('/chat', chatValidation, userController.chat);

// POST /api/user/chat/stream
router.post('/chat/stream', chatValidation, userController.chatStream);

export default router;
