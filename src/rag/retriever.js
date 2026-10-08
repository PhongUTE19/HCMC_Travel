import { embedText } from './gemini.js';

/**
 * Calculates cosine similarity between two numeric vectors.
 * Returns a value between -1 and 1 (typically 0 to 1 for normalized embeddings).
 * 
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Cosine similarity score
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieves the Top-K most relevant chunks for a user query.
 * 
 * @param {string} query - The search query from the user
 * @param {Array} chunks - The in-memory array of chunks containing embedding vectors
 * @param {number} topK - Number of top chunks to return
 * @returns {Promise<Array<{id: string, title: string, content: string, source: string, score: number}>>}
 */
export async function retrieveRelevantChunks(query, chunks, topK = 3) {
  if (!query || !query.trim() || !chunks || chunks.length === 0) {
    return [];
  }

  // 1. Generate query embedding vector
  const queryEmbedding = await embedText(query.trim());

  // 2. Compute similarity score for each chunk
  const scoredChunks = chunks.map((chunk) => {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      id: chunk.id,
      title: chunk.title,
      content: chunk.content,
      source: chunk.source,
      score: Number(score.toFixed(4)),
    };
  });

  // 3. Sort descending by score
  scoredChunks.sort((a, b) => b.score - a.score);

  // 4. Return Top-K chunks
  return scoredChunks.slice(0, topK);
}
