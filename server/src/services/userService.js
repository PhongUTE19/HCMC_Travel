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

  let retrievedChunks = [];
  let retrievalError = null;

  try {
    // Step 1: Retrieve candidate chunks directly from vector database
    retrievedChunks = await retrieveRelevantChunks(query, config.topK);
  } catch (err) {
    console.error('[UserService] Error during chunk retrieval:', err.message);
    retrievalError = err.message;
  }

  // Handle retrieval failure gracefully
  if (retrievalError) {
    return {
      answer: 'Failed to retrieve relevant handbook information due to a vector database error.',
      sources: [],
      retrieval: {
        error: retrievalError,
        retrievedChunks: [],
        usedChunks: [],
        similarityThreshold: config.similarityThreshold,
        bestScore: 0,
      },
    };
  }

  const bestScore = retrievedChunks[0]?.score || 0;
  const passedThreshold = bestScore >= config.similarityThreshold;

  console.log(`[Chat] Query: "${query}" | Best score: ${bestScore} (Threshold: ${config.similarityThreshold})`);

  // Map all retrieved chunks with diagnostic properties before threshold filtering
  const diagnosticChunks = retrievedChunks.map((chunk, index) => ({
    rank: index + 1,
    id: chunk.id,
    title: chunk.title,
    sectionNumber: chunk.sectionNumber,
    sectionTitle: chunk.sectionTitle,
    source: chunk.source,
    score: chunk.score,
    content: chunk.content,
    passedToLLM: passedThreshold,
  }));

  // Step 2: Out-of-scope guardrail via similarity threshold
  if (!passedThreshold) {
    console.log(
      `[Chat] Query rejected by similarity threshold (${bestScore} < ${config.similarityThreshold}). Early return before calling generateGroundedAnswer().`
    );
    return {
      answer:
        'The provided Student Handbook does not contain enough information to answer this question.',
      sources: [],
      retrieval: {
        similarityThreshold: config.similarityThreshold,
        bestScore,
        retrievedChunks: diagnosticChunks,
        usedChunks: [],
      },
    };
  }

  try {
    // Step 3: Grounded LLM generation using retrieved context and prompt
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
      retrieval: {
        similarityThreshold: config.similarityThreshold,
        bestScore,
        retrievedChunks: diagnosticChunks,
        usedChunks: diagnosticChunks,
      },
    };
  } catch (error) {
    if (error instanceof UserServiceError) {
      throw error;
    }
    console.error('[UserService] Error during LLM generation:', error.message);
    throw new UserServiceError(`Service temporarily unavailable: ${error.message}`, 500);
  }
}
