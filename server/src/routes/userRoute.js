import express from 'express';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// POST /api/user/chat
router.post('/chat', userController.chat);

// POST /api/user/chat/stream
router.post('/chat/stream', userController.chatStream);

export default router;
