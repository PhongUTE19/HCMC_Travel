import express from 'express';
import { validateRequest } from '../../shared/middleware/validateRequest.js';
import { analyticsFilterSchema, analyticsHistorySchema } from './analytics.schemas.js';
import * as analyticsController from './analytics.controller.js';

const router = express.Router();

// GET /api/admin/analytics/overview
router.get('/overview', validateRequest({ query: analyticsFilterSchema }), analyticsController.getOverview);

// GET /api/admin/analytics/timeseries
router.get('/timeseries', validateRequest({ query: analyticsFilterSchema }), analyticsController.getTimeseries);

// GET /api/admin/analytics/breakdown
router.get('/breakdown', validateRequest({ query: analyticsFilterSchema }), analyticsController.getBreakdown);

// GET /api/admin/analytics/history
router.get('/history', validateRequest({ query: analyticsHistorySchema }), analyticsController.getHistory);

export default router;
