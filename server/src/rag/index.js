/**
 * Public interface of the RAG Module.
 * 
 * Exposes cohesive, independently testable RAG capabilities:
 * - executeRAG: End-to-end RAG execution (retrieval -> ranking -> threshold -> context assembly)
 * - retrieveRelevantChunks: Candidate chunk retrieval from vector store
 * - buildGroundedPrompt & formatContextSections: Grounded prompt formatting
 * - Vector store utilities and chunking logic
 */

export { executeRAG } from './ragService.js';
export { retrieveRelevantChunks, cosineSimilarity } from './retriever.js';
export { buildGroundedPrompt, formatContextSections } from './promptBuilder.js';
export { loadAndChunkMarkdown, recursiveCharacterTextSplit } from './chunker.js';
export { runIndexer } from './indexer.js';
export { initVectorStore, getVectorStore, getVectorStoreCount } from './vectorStore.js';
