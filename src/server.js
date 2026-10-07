import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { generateAnswer } from './rag/gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(projectRoot, 'public')));

// In-memory store for loaded embeddings
let inMemoryChunks = [];

/**
 * Loads pre-computed embeddings into memory on server start.
 */
function loadEmbeddingsIntoMemory() {
  if (fs.existsSync(config.embeddingsFile)) {
    try {
      const rawData = fs.readFileSync(config.embeddingsFile, 'utf-8');
      inMemoryChunks = JSON.parse(rawData);
      console.log(`[Server] Loaded ${inMemoryChunks.length} chunks from ${config.embeddingsFile} into memory.`);
    } catch (err) {
      console.error(`[Server] Error parsing ${config.embeddingsFile}:`, err.message);
      inMemoryChunks = [];
    }
  } else {
    console.warn(`[Server] Note: ${config.embeddingsFile} not found. Run 'npm run index' to generate embeddings.`);
    inMemoryChunks = [];
  }
}

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    indexedChunks: inMemoryChunks.length,
  });
});

// 2. Chat endpoint (Walking Skeleton: Browser -> Express -> Gemini -> Browser)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Query message is required.' });
    }

    // Walking Skeleton: Direct LLM generation without RAG retrieval yet
    const answer = await generateAnswer(message.trim());

    res.json({
      answer,
      sources: [],
    });
  } catch (error) {
    console.error('[Server] Chat generation error:', error.message);
    res.status(500).json({
      error: error.message || 'Internal server error while generating response.',
    });
  }
});

// Start server
loadEmbeddingsIntoMemory();

const server = app.listen(config.port, () => {
  console.log(`[Server] HCMC Travel Assistant running at http://localhost:${config.port}`);
});

export { app, server, inMemoryChunks };
