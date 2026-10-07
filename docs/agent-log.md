# Agent Log: HCMC Travel Assistant (RAG)

## Log Entry: 2026-10-07 (Phase 0: Architectural Simplification)

### 1. Context & Constraints
* **Project**: 2-hour midterm practice project.
* **Stack Adjustment**: Shifted from Python/FastAPI to **Node.js + Express** to match user familiarity and enable confident defense of the codebase.
* **Guiding Principles**:
  - Keep the architecture strictly minimal.
  - Zero external databases or vector databases.
  - In-memory vector store with native JavaScript cosine similarity.
  - Decoupled retrieval and generation pipelines for independent testing.
  - Configurable model names via environment variables (`.env`).
  - No complex features (no category filtering, no chat history, no auth, no tool calling).

### 2. Architectural Blueprint
* **Server**: Single Express.js application serving static files from `public/` and 2 endpoints:
  - `GET /api/health`
  - `POST /api/chat`
* **Knowledge Base**: Small, focused Markdown files under `data/knowledge/` (`food.md`, `attractions.md`, `landmarks.md`).
* **Chunking**: Section-based split on `## ` headings.
* **Vector Search**: Simple, native JavaScript dot product / cosine similarity over in-memory arrays.
* **LLM & Embeddings**: Google Gemini API via official client; models loaded from `.env`:
  - `EMBEDDING_MODEL` (e.g., `gemini-embedding-001`)
  - `GEMINI_MODEL` (e.g., `gemini-3.5-flash-lite`)

---

## Log Entry: 2026-10-07 (Phase 2: Walking Skeleton & Knowledge Indexing)

### 1. Scope & Accomplishments
* **Knowledge Base Ingestion**:
  - Created 3 curated knowledge files: [data/knowledge/food.md](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/data/knowledge/food.md), [data/knowledge/attractions.md](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/data/knowledge/attractions.md), and [data/knowledge/landmarks.md](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/data/knowledge/landmarks.md).
  - Implemented [src/rag/chunker.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/src/rag/chunker.js) parsing markdown by `## ` headings into 13 structured sections.
* **Embedding & Indexing Pipeline**:
  - Implemented [src/rag/gemini.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/src/rag/gemini.js) using `@google/genai` SDK.
  - Implemented [src/rag/indexer.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/src/rag/indexer.js) generating embeddings for all 13 chunks and writing to [data/embeddings.json](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/data/embeddings.json).
* **Walking Skeleton Server & Endpoints**:
  - Implemented [src/server.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/src/server.js) loading `data/embeddings.json` into memory on startup.
  - Added `GET /api/health` returning `{ status: "ok", indexedChunks: 13 }`.
  - Added `POST /api/chat` invoking Gemini directly (`Browser -> Express -> Gemini -> Browser`).
* **Minimal Test Frontend**:
  - Created [public/index.html](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/public/index.html), [public/style.css](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/public/style.css), and [public/app.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/public/app.js) with live health status, message input, submit button, loading state, answer display, and error handling.

### 2. Validation & Testing Results
* **Indexing verification**:
  - Executed `npm run index`.
  - Generated and verified `data/embeddings.json` with 13 chunks and 3072-dimensional embedding vectors.
* **Server startup verification**:
  - Started Express server on port 3000.
  - Verified console output: `[Server] Loaded 13 chunks from .../data/embeddings.json into memory.`
* **Endpoint tests**:
  - `GET /api/health`: Returned status 200 with `{ status: "ok", indexedChunks: 13 }`.
  - `POST /api/chat`: Sent `{ message: "What is Ben Thanh Market?" }`, received status 200 with grounded response.
* **Static frontend tests**:
  - `GET /`, `GET /style.css`, `GET /app.js` all return HTTP 200.

### 3. Issues Encountered & Resolved
* **Model Availability in API v1beta**:
  - `gemini-2.5-flash` returned `404 NOT_FOUND` indicating deprecation for new callers.
  - `text-embedding-004` was not available for the key's endpoint version.
  - Querying available models revealed `gemini-3.5-flash-lite` for generation and `gemini-embedding-001` for embedding are fully active and stable.
  - Configured these verified models in `.env` and `.env.example`, preserving flexibility without hardcoding in application code.

### 4. Next Phase
* Phase 3: Implement vector retrieval ([src/rag/retriever.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/src/rag/retriever.js)) using cosine similarity, prompt augmentation in [src/rag/generator.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/src/rag/generator.js), and attach source citations to `/api/chat`.
