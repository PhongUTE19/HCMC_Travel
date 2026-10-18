import { config } from '../config.js';
import { retrieveRelevantChunks } from '../rag/retriever.js';
import { generateGroundedAnswer, generateGroundedAnswerStream } from '../rag/generator.js';
import { SERVER_MESSAGES, HTTP_STATUS } from '../constants/index.js';

export class UserServiceError extends Error {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
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
    throw new UserServiceError(SERVER_MESSAGES.ERRORS.QUERY_REQUIRED, HTTP_STATUS.BAD_REQUEST);
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
      answer: SERVER_MESSAGES.ERRORS.RETRIEVAL_FAILED,
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
      answer: SERVER_MESSAGES.ERRORS.INSUFFICIENT_INFORMATION,
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
    throw new UserServiceError(
      `${SERVER_MESSAGES.ERRORS.SERVICE_UNAVAILABLE_PREFIX}${error.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Orchestrates the User Chat RAG workflow with Server-Sent Events (SSE) streaming:
 * Query -> Vector DB Retrieval -> Relevance Threshold Guardrail -> Grounded Stream Generation
 * 
 * @param {string} rawMessage - Raw message string from the user
 * @param {(event: string, data: any) => void} sendEvent - Callback to send SSE events
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - AbortSignal for cancellation
 */
export async function processChatStream(rawMessage, sendEvent, options = {}) {
  const signal = options.signal;

  if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
    throw new UserServiceError(SERVER_MESSAGES.ERRORS.QUERY_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  const query = rawMessage.trim();

  let retrievedChunks = [];
  let retrievalError = null;

  try {
    retrievedChunks = await retrieveRelevantChunks(query, config.topK);
  } catch (err) {
    console.error('[UserService] Error during chunk retrieval:', err.message);
    retrievalError = err.message;
  }

  if (signal?.aborted) return;

  // Handle retrieval failure gracefully
  if (retrievalError) {
    const metadata = {
      error: retrievalError,
      retrievedChunks: [],
      usedChunks: [],
      similarityThreshold: config.similarityThreshold,
      bestScore: 0,
    };
    sendEvent('metadata', { sources: [], retrieval: metadata });
    sendEvent('delta', { text: SERVER_MESSAGES.ERRORS.RETRIEVAL_FAILED });
    sendEvent('done', { sources: [], retrieval: metadata });
    return;
  }

  const bestScore = retrievedChunks[0]?.score || 0;
  const passedThreshold = bestScore >= config.similarityThreshold;

  console.log(`[ChatStream] Query: "${query}" | Best score: ${bestScore} (Threshold: ${config.similarityThreshold})`);

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
      `[ChatStream] Query rejected by similarity threshold (${bestScore} < ${config.similarityThreshold}). Early return.`
    );
    const metadata = {
      similarityThreshold: config.similarityThreshold,
      bestScore,
      retrievedChunks: diagnosticChunks,
      usedChunks: [],
    };
    sendEvent('metadata', { sources: [], retrieval: metadata });
    sendEvent('delta', { text: SERVER_MESSAGES.ERRORS.INSUFFICIENT_INFORMATION });
    sendEvent('done', { sources: [], retrieval: metadata });
    return;
  }

  // Step 3: Grounded LLM generation using retrieved context and prompt
  console.log(`[ChatStream] Query accepted (${bestScore} >= ${config.similarityThreshold}). Streaming from LLM...`);

  const sources = retrievedChunks.map((chunk) => ({
    id: chunk.id,
    title: chunk.title,
    sectionNumber: chunk.sectionNumber,
    sectionTitle: chunk.sectionTitle,
    source: chunk.source,
    score: chunk.score,
  }));

  const retrievalMetadata = {
    similarityThreshold: config.similarityThreshold,
    bestScore,
    retrievedChunks: diagnosticChunks,
    usedChunks: diagnosticChunks,
  };

  sendEvent('metadata', { sources, retrieval: retrievalMetadata });

  try {
    const stream = await generateGroundedAnswerStream(query, retrievedChunks, { signal });

    for await (const chunk of stream) {
      if (signal?.aborted) {
        console.log('[ChatStream] Generation aborted by signal.');
        break;
      }
      const text = chunk.text;
      if (text) {
        sendEvent('delta', { text });
      }
    }

    if (!signal?.aborted) {
      sendEvent('done', { sources, retrieval: retrievalMetadata });
    }
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') {
      console.log('[ChatStream] Generation aborted by client.');
      return;
    }
    console.error('[UserService] Error during LLM streaming:', error.message);
    sendEvent('error', {
      error: `${SERVER_MESSAGES.ERRORS.SERVICE_UNAVAILABLE_PREFIX}${error.message}`,
    });
  }
}

