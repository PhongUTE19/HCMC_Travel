import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { DEFAULT_SYSTEM_PROMPT } from '../config/promptConfig.js';
import {
  SERVER_MESSAGES,
  HTTP_STATUS,
  PROMPT_CONSTRAINTS,
} from '../constants/index.js';

export class PromptServiceError extends Error {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Gets the current system prompt from persistent storage.
 * If file does not exist, seeds it with default template and returns default.
 * 
 * @returns {string} Active system prompt
 */
export function getSystemPrompt() {
  try {
    if (fs.existsSync(config.promptFile)) {
      const content = fs.readFileSync(config.promptFile, 'utf-8');
      if (content && content.trim()) {
        return content.trim();
      }
    }
    const dir = path.dirname(config.promptFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(config.promptFile, DEFAULT_SYSTEM_PROMPT, 'utf-8');
    return DEFAULT_SYSTEM_PROMPT;
  } catch (err) {
    console.warn('[PromptService] Failed to read prompt file, fallback to default:', err.message);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

/**
 * Validates and saves a new system prompt to persistent storage.
 * 
 * @param {string} rawPrompt - New system prompt content
 * @returns {{ prompt: string, message: string }}
 */
export function saveSystemPrompt(rawPrompt) {
  if (rawPrompt === undefined || rawPrompt === null || typeof rawPrompt !== 'string' || !rawPrompt.trim()) {
    throw new PromptServiceError(SERVER_MESSAGES.ERRORS.PROMPT_EMPTY, HTTP_STATUS.BAD_REQUEST);
  }

  const trimmed = rawPrompt.trim();
  if (trimmed.length < PROMPT_CONSTRAINTS.MIN_LENGTH) {
    throw new PromptServiceError(SERVER_MESSAGES.ERRORS.PROMPT_TOO_SHORT, HTTP_STATUS.BAD_REQUEST);
  }
  if (trimmed.length > PROMPT_CONSTRAINTS.MAX_LENGTH) {
    throw new PromptServiceError(SERVER_MESSAGES.ERRORS.PROMPT_TOO_LONG, HTTP_STATUS.BAD_REQUEST);
  }

  const dir = path.dirname(config.promptFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(config.promptFile, trimmed, 'utf-8');
  return {
    prompt: trimmed,
    message: SERVER_MESSAGES.SUCCESS.PROMPT_UPDATED,
  };
}

/**
 * Resets the active system prompt file back to the default configuration template.
 * 
 * @returns {{ prompt: string, message: string }}
 */
export function resetSystemPrompt() {
  const dir = path.dirname(config.promptFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(config.promptFile, DEFAULT_SYSTEM_PROMPT, 'utf-8');
  return {
    prompt: DEFAULT_SYSTEM_PROMPT,
    message: SERVER_MESSAGES.SUCCESS.PROMPT_RESET,
  };
}
