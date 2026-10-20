import { executeRAG } from '../knowledge/ragService.js';
import { generateAnswer, generateAnswerStream } from '../../shared/integrations/ai/providers/geminiProvider.js';
import { SERVER_MESSAGES, HTTP_STATUS } from '../../constants/index.js';
import { AppError } from '../../shared/errors/index.js';
import { getSystemPrompt } from '../prompts/prompts.service.js';
import {
  validateChatResponse,
  sanitizeGeneratedOutput,
  formatSafeErrorMessage,
} from '../../shared/guardrails/index.js';

export class ChatOrchestrationError extends AppError {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
    super(message, statusCode);
  }
}

/**
 * Minimal Orchestration Layer coordinating RAG retrieval, guardrails, and LLM generation.
 * 
 * Responsibilities:
 * 1. Accepts application-level query requests
 * 2. Invokes RAG module (with prompt injection & scope guardrails)
 * 3. Evaluates evidence sufficiency and manages early refusals
 * 4. Invokes LLM generation / streaming with grounded, demarcated prompt
 * 5. Validates responses and sanitizes against prompt leaks / empty answers
 * 6. Relays text deltas and outcomes through clean event abstraction
 * 7. Preserves cancellation and safe error semantics without exposing internal secrets
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
  const llmGenerator = options.llmGenerator || generateAnswer;

  const systemPrompt = options.systemPrompt || getSystemPrompt();
  const ragResult = await ragExecutor(query, { ...options, systemPrompt });

  // If evidence is insufficient, request is out-of-scope, or prompt injection refused
  if (!ragResult.passedThreshold) {
    return {
      answer: ragResult.refusalText,
      sources: [],
      retrieval: ragResult.retrieval,
    };
  }

  try {
    const rawAnswer = await llmGenerator(ragResult.prompt, options);

    // Guardrail: Validate AI response non-emptiness and prevent prompt leakage
    const validated = validateChatResponse(rawAnswer);

    return {
      answer: validated.answer,
      sources: ragResult.sources,
      retrieval: ragResult.retrieval,
    };
  } catch (error) {
    if (error instanceof ChatOrchestrationError) {
      throw error;
    }
    console.error('[ChatOrchestrator] Error during LLM generation:', error.message);
    const safeMessage = formatSafeErrorMessage(error);
    throw new ChatOrchestrationError(
      safeMessage,
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
  const llmStreamGenerator = options.llmStreamGenerator || generateAnswerStream;

  const systemPrompt = options.systemPrompt || getSystemPrompt();
  const ragResult = await ragExecutor(query, { ...options, systemPrompt });

  if (signal?.aborted) return;

  // Case 1: Refusal (prompt injection, out-of-scope, retrieval failure, or insufficient similarity)
  if (!ragResult.passedThreshold) {
    emit('metadata', { sources: [], retrieval: ragResult.retrieval });
    emit('delta', { text: ragResult.refusalText });
    emit('done', { sources: [], retrieval: ragResult.retrieval });
    return;
  }

  // Case 2: Grounded stream generation
  emit('metadata', { sources: ragResult.sources, retrieval: ragResult.retrieval });

  let streamedAnyText = false;
  let emittedTerminal = false;

  try {
    const stream = await llmStreamGenerator(ragResult.prompt, { signal });

    for await (const chunk of stream) {
      if (signal?.aborted) {
        console.log('[ChatOrchestrator] Generation aborted by signal.');
        break;
      }
      const text = chunk?.text;
      if (text) {
        // Sanitize chunk for tag leaks or prompt leakage
        const { isLeaking, sanitizedText } = sanitizeGeneratedOutput(text);
        if (!isLeaking && sanitizedText) {
          streamedAnyText = true;
          emit('delta', { text: sanitizedText });
        }
      }
    }

    if (!signal?.aborted) {
      // If no text was streamed, provide safe fallback delta
      if (!streamedAnyText) {
        emit('delta', { text: SERVER_MESSAGES.ERRORS.AI_RESPONSE_EMPTY });
      }
      emittedTerminal = true;
      emit('done', { sources: ragResult.sources, retrieval: ragResult.retrieval });
    }
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') {
      console.log('[ChatOrchestrator] Generation aborted by client.');
      return;
    }
    console.error('[ChatOrchestrator] Error during LLM streaming:', error.message);
    if (!emittedTerminal) {
      emittedTerminal = true;
      const safeError = formatSafeErrorMessage(error);
      emit('error', { error: safeError });
    }
  }
}
