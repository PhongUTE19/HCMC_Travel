import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { retrieveRelevantChunks } from './rag/retriever.js';
import { generateGroundedAnswer } from './rag/generator.js';
import { initVectorStore, getVectorStoreCount } from './rag/vector_store.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. Health check endpoint (queries vector database count)
app.get('/api/health', async (req, res) => {
  try {
    const indexedChunks = await getVectorStoreCount();
    res.json({
      status: 'ok',
      indexedChunks,
    });
  } catch (error) {
    console.error('[Server] Health check error:', error.message);
    res.status(500).json({
      status: 'error',
      detail: error.message,
    });
  }
});

// 2. Chat endpoint (RAG Flow: Query -> Vector DB Retrieval -> Relevance Threshold -> Grounded Generation)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Query message is required.' });
    }

    const query = message.trim();

    // Step 1: Retrieve Top-K candidate chunks directly from vector database
    const retrievedChunks = await retrieveRelevantChunks(query, config.topK);
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

// Ensure vector store is initialized on server startup
initVectorStore()
  .then(async () => {
    const count = await getVectorStoreCount();
    console.log(`[Server] Connected to Qdrant vector database at ${config.qdrantUrl}. Loaded ${count} indexed chunks in collection "${config.qdrantCollection}".`);
  })
  .catch((err) => {
    console.warn('[Server] Qdrant initialization warning:', err.message);
  });

const server = app.listen(config.port, () => {
  console.log(`[Server] HCMC Travel Assistant running at http://localhost:${config.port}`);
});

export { app, server };
