import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export const config = {
  port: process.env.PORT || 3000,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  embeddingModel: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.60'),
  topK: parseInt(process.env.TOP_K || '3', 10),
  knowledgeDir: path.join(projectRoot, 'data', 'knowledge'),
  embeddingsFile: path.join(projectRoot, 'data', 'embeddings.json'),
};
