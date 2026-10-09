import { generateAnswer } from './gemini.js';
import { getSystemPrompt } from '../services/adminService.js';

/**
 * Builds the strict grounded prompt injecting the retrieved context sections.
 * Dynamically obtains the current system prompt from persistent storage.
 * 
 * @param {string} question - User question
 * @param {Array<{title: string, content: string, source: string}>} chunks - Retrieved context chunks
 * @param {string} [customPrompt] - Optional override prompt
 * @returns {string} Formatted prompt string
 */
export function buildGroundedPrompt(question, chunks, customPrompt) {
  const contextSections = chunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1}: Document: ${chunk.source} | Section: ${chunk.title} | Chunk ID: ${chunk.id}]\n${chunk.content}`
    )
    .join('\n\n');

  const systemPrompt = customPrompt || getSystemPrompt();

  return `${systemPrompt}

Context:
${contextSections}

User Question:
${question}

Answer:`;
}

/**
 * Generates a grounded response based solely on the retrieved chunks.
 * Reuses generateAnswer from gemini.js.
 * 
 * @param {string} question - User query
 * @param {Array<{title: string, content: string, source: string}>} chunks - Top-K context chunks
 * @returns {Promise<string>} Grounded answer text
 */
export async function generateGroundedAnswer(question, chunks) {
  if (!chunks || chunks.length === 0) {
    return 'The knowledge base does not contain enough information to answer this question.';
  }

  const prompt = buildGroundedPrompt(question, chunks);
  return await generateAnswer(prompt);
}
