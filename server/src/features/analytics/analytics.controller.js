import * as analyticsService from './analytics.service.js';
import { getValidatedData } from '../../shared/middleware/index.js';
import { analyticsFilterSchema, analyticsHistorySchema } from './analytics.schemas.js';


/**
 * GET /api/admin/analytics/overview
 */
export async function getOverview(req, res, next) {
  try {
    const validated = getValidatedData(res, 'query', analyticsFilterSchema, req?.query);
    const data = await analyticsService.getAnalyticsOverview(validated);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/analytics/timeseries
 */
export async function getTimeseries(req, res, next) {
  try {
    const validated = getValidatedData(res, 'query', analyticsFilterSchema, req?.query);
    const data = await analyticsService.getAnalyticsTimeseries(validated);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/analytics/breakdown
 */
export async function getBreakdown(req, res, next) {
  try {
    const validated = getValidatedData(res, 'query', analyticsFilterSchema, req?.query);
    const data = await analyticsService.getAnalyticsBreakdown(validated);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/analytics/history
 */
export async function getHistory(req, res, next) {
  try {
    const validated = getValidatedData(res, 'query', analyticsHistorySchema, req?.query);
    const data = await analyticsService.getAnalyticsHistory(validated);
    res.json(data);
  } catch (error) {
    next(error);
  }
}
