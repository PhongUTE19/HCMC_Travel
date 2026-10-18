import { executeRAG } from '../rag/index.js';
import * as llmService from './llmService.js';
import { SERVER_MESSAGES, HTTP_STATUS } from '../constants/index.js';

export class ChatOrchestrationError extends Error {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Minimal Orchestration Layer coordinating RAG retrieval and LLM generation.
 * 
 * Responsibilities:
 * 1. Accepts application-level query requests
 * 2. Invokes the RAG module to retrieve and validate context
 * 3. Evaluates evidence sufficiency and manages early refusals
 * 4. Invokes LLM generation / streaming with grounded prompt
 * 5. Relays text deltas and outcomes through clean event abstraction
 * 6. Preserves cancellation and error semantics
 */

/**
 * Synchronous chat orchestration.
 * 
 * @param {string} rawMessage - Raw user query
 * @param {object} [options] - Options (e.g. topK, similarityThreshold, ragExecutor, llmGenerator)
 * @returns {Promise<{ answer: string, sources: Array<object>, retrieval: object }>}
 */
export async function orchestrateChat(rawMessage, options = {}) {
  if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
    throw new ChatOrchestrationError(SERVER_MESSAGES.ERRORS.QUERY_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  const query = rawMessage.trim();
  const ragExecutor = options.ragExecutor || executeRAG;
  const llmGenerator = options.llmGenerator || llmService.generateText;

  const ragResult = await ragExecutor(query, options);

  // If evidence is insufficient or retrieval failed, return early refusal
  if (!ragResult.passedThreshold) {
    return {
      answer: ragResult.refusalText,
      sources: [],
      retrieval: ragResult.retrieval,
    };
  }

  try {
    const answer = await llmGenerator(ragResult.prompt, options);

    return {
      answer,
      sources: ragResult.sources,
      retrieval: ragResult.retrieval,
    };
  } catch (error) {
    if (error instanceof ChatOrchestrationError) {
      throw error;
    }
    console.error('[ChatOrchestrator] Error during LLM generation:', error.message);
    throw new ChatOrchestrationError(
      `${SERVER_MESSAGES.ERRORS.SERVICE_UNAVAILABLE_PREFIX}${error.message}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Streaming chat orchestration.
 * 
 * @param {string} rawMessage - Raw user query
 * @param {(type: string, data: any) => void} emit - Callback relaying events ('metadata', 'delta', 'done', 'error')
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - AbortSignal for request cancellation
 * @param {(query: string, options: object) => Promise<object>} [options.ragExecutor] - Optional RAG function injection
 * @param {(prompt: string, options: object) => Promise<AsyncIterable<any>>} [options.llmStreamGenerator] - Optional LLM stream function injection
 */
export async function orchestrateChatStream(rawMessage, emit, options = {}) {
  const signal = options.signal;

  if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
    throw new ChatOrchestrationError(SERVER_MESSAGES.ERRORS.QUERY_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }

  const query = rawMessage.trim();

  if (signal?.aborted) return;

  const ragExecutor = options.ragExecutor || executeRAG;
  const llmStreamGenerator = options.llmStreamGenerator || llmService.generateStream;

  const ragResult = await ragExecutor(query, options);

  if (signal?.aborted) return;

  // Case 1: Refusal (retrieval failure or insufficient similarity)
  if (!ragResult.passedThreshold) {
    emit('metadata', { sources: [], retrieval: ragResult.retrieval });
    emit('delta', { text: ragResult.refusalText });
    emit('done', { sources: [], retrieval: ragResult.retrieval });
    return;
  }

  // Case 2: Grounded stream generation
  emit('metadata', { sources: ragResult.sources, retrieval: ragResult.retrieval });

  try {
    const stream = await llmStreamGenerator(ragResult.prompt, { signal });

    for await (const chunk of stream) {
      if (signal?.aborted) {
        console.log('[ChatOrchestrator] Generation aborted by signal.');
        break;
      }
      const text = chunk.text;
      if (text) {
        emit('delta', { text });
      }
    }

    if (!signal?.aborted) {
      emit('done', { sources: ragResult.sources, retrieval: ragResult.retrieval });
    }
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') {
      console.log('[ChatOrchestrator] Generation aborted by client.');
      return;
    }
    console.error('[ChatOrchestrator] Error during LLM streaming:', error.message);
    emit('error', {
      error: `${SERVER_MESSAGES.ERRORS.SERVICE_UNAVAILABLE_PREFIX}${error.message}`,
    });
  }
}
