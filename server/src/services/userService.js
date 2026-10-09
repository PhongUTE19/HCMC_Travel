import { config } from '../config.js';
import { retrieveRelevantChunks } from '../rag/retriever.js';
import { generateGroundedAnswer } from '../rag/generator.js';

export class UserServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Orchestrates the User Chat RAG workflow:
 * Query -> Vector DB Retrieval -> Relevance Threshold Guardrail -> Grounded Generation
 * 
 * @param {string} rawMessage - Raw message string from the user
 * @returns {Promise<{ answer: string, sources: Array<{title: string, source: string, score: number}> }>}
 */
export async function processChat(rawMessage) {
  if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
    throw new UserServiceError('Query message is required.', 400);
  }

  const query = rawMessage.trim();

  try {
    // Step 1: Retrieve candidate chunks directly from vector database
    const retrievedChunks = await retrieveRelevantChunks(query, config.topK);
    const bestScore = retrievedChunks[0]?.score || 0;

    console.log(`[Chat] Query: "${query}" | Best score: ${bestScore} (Threshold: ${config.similarityThreshold})`);

    // Step 2: Out-of-scope guardrail via similarity threshold
    if (bestScore < config.similarityThreshold) {
      console.log(
        `[Chat] Query rejected by similarity threshold (${bestScore} < ${config.similarityThreshold}). Early return before calling generateGroundedAnswer().`
      );
      return {
        answer:
          'The provided Student Handbook does not contain enough information to answer this question.',
        sources: [],
      };
    }

    // Step 3: Grounded LLM generation using retrieved context and dynamically saved prompt
    console.log(`[Chat] Query accepted (${bestScore} >= ${config.similarityThreshold}). Calling generateGroundedAnswer()...`);
    const answer = await generateGroundedAnswer(query, retrievedChunks);

    // Step 4: Map source metadata (without exposing internal embedding vectors)
    const sources = retrievedChunks.map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      sectionNumber: chunk.sectionNumber,
      sectionTitle: chunk.sectionTitle,
      source: chunk.source,
      score: chunk.score,
    }));

    return {
      answer,
      sources,
    };
  } catch (error) {
    if (error instanceof UserServiceError) {
      throw error;
    }
    console.error('[UserService] Error during chat processing:', error.message);
    throw new UserServiceError(`Service temporarily unavailable: ${error.message}`, 500);
  }
}
