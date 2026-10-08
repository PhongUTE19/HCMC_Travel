import express from 'express';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// POST /api/user/chat
router.post('/chat', userController.chat);

export default router;
