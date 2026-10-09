import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initVectorStore, getVectorStoreCount } from './rag/vector_store.js';
import adminRouter from './routes/adminRoute.js';
import userRouter from './routes/userRoute.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mounted API routes
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);

// Health check endpoint (queries vector database count)
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
  console.log(`[Server] Student Handbook Assistant running at http://localhost:${config.port}`);
});

export { app, server };
