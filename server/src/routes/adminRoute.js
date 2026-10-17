import express from 'express';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// System status and sync overview
router.get('/status', adminController.getStatus);

// Document management CRUD
router.get('/documents', adminController.getDocuments);
router.get('/documents/:filename', adminController.getDocument);
router.post('/documents', adminController.createDocument);
router.put('/documents/:filename', adminController.updateDocument);
router.delete('/documents/:filename', adminController.deleteDocument);

// Paginated chunks review
router.get('/chunks', adminController.getChunks);

// Cloud re-indexing trigger
router.post('/index', adminController.triggerIndexing);

// System prompt management
router.get('/prompt', adminController.getPrompt);
router.put('/prompt', adminController.updatePrompt);
router.post('/prompt/reset', adminController.resetPrompt);

export default router;
