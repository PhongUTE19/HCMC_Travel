import * as promptsService from './prompts.service.js';
import { updatePromptSchema } from './prompts.schemas.js';
import { validate } from '../../shared/middleware/validateRequest.js';

/**
 * Retrieves pre-validated request data populated by validation middleware,
 * or falls back to direct schema validation when called in standalone unit tests.
 */
function getValidatedData(res, property, schema, fallbackData, errorClass) {
  return res?.locals?.validated?.[property] || validate(schema, fallbackData, { errorClass });
}

/**
 * GET /api/admin/prompt
 */
export function getPrompt(req, res, next) {
  try {
    const prompt = promptsService.getSystemPrompt();
    res.json({ prompt });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/prompt
 */
export function updatePrompt(req, res, next) {
  try {
    const { prompt } = getValidatedData(res, 'body', updatePromptSchema, req.body, promptsService.PromptServiceError);
    const result = promptsService.saveSystemPrompt(prompt);
    res.json({
      success: true,
      message: result.message,
      prompt: result.prompt,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/prompt/reset
 * Resets active prompt back to the isolated default configuration template.
 */
export function resetPrompt(req, res, next) {
  try {
    const result = promptsService.resetSystemPrompt();
    res.json({
      success: true,
      message: result.message,
      prompt: result.prompt,
    });
  } catch (error) {
    next(error);
  }
}
