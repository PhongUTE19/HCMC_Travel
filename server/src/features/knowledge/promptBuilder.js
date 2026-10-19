import { config } from '../../config.js';

/**
 * Formats retrieved chunks into standardized context blocks with citation headers.
 * 
 * @param {Array<{title: string, content: string, source: string, id: string}>} chunks - Retrieved context chunks
 * @returns {string} Formatted context sections
 */
export function formatContextSections(chunks) {
  if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
    return '';
  }

  return chunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1}: Document: ${chunk.source} | Section: ${chunk.title} | Chunk ID: ${chunk.id}]\n${chunk.content}`
    )
    .join('\n\n');
}

/**
 * Builds the strict grounded prompt injecting the retrieved context sections.
 * Uses the provided systemPrompt, or falls back to the default configuration template.
 * 
 * @param {string} question - User question
 * @param {Array<{title: string, content: string, source: string, id: string}>} chunks - Retrieved context chunks
 * @param {string} [customPrompt] - Optional override system prompt
 * @returns {string} Formatted prompt string
 */
export function buildGroundedPrompt(question, chunks, customPrompt) {
  const contextSections = formatContextSections(chunks);
  const systemPrompt = customPrompt || config.defaultSystemPrompt;

  return `${systemPrompt}

Context:
${contextSections}

User Question:
${question}

Answer:`;
}
