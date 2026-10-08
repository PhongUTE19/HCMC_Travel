import { generateAnswer } from './gemini.js';

/**
 * Builds the strict grounded prompt injecting the retrieved context sections.
 * 
 * @param {string} question - User question
 * @param {Array<{title: string, content: string, source: string}>} chunks - Retrieved context chunks
 * @returns {string} Formatted prompt string
 */
export function buildGroundedPrompt(question, chunks) {
  const contextSections = chunks
    .map((chunk, index) => `[Source ${index + 1}: ${chunk.title} (${chunk.source})]\n${chunk.content}`)
    .join('\n\n');

  return `You are the Ho Chi Minh City (HCMC) Travel Assistant.
Answer the user's question using ONLY the provided context below.

Strict rules:
1. Rely ONLY on the facts explicitly stated in the context.
2. Do NOT invent, assume, or extrapolate facts outside the context.
3. If the context does not contain enough information to answer the question, state: "The knowledge base does not contain enough information to answer this question."
4. Keep the answer concise, direct, and factual.
5. Whenever you state a fact, cite the corresponding source in brackets, e.g. [${chunks[0]?.title || 'Source'}].

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
