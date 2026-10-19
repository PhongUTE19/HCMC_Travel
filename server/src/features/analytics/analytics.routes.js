import express from 'express';
import { validateRequest } from '../../shared/middleware/validateRequest.js';
import { analyticsFilterSchema, analyticsHistorySchema } from './analytics.schemas.js';
import * as analyticsController from './analytics.controller.js';

const router = express.Router();

router.get('/overview', validateRequest({ query: analyticsFilterSchema }), analyticsController.getOverview);
router.get('/timeseries', validateRequest({ query: analyticsFilterSchema }), analyticsController.getTimeseries);
router.get('/breakdown', validateRequest({ query: analyticsFilterSchema }), analyticsController.getBreakdown);
router.get('/history', validateRequest({ query: analyticsHistorySchema }), analyticsController.getHistory);

export default router;
