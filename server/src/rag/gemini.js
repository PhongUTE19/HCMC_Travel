import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { SERVER_MESSAGES, RETRY_CONFIG, SERVER_CONFIG_DEFAULTS } from '../constants/index.js';

let aiInstance = null;

/**
 * Returns a singleton instance of the Google GenAI client.
 */
function getAIClient() {
  if (!config.geminiApiKey || config.geminiApiKey === SERVER_CONFIG_DEFAULTS.PLACEHOLDER_KEY) {
    throw new Error(SERVER_MESSAGES.ERRORS.GEMINI_API_KEY_NOT_CONFIGURED);
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return aiInstance;
}

async function withRetry(
  operation,
  maxRetries = RETRY_CONFIG.MAX_RETRIES,
  initialDelayMs = RETRY_CONFIG.INITIAL_DELAY_MS
) {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      const isTransient =
        error?.message?.includes('503') ||
        error?.message?.includes('UNAVAILABLE') ||
        error?.message?.includes('429') ||
        error?.message?.includes('RESOURCE_EXHAUSTED');

      if (attempt <= maxRetries && isTransient) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Gemini] Transient API error: retrying attempt ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Generates an embedding vector for the provided text using the configured embedding model.
 * 
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Array of floating-point numbers
 */
export async function embedText(text) {
  const ai = getAIClient();
  const response = await withRetry(() =>
    ai.models.embedContent({
      model: config.embeddingModel,
      contents: text,
    })
  );

  const values = response.embedding?.values || response.embeddings?.[0]?.values;

  if (!values || !Array.isArray(values)) {
    throw new Error(SERVER_MESSAGES.ERRORS.EMBEDDING_FAILED);
  }

  return values;
}

/**
 * Calls Gemini text generation with the given prompt.
 * 
 * @param {string} prompt - Prompt or question for Gemini
 * @returns {Promise<string>} Generated text response
 */
export async function generateAnswer(prompt) {
  const ai = getAIClient();
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: config.geminiModel,
      contents: prompt,
    })
  );

  return response.text || '';
}
