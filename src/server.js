import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { retrieveRelevantChunks } from './rag/retriever.js';
import { generateGroundedAnswer } from './rag/generator.js';

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

// 2. Chat endpoint (RAG Flow: Query -> Retrieval -> Relevance Threshold -> Grounded Generation)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Query message is required.' });
    }

    const query = message.trim();

    // Step 1: Retrieve Top-K candidate chunks
    const retrievedChunks = await retrieveRelevantChunks(query, inMemoryChunks, config.topK);
    const bestScore = retrievedChunks[0]?.score || 0;

    console.log(`[Chat] Query: "${query}" | Best score: ${bestScore} (Threshold: ${config.similarityThreshold})`);

    // Step 2: Out-of-scope guardrail via similarity threshold
    if (bestScore < config.similarityThreshold) {
      console.log(`[Chat] Query rejected by similarity threshold (${bestScore} < ${config.similarityThreshold}). Early return before calling generateGroundedAnswer().`);
      return res.json({
        answer: 'I do not have verified travel information about this topic in the local knowledge base. Please ask about Ho Chi Minh City food, landmarks, or attractions.',
        sources: [],
      });
    }

    // Step 3: Grounded LLM generation using retrieved context
    console.log(`[Chat] Query accepted (${bestScore} >= ${config.similarityThreshold}). Calling generateGroundedAnswer()...`);
    const answer = await generateGroundedAnswer(query, retrievedChunks);

    // Step 4: Map source metadata (without exposing internal embedding vectors)
    const sources = retrievedChunks.map((chunk) => ({
      title: chunk.title,
      source: chunk.source,
      score: chunk.score,
    }));

    res.json({
      answer,
      sources,
    });
  } catch (error) {
    console.error('[Server] Chat generation error:', error.message);
    res.status(500).json({
      error: error.message || 'Internal server error while processing travel query.',
    });
  }
});

// Start server
loadEmbeddingsIntoMemory();

const server = app.listen(config.port, () => {
  console.log(`[Server] HCMC Travel Assistant running at http://localhost:${config.port}`);
});

export { app, server, inMemoryChunks };
