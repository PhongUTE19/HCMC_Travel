import { generateAnswer, generateAnswerStream } from '../rag/gemini.js';

/**
 * Service encapsulating LLM generation calls.
 * Isolates model provider interactions from orchestration.
 */

/**
 * Generates text for a given prompt using Gemini.
 * 
 * @param {string} prompt - Fully assembled prompt
 * @param {object} [options]
 * @returns {Promise<string>} Generated text
 */
export async function generateText(prompt, options = {}) {
  return await generateAnswer(prompt, options);
}

/**
 * Streams text generation chunks for a given prompt using Gemini.
 * 
 * @param {string} prompt - Fully assembled prompt
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - AbortSignal for cancellation
 * @returns {Promise<AsyncIterable<any>>} Async iterable of chunks
 */
export async function generateStream(prompt, options = {}) {
  return await generateAnswerStream(prompt, options);
}
