import {
  orchestrateChat,
  orchestrateChatStream,
  ChatOrchestrationError,
} from './chatOrchestrator.js';
import { HTTP_STATUS } from '../constants/index.js';

export class UserServiceError extends ChatOrchestrationError {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
    super(message, statusCode);
  }
}

/**
 * Backward-compatible service facade delegating to the minimal Chat Orchestration layer.
 * Preserves existing signatures and error contracts for test-rag.js and test suites.
 * 
 * @param {string} rawMessage - Raw message string from the user
 * @param {object} [options]
 * @returns {Promise<{ answer: string, sources: Array<{title: string, source: string, score: number}> }>}
 */
export async function processChat(rawMessage, options = {}) {
  try {
    return await orchestrateChat(rawMessage, options);
  } catch (err) {
    if (err instanceof ChatOrchestrationError) {
      throw new UserServiceError(err.message, err.statusCode);
    }
    throw err;
  }
}

/**
 * Backward-compatible streaming facade delegating to the Chat Orchestration layer.
 * 
 * @param {string} rawMessage - Raw message string from the user
 * @param {(event: string, data: any) => void} sendEvent - Callback to send SSE events
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - AbortSignal for cancellation
 */
export async function processChatStream(rawMessage, sendEvent, options = {}) {
  try {
    return await orchestrateChatStream(rawMessage, sendEvent, options);
  } catch (err) {
    if (err instanceof ChatOrchestrationError) {
      throw new UserServiceError(err.message, err.statusCode);
    }
    throw err;
  }
}
