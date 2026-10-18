import { generateAnswer, generateAnswerStream } from './gemini.js';
import { buildGroundedPrompt, formatContextSections } from './promptBuilder.js';
import { SERVER_MESSAGES } from '../constants/index.js';

export { buildGroundedPrompt, formatContextSections };

/**
 * Generates a grounded response based solely on the retrieved chunks.
 * Maintained as a backward-compatible facade delegating to promptBuilder and Gemini generator.
 * 
 * @param {string} question - User query
 * @param {Array<{title: string, content: string, source: string}>} chunks - Top-K context chunks
 * @returns {Promise<string>} Grounded answer text
 */
export async function generateGroundedAnswer(question, chunks) {
  if (!chunks || chunks.length === 0) {
    return SERVER_MESSAGES.ERRORS.KNOWLEDGE_BASE_INSUFFICIENT;
  }

  const prompt = buildGroundedPrompt(question, chunks);
  return await generateAnswer(prompt);
}

/**
 * Streams a grounded response chunk-by-chunk based solely on retrieved chunks.
 * 
 * @param {string} question - User query
 * @param {Array<{title: string, content: string, source: string}>} chunks - Top-K context chunks
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - Optional AbortSignal for request cancellation
 * @returns {Promise<AsyncIterable<any>>} Async iterable yielding response chunks
 */
export async function generateGroundedAnswerStream(question, chunks, options = {}) {
  if (!chunks || chunks.length === 0) {
    throw new Error(SERVER_MESSAGES.ERRORS.KNOWLEDGE_BASE_INSUFFICIENT);
  }

  const prompt = buildGroundedPrompt(question, chunks);
  return await generateAnswerStream(prompt, options);
}
