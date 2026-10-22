import express from 'express';
import * as controller from './expenses.controller.js';
import { validateRequest } from '../../shared/middleware/validateRequest.js';
import { receiptSchema, transactionQuerySchema, transactionSchema } from './expenses.schemas.js';
const router = express.Router();

// Route chỉ định tuyến HTTP method và path đến controller tương ứng.
router.get('/transactions', validateRequest({ query: transactionQuerySchema }), controller.list);
router.get('/transactions/:id', controller.get);
router.post('/transactions', validateRequest({ body: transactionSchema }), controller.create);
router.put('/transactions/:id', validateRequest({ body: transactionSchema }), controller.update);
router.delete('/transactions/:id', controller.remove);
router.post('/receipts/upload', validateRequest({ body: receiptSchema }), controller.upload);
export default router;
