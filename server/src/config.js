import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(serverRoot, '..');

dotenv.config({ path: path.join(projectRoot, '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  embeddingModel: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.60'),
  topK: parseInt(process.env.TOP_K || '3', 10),
  knowledgeDir: process.env.KNOWLEDGE_DIR || path.join(projectRoot, 'data', 'knowledge'),
  qdrantUrl: process.env.QDRANT_URL || '',
  qdrantApiKey: process.env.QDRANT_API_KEY || '',
  qdrantCollection: process.env.QDRANT_COLLECTION_NAME || 'hcmc_travel',
  promptFile: process.env.PROMPT_FILE || path.join(projectRoot, 'data', 'system_prompt.txt'),
  vectorSize: 3072,
  vectorDistance: 'Cosine',
};
