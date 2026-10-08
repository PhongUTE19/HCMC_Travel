import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

let aiInstance = null;

/**
 * Returns a singleton instance of the Google GenAI client.
 */
function getAIClient() {
  if (!config.geminiApiKey || config.geminiApiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return aiInstance;
}

/**
 * Generates an embedding vector for the provided text using the configured embedding model.
 * 
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Array of floating-point numbers
 */
export async function embedText(text) {
  const ai = getAIClient();
  const response = await ai.models.embedContent({
    model: config.embeddingModel,
    contents: text,
  });

  const values = response.embedding?.values || response.embeddings?.[0]?.values;

  if (!values || !Array.isArray(values)) {
    throw new Error('Failed to obtain embedding values from Gemini API response');
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
  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: prompt,
  });

  return response.text || '';
}
