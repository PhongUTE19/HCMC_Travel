import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initVectorStore, getVectorStoreCount } from './features/knowledge/vectorStore.js';
import adminRouter from './routes/adminRoute.js';
import chatRouter from './features/chat/chat.routes.js';
import { STATUS_KEYS, HTTP_STATUS } from './constants/index.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mounted API routes
app.use('/api/admin', adminRouter);
app.use('/api/user', chatRouter);

// Health check endpoint (queries vector database count)
app.get('/api/health', async (req, res) => {
  try {
    const indexedChunks = await getVectorStoreCount();
    res.json({
      status: STATUS_KEYS.OK,
      indexedChunks,
    });
  } catch (error) {
    console.error('[Server] Health check error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS_KEYS.ERROR,
      detail: error.message,
    });
  }
});

// Centralized Express error handler
app.use(errorHandler);

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
