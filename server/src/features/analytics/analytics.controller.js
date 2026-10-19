import * as analyticsService from './analytics.service.js';

function getFilters(req, res) {
  return res?.locals?.validated?.query || req.query || {};
}

/**
 * GET /api/admin/analytics/overview
 */
export async function getOverview(req, res, next) {
  try {
    const filters = getFilters(req, res);
    const data = await analyticsService.getAnalyticsOverview(filters);
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
    const filters = getFilters(req, res);
    const data = await analyticsService.getAnalyticsTimeseries(filters);
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
    const filters = getFilters(req, res);
    const data = await analyticsService.getAnalyticsBreakdown(filters);
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
    const filters = getFilters(req, res);
    const data = await analyticsService.getAnalyticsHistory(filters);
    res.json(data);
  } catch (error) {
    next(error);
  }
}
