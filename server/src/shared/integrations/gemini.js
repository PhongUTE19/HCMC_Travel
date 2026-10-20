/**
 * Backward compatibility facade for Gemini integration.
 * The canonical provider-independent AI interface is located in './ai/index.js',
 * and the Gemini-specific implementation is in './ai/providers/geminiProvider.js'.
 */
export * from './ai/index.js';
export { geminiProvider } from './ai/providers/geminiProvider.js';
