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

---

## Log Entry: 2026-10-07 (Phase 3: RAG Retrieval + Grounded Generation)

### 1. Scope & Implementation
* **Retriever Module ([src/rag/retriever.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/src/rag/retriever.js))**:
  - Implemented pure JavaScript `cosineSimilarity(a, b)` with normalized dot product calculation.
  - Implemented `retrieveRelevantChunks(query, chunks, topK)`: embeds query with `embedText()`, scores each chunk, sorts descending, and returns top-K candidates (`{ id, title, content, source, score }`).
* **Generator Module ([src/rag/generator.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/src/rag/generator.js))**:
  - Implemented `buildGroundedPrompt(question, chunks)` with strict negative constraints (no external facts, cite sources in brackets, state lack of information if missing).
  - Implemented `generateGroundedAnswer(question, chunks)` delegating generation to `gemini.js`.
* **Server Orchestration & Relevance Guardrail ([src/server.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/src/server.js))**:
  - Updated `POST /api/chat` flow:
    1. Retrieve Top-K chunks.
    2. Check `bestScore < SIMILARITY_THRESHOLD`. If below, immediately return safe fallback without calling Gemini.
    3. If accepted, call `generateGroundedAnswer`.
    4. Return `{ answer, sources: [{ title, source, score }] }` without exposing raw embedding vectors.
* **Frontend Enhancement ([public/app.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/public/app.js), [public/index.html](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/public/index.html))**:
  - Added dynamic rendering of retrieved source cards (title, source file, similarity score) when returned.

### 2. Retrieval Parameters & Threshold
* **Top-K**: `3` (Configurable via `TOP_K` in `.env`).
* **Similarity Threshold**: `0.60` (Configurable via `SIMILARITY_THRESHOLD` in `.env`).
* **Calibration Rationale**:
  - In-domain questions match with scores between `0.75` and `0.81`.
  - Non-travel out-of-scope questions score under `0.45` (e.g., linear algebra scores `0.4412`).
  - Broad ambiguous questions score `~0.52`.
  - Threshold `0.60` creates a clean boundary separating relevant travel queries from out-of-scope queries prior to calling the LLM.

### 3. Validation Results (5 Test Scenarios)

| Test Scenario | Query | Top Chunk & Score | Threshold Decision | Final Output | Sources Count |
|---|---|---|---|---|---|
| **1. Clearly answerable** | `"What is Ben Thanh Market?"` | Chợ Bến Thành (`0.7700`) | **ACCEPTED** (>= 0.60) | Accurate, concise summary citing `[Chợ Bến Thành (Ben Thanh Market)]`. | 3 |
| **2. Another answerable** | `"Where can I eat Com Tam broken rice and what are the traditional toppings?"` | Cơm Tấm (`0.8006`) | **ACCEPTED** (>= 0.60) | Lists Ba Ghiền, Thuận Kiều, and traditional toppings citing `[Cơm Tấm (Broken Rice)]`. | 3 |
| **3. Out-of-scope** | `"What is linear algebra?"` | Landmark 81 (`0.4412`) | **REJECTED** (< 0.60) | *"I do not have verified travel information about this topic..."* (Gemini skipped). | 0 (`[]`) |
| **4. HCMC-related but unindexed** | `"What are the ticket prices and tour schedules for the Cu Chi Tunnels?"` | War Remnants Museum (`0.6519`) | **ACCEPTED** (>= 0.60) | *"The knowledge base does not contain enough information to answer this question."* (Zero hallucination). | 3 |
| **5. Ambiguous query** | `"Where should I go?"` | Chợ Lớn (`0.5279`) | **REJECTED** (< 0.60) | *"I do not have verified travel information about this topic..."* (Gemini skipped). | 0 (`[]`) |

### 4. Known Limitations
1. **Unindexed Local Spots**: Topics related to HCMC that are not present in `data/knowledge/*.md` (e.g. Cu Chi Tunnels, Saigon Waterbus) pass semantic proximity to history/transportation, but rely on prompt guardrails to reject answering.
2. **Short Ambiguous Queries**: Queries like *"Where should I go?"* lack sufficient semantic density and fall below 0.60; expanding prompt suggestions or giving example chips in the UI helps users form specific questions.

### 5. Verification & Guardrail Audit (Phase 3 Check)
* **Configuration Audit**:
  - `topK`: explicitly set to `3`.
  - `similarityThreshold`: explicitly set to `0.60`.
  - Verified fallbacks in `src/config.js`: `gemini-3.5-flash-lite` and `gemini-embedding-001` match active `.env` parameters.
* **Guardrail Execution Verification**:
  - Validated that out-of-scope query `"What is linear algebra?"` (best score `0.4412` < `0.60`) executes an immediate early return from `/api/chat` with `sources: []`.
  - Updated server logging in `src/server.js` to explicitly state `Early return before calling generateGroundedAnswer()` on rejection vs `Calling generateGroundedAnswer()` on acceptance, ensuring observable trace of execution bypass.
  - Confirmed via spy assertion that neither `generateGroundedAnswer()` nor the Gemini generation API is invoked for rejected queries.

### 6. Next Phase
* Phase 4: React frontend integration with Vite.

---

## Log Entry: 2026-10-08 (Phase 4: React Frontend Integration)

### 1. Scope & Implementation
* **React Frontend Scaffold (`client/`)**:
  - Initialized Vite + React 18 frontend inside `client/`.
  - Configured `client/vite.config.js` with development proxy (`/api` -> `http://localhost:3000`).
* **Component Architecture**:
  - `client/src/services/api.js`: Handles communication with `GET /api/health` and `POST /api/chat`.
  - `client/src/components/HealthBadge.jsx`: Real-time health badge reporting backend connection status and count of indexed chunks.
  - `client/src/components/ChatForm.jsx`: Text input with submission handler, disabling during submission, and empty-input validation.
  - `client/src/components/AnswerSection.jsx`: Formatted answer display with interactive source citation cards (`title`, `source`, `score`).
  - `client/src/components/ErrorMessage.jsx`: User-facing alert box for network/server errors.
  - `client/src/App.jsx`: Main state orchestration, sample question chips for quick testing, and loading indicators.
  - `client/src/index.css`: Clean vanilla CSS design system.
* **Backend Adjustments**:
  - Added `cors` middleware to `src/server.js` to ensure flexible multi-origin support.
  - **Zero changes** to RAG pipeline modules (`retriever.js`, `generator.js`, `gemini.js`, `chunker.js`, `indexer.js`).

### 2. React → API → RAG Flow
```
User clicks/enters query in React (ChatForm)
   │
   ▼
client/src/services/api.js (fetch '/api/chat')
   │
   ▼ (Vite Proxy: localhost:5173 -> localhost:3000)
Express Backend (src/server.js: POST /api/chat)
   │
   ▼
retriever.js (embedText -> cosine similarity -> Top-3)
   │
   ├─────────────────────────────────────────────────┐
bestScore < 0.60 (Out-of-Scope)           bestScore >= 0.60 (Accepted)
   │                                                 │
   ▼                                                 ▼
Safe Fallback Response                   generator.js (buildGroundedPrompt -> gemini.js)
(Gemini generation skipped)                          │
sources: []                                          ▼
   │                                     Answer + Sources [{ title, source, score }]
   └───────────────────────┬─────────────────────────┘
                           ▼
React App receives JSON { answer, sources }
   │
   ▼
Rendered in AnswerSection component
```

### 3. Validation Results

| Test Scenario | Action | Observed Result | Status |
|---|---|---|---|
| **1. Health Check** | React mounts, calls `/api/health` | Badge displays `● Server: Online \| Memory: 13 indexed chunks`. | **PASSED** |
| **2. In-Scope Query** | `"What is Ben Thanh Market?"` | Answer returned in ~1.2s citing `[Chợ Bến Thành (Ben Thanh Market)]`; 3 sources displayed with scores. | **PASSED** |
| **3. Out-of-Scope Query** | `"What is linear algebra?"` | Immediate refusal returned; `sources: []`; Gemini generation skipped. | **PASSED** |
| **4. Empty Input Handling** | User clicks Send with empty or whitespace input | Button disabled; form blocks submit; client service rejects with error. | **PASSED** |
| **5. Loading State** | Active query processing | Input disabled, button shows "Thinking...", animated spinner displayed. | **PASSED** |
| **6. Error State** | Server failure / invalid input simulation | Error box displayed cleanly without app crash. | **PASSED** |
| **7. Backend Non-Regression** | Git diff audit on `src/` | Verified zero changes to `retriever.js`, `generator.js`, `gemini.js`, `indexer.js`, or `chunker.js`. | **PASSED** |

### 4. Known Issues / Observations
* None. Development proxy and CORS both operate seamlessly; API contracts remain identical (`{ message }` -> `{ answer, sources }`).

---

## Log Entry: 2026-10-08 (Project Structure & Workspace Refactoring)

### 1. Scope & Implementation
* **Directory Reorganization**:
  - Moved backend source from `src/` to `server/src/`.
  - Moved backend `package.json`, `package-lock.json`, `.env`, and `.env.example` into `server/`.
  - Kept `data/` and `docs/` at the project root as shared ground truth.
  - Removed deprecated `public/` directory (vanilla frontend replaced by React in `client/`).
* **Path & Configuration Alignment**:
  - Updated `server/src/config.js` to resolve `projectRoot` up two directories (`path.resolve(__dirname, '..', '..')`) ensuring `data/knowledge/` and `data/embeddings.json` are properly addressed.
  - Configured `dotenv.config({ path: path.join(serverRoot, '.env') })` to guarantee environment loading regardless of execution CWD.
  - Removed obsolete static `public/` mounting from `server/src/server.js`.
* **Root Orchestration (`package.json`)**:
  - Configured root `package.json` with `concurrently` scripts:
    - `npm run dev`: starts both `server` (port 3000) and `client` (port 5173).
    - `npm run server`: starts the Express backend (`npm --prefix server start`).
    - `npm run client`: starts the Vite dev server (`npm --prefix client dev`).
    - `npm run index`: executes the indexing pipeline from the root (`npm --prefix server run index`).
* **Documentation**:
  - Created root [README.md](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\README.md) with updated structure, setup instructions, and startup commands.

### 2. Validation
* Verified `npm run index` from root loads `data/knowledge` and updates `data/embeddings.json`.
* Verified root `npm run dev` boots Express on port 3000 and React on port 5173 concurrently.
* Verified `/api/health` and `/api/chat` end-to-end functionality via Vite proxy and CORS.
* Zero changes made to RAG core logic (`retriever.js`, `generator.js`, `gemini.js`).

---

## Log Entry: 2026-10-08 (Vector Database Refactoring: Vectra)

### 1. Vector Database Selection & Motivation
* **Selected Database**: **Vectra** (`vectra` v0.15.0).
* **Rationale**:
  - Embedded local vector database running directly in the Node.js process without requiring background server daemons, Docker, or external cloud services.
  - Written in pure JavaScript/TypeScript with zero native C++ compilation (avoiding `node-gyp` / MSBuild errors prevalent on Windows).
  - Uses file-based storage (`data/vector_store/index.json`) for persistence, fast start, and easy inspection.
  - Built-in cosine similarity vector search (`queryItems`) with top-K querying and metadata projection.

### 2. Implementation Changes
* **Package Dependencies**:
  - Added `vectra` to `server/package.json`.
* **Configuration (`server/src/config.js`)**:
  - Replaced `embeddingsFile` with `vectorStoreDir: path.join(projectRoot, 'data', 'vector_store')`.
* **Vector Store Manager (`server/src/rag/vector_store.js`)**:
  - Created singleton management module wrapping Vectra's `LocalIndex`.
  - Added `initVectorStore({ reset })` for creating/opening index.
  - Added `getVectorStoreCount()` to count indexed items.
* **Indexing Pipeline (`server/src/rag/indexer.js`)**:
  - Replaced JSON writing to `data/embeddings.json` with `index.insertItem({ vector, metadata })` into the Vectra vector store.
  - Preserved chunking and embedding logic using `chunkKnowledgeBase()` and `embedText()`.
* **Retriever (`server/src/rag/retriever.js`)**:
  - Replaced manual array cosine similarity loop with `index.queryItems(queryEmbedding, '', topK)`.
  - Maps returned Vectra items into scored chunk objects `{ id, title, content, source, score }`.
* **Server & Startup (`server/src/server.js`)**:
  - Replaced `inMemoryChunks` startup array loading with `getVectorStoreCount()`.
  - `/api/health` now reports `indexedChunks` directly from the local vector database count.
  - `/api/chat` calls `retrieveRelevantChunks(message, config.topK)` directly against the vector database.
  - Preserved threshold gate (`bestScore < 0.60`) and grounded generation (`generateGroundedAnswer()`).
* **Cleanup & Git**:
  - Removed obsolete file `data/embeddings.json`.
  - Added `data/vector_store/` to root `.gitignore`.

### 3. Validation Matrix

| Validation Requirement | Verification Action | Observed Result | Status |
|---|---|---|---|
| **1. Knowledge Base Indexing** | Executed `npm run index` from project root | Read 3 Markdown files (13 chunks), generated embeddings via Gemini, stored in `data/vector_store/index.json` (519 KB). | **PASSED** |
| **2. Health Check** | `GET /api/health` on port 3000 & 5173 | Returned `{ "status": "ok", "indexedChunks": 13 }`. React UI status badge displays connected. | **PASSED** |
| **3. In-Scope Retrieval & Generation** | `POST /api/chat` with `"What is Ben Thanh Market?"` | Top score $0.77 \ge 0.60$; retrieved 3 chunks from Vectra; generated grounded answer with citations and sources list. | **PASSED** |
| **4. Out-of-Scope Rejection** | `POST /api/chat` with `"What is linear algebra?"` | Top score $0.4412 < 0.60$; early return logged; Gemini generation skipped; safe refusal with `sources: []` returned. | **PASSED** |
| **5. Empty Input Handling** | `POST /api/chat` with `{ "message": "   " }` | Returns HTTP 400 Bad Request `{ "error": "Query message is required." }`. | **PASSED** |
| **6. Frontend Build & Non-Regression** | `npm --prefix client run build` | Built 32 modules successfully into `dist/` with 0 warnings/errors. Full chat interface renders without regressions. | **PASSED** |

---

## Log Entry: 2026-10-08 (Qdrant Vector Database Migration & Docker Containerization)

### 1. Scope & Motivation
* Migrated vector storage from local Vectra file index to **Qdrant** (`qdrant/qdrant:latest`).
* Containerized the complete application stack with **Docker Compose**:
  - `qdrant`: Vector database with persistent named volume `hcmc_qdrant_storage`.
  - `server`: Express backend running on Node 22-alpine.
  - `client`: React frontend built with Vite and served via Nginx reverse proxy.
* Configured health checks for all three services with dependency orchestration (`condition: service_healthy`).
* Preserved API contracts, grounded generation, similarity threshold ($0.60$), and source citations.

### 2. Implementation Changes
* **Vector Store & SDK**:
  - Uninstalled `vectra` and installed `@qdrant/js-client-rest` in `server/`.
  - Created [server/src/rag/vector_store.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/server/src/rag/vector_store.js) wrapping `QdrantClient` for singleton access, collection setup (`initVectorStore`), and item counting (`getVectorStoreCount`).
  - Configured collection `hcmc_travel` with 3072-dimensional vectors using `Cosine` distance.
  - Updated [server/src/rag/indexer.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/server/src/rag/indexer.js) to upsert points with payload metadata (`id`, `title`, `content`, `source`) into Qdrant.
  - Updated [server/src/rag/retriever.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/server/src/rag/retriever.js) to execute `client.query(collectionName, { query, limit, with_payload })`.
* **Configuration & Environment**:
  - Updated [server/src/config.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/server/src/config.js) to support `QDRANT_URL`, `QDRANT_COLLECTION_NAME`, `KNOWLEDGE_DIR`.
  - Updated [server/.env.example](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/server/.env.example) and created root [.env.example](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/.env.example).
* **Containerization**:
  - Created [client/Dockerfile](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/client/Dockerfile) (multi-stage build with Node 22-alpine + Nginx alpine).
  - Created [client/nginx.conf](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/client/nginx.conf) serving static assets on port 80 and reverse-proxying `/api/` to `http://server:3000/api/`.
  - Created [server/Dockerfile](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/server/Dockerfile) (Node 22-alpine, exposing port 3000).
  - Created [docker-compose.yml](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/docker-compose.yml) orchestrating `qdrant`, `server`, and `client` with shared bridge network and named persistent volume `hcmc_qdrant_storage`.
  - Created `.dockerignore` files for root, client, and server.
  - Added Docker scripts (`docker:build`, `docker:up`, `docker:down`, `docker:index`) to [package.json](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/HCMC_Travel/package.json).

### 3. Validation Matrix

| # | Validation Item | Test Action | Observed Result | Status |
|---|---|---|---|---|
| 1 | **Image Build** | `docker compose build` | Built `hcmc_travel-server:latest` and `hcmc_travel-client:latest` with zero errors. | **PASSED** |
| 2 | **System Startup** | `docker compose up -d` | All 3 containers (`hcmc-qdrant`, `hcmc-server`, `hcmc-client`) started and transitioned to `healthy`. | **PASSED** |
| 3 | **Qdrant Health** | `GET http://localhost:6333/readyz` | Responded with `all shards are ready` (HTTP 200). | **PASSED** |
| 4 | **Knowledge Indexing** | `docker compose exec server npm run index` | Chunked 13 sections, generated 3072-dim embeddings via Gemini, upserted into Qdrant collection `hcmc_travel`. | **PASSED** |
| 5 | **Health API Verification** | `GET http://localhost:3000/api/health` and `:5173/api/health` | Both endpoints returned `{"status":"ok","indexedChunks":13}`. | **PASSED** |
| 6 | **In-Scope Query** | `POST /api/chat` with `"What is Ben Thanh Market?"` | Top score: 0.77 ($\ge 0.60$); retrieved 3 chunks; generated grounded response citing `[Chợ Bến Thành (Ben Thanh Market)]`. | **PASSED** |
| 7 | **Out-of-Scope Query** | `POST /api/chat` with `"What is linear algebra?"` | Top score: 0.4412 ($< 0.60$); early exit logged; returned refusal with `sources: []`; Gemini generation skipped. | **PASSED** |
| 8 | **Volume Persistence** | `docker compose down` then `docker compose up -d` | Containers recreated; all 13 points in collection `hcmc_travel` persisted in volume `hcmc_qdrant_storage`. | **PASSED** |
| 9 | **Health Post-Restart** | `GET /api/health` after restart | Immediately returned `{"status":"ok","indexedChunks":13}` without needing re-indexing. | **PASSED** |
| 10| **Frontend-Backend Comms** | `POST /api/chat` via `:5173` after restart | Nginx proxied request to `server:3000`, returned grounded response for `"Tell me about Saigon Central Post Office"`. | **PASSED** |
---

## Log Entry: 2026-10-09 (Qdrant Cloud Migration & Docker Streamlining)

### 1. Scope & Motivation
* Migrated from self-hosted local Qdrant container to managed **Qdrant Cloud**.
* Streamlined Docker Compose architecture:
  - Removed local `hcmc-qdrant` container, ports 6333-6334, and named volume `hcmc_qdrant_storage`.
  - Docker Compose now runs application workloads (`server` and `client`).
  - `server` communicates directly over HTTPS with Qdrant Cloud using `QDRANT_URL` and `QDRANT_API_KEY`.
* Consolidated environment variable architecture:
  - Audited environment variables between Docker and Express server.
  - Removed redundant `server/.env.example` in favor of single root `.env.example`.
  - Configured `server/src/config.js` to load both `server/.env` and `projectRoot/.env`.

### 2. Implementation Changes
* **Docker Compose (`docker-compose.yml`)**:
  - Removed `qdrant` service and `qdrant_storage` volume.
  - Removed `depends_on: qdrant` from `server`.
  - Added `QDRANT_URL=${QDRANT_URL}` and `QDRANT_API_KEY=${QDRANT_API_KEY}` to `server` environment.
* **Server Dockerfile (`server/Dockerfile`)**:
  - Removed obsolete local container default `ENV QDRANT_URL=http://qdrant:6333`.
* **Configuration & Environment**:
  - [server/src/config.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\server\src\config.js): Added fallback loading for `projectRoot/.env` and updated `qdrantUrl` default.
  - [server/src/rag/vector_store.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\server\src\rag\vector_store.js): Added explicit configuration check for `QDRANT_URL`.
  - [.env.example](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\.env.example): Updated with Qdrant Cloud settings (`QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION_NAME`).
  - Deleted obsolete duplicate `server/.env.example`.
* **Documentation**:
  - Updated [README.md](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\README.md) and [docs/architecture.md](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\docs\architecture.md) for Qdrant Cloud.

### 3. Validation Matrix

| # | Validation Item | Test Action | Observed Result | Status |
|---|---|---|---|---|
| 1 | **Docker Image Build** | `docker compose build` | Successfully built `hcmc_travel-server:latest` and `hcmc_travel-client:latest` with zero errors. | **PASSED** |
| 2 | **Local Qdrant Removal** | Inspected `docker-compose.yml` & stopped old local containers | Local Qdrant container and volume `hcmc_qdrant_storage` cleanly removed. | **PASSED** |
| 3 | **Git / Secret Leak Audit** | Git status and code inspection | Zero API keys committed or tracked by Git; all secrets sourced from `.env`. | **PASSED** |

---

## Log Entry: 2026-10-09 (User/Admin Dual-Role Interface & Knowledge Management)

### 1. Scope & Motivation
* Implemented a dual-role interface allowing users to toggle between **User Chat** and **Admin Portal** via a top-right switcher button without requiring authentication.
* Built full knowledge-base management capabilities for administrators:
  - View real-time sync state (document count, parsed file chunks, Qdrant Cloud vectors).
  - Upload `.md` knowledge base files from computer.
  - Create and add new `.md` documents with header validation (`## `).
  - Edit existing document contents in an integrated editor.
  - Delete documents with confirmation.
  - Review all current section chunks with collapsible preview and keyword search.
  - Trigger one-click re-indexing to Qdrant Cloud.
* Preserved the complete existing User chat experience, grounded generation, and source attribution.

### 2. Implementation Changes
* **Backend Admin Endpoints ([server/src/routes/admin.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\server\src\routes\admin.js))**:
  - `GET /api/admin/status`: Returns document count, chunk count, cloud vectors, sync status.
  - `GET /api/admin/documents`: Lists all Markdown documents with sizes, section counts, and timestamps.
  - `GET /api/admin/documents/:filename`: Retrieves raw Markdown content.
  - `POST /api/admin/documents`: Creates/uploads a new `.md` document with validation.
  - `PUT /api/admin/documents/:filename`: Updates document content.
  - `DELETE /api/admin/documents/:filename`: Removes document from `data/knowledge/`.
  - `GET /api/admin/chunks`: Returns all parsed section chunks.
  - `POST /api/admin/index`: Triggers `runIndexer()` with concurrency lock.
* **Backend Server ([server/src/server.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\server\src\server.js))**:
  - Mounted `/api/admin` routes.
* **Indexer ([server/src/rag/indexer.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\server\src\rag\indexer.js))**:
  - Updated `runIndexer()` to return `{ indexedChunks }`.
* **Frontend Architecture ([client/src/](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\))**:
  - [App.jsx](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\App.jsx): Added `role` state (`user` / `admin`) and role switch button in top-right header.
  - [components/AdminDashboard.jsx](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\components\AdminDashboard.jsx): Built comprehensive admin panel with stat cards, document CRUD, file upload, chunk search/review, and re-indexing trigger.
  - [components/SuccessMessage.jsx](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\components\SuccessMessage.jsx): Shared dismissible success alert.
  - [services/api.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\services\api.js): Added client methods for all admin endpoints.
  - [index.css](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\index.css): Added styled layouts for header switcher, stat cards, admin tables, modals, and chunk cards.
* **Docker Compose ([docker-compose.yml](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\docker-compose.yml))**:
  - Updated `data/knowledge` volume mount to read-write so admin file operations persist directly to disk.

### 3. Validation Matrix

| # | Validation Item | Test Action | Observed Result | Status |
|---|---|---|---|---|
| 1 | **User/Admin Switch** | Toggled role button in header | Smoothly switches between User chat interface and Admin knowledge dashboard. | **PASSED** |
| 2 | **User Chat Non-Regression** | Tested `"What is Ben Thanh Market?"` | Returned grounded answer citing `[Chợ Bến Thành (Ben Thanh Market)]` with 3 source cards. | **PASSED** |
| 3 | **View Chunks** | Called `GET /api/admin/chunks` & Admin UI | Displays all 13 chunks with titles, source tags, and expandable content preview. | **PASSED** |
| 4 | **Add Document** | Created `festivals.md` via `POST /api/admin/documents` | Saved to `data/knowledge/festivals.md`; chunk count incremented from 13 to 14. | **PASSED** |
| 5 | **Edit Document** | Updated `festivals.md` via `PUT /api/admin/documents/festivals.md` | Content updated; section title and content preserved. | **PASSED** |
| 6 | **Trigger Indexing** | Clicked Re-index / `POST /api/admin/index` | Re-indexed knowledge base into Qdrant Cloud; reported 14 indexed chunks. | **PASSED** |
| 7 | **Retrieve New Knowledge** | Asked `"Tell me about the Ao Dai Festival"` in User chat | Successfully retrieved `festivals.md` with score 0.8569 and answered with citations. | **PASSED** |
| 8 | **Delete Document** | Deleted `festivals.md` & triggered re-index | File deleted cleanly; Qdrant Cloud collection synced back to 13 chunks. | **PASSED** |
| 9 | **Input Validation** | Tested invalid document formats and empty fields | Clear 400 error messages returned without crashing backend. | **PASSED** |

---

## Log Entry: 2026-10-09 (User/Admin Modular Refactor & Chunk Pagination)

### 1. Scope & Motivation
* **Frontend Architecture Refactoring**:
  - `AdminDashboard.jsx` was excessively large and contained multiple disparate UI sections. Split it into focused, single-responsibility components under `client/src/components/admin/`, retaining `AdminDashboard.jsx` as the coordinator.
  - `App.jsx` contained User chat state and views inline. Extracted the User chat workflow into `client/src/components/user/`, leaving `App.jsx` responsible strictly for header rendering and role toggling.
  - Separated monolithic `client/src/services/api.js` into dedicated `userApi.js` and `adminApi.js` modules.
* **Backend Modularization**:
  - `server/src/routes/admin.js` mixed routing, file system I/O, validation, and chunk processing. Extracted business logic into `server/src/controllers/adminController.js`, keeping `admin.js` clean and route-focused.
* **Chunk Review Pagination & Server Search**:
  - Refactored `GET /api/admin/chunks` from dumping all chunks to supporting `limit` (`10`, `30`, `50`), `offset`, and keyword search (`q`/`search`).
  - Added UI pagination controls (Page size selector, range display, Previous/Next navigation).

### 2. Implementation Changes
* **Backend Controller ([server/src/controllers/adminController.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\server\src\controllers\adminController.js))**:
  - Extracted handlers: `getStatus`, `getDocuments`, `getDocument`, `createDocument`, `updateDocument`, `deleteDocument`, `getChunks`, `triggerIndexing`, and helper `sanitizeFilename`.
  - Added server-side keyword filtering and pagination in `getChunks`: returns `{ totalChunks, chunks, limit, offset, hasMore }`. Supported page sizes: `10`, `30`, `50`; default `10`; clamped max `50`.
* **Backend Routes ([server/src/routes/admin.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\server\src\routes\admin.js))**:
  - Refactored to map endpoints directly to controller methods.
* **Frontend API Separation ([client/src/services/](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\services\))**:
  - [userApi.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\services\userApi.js): `fetchHealth`, `sendChatMessage`.
  - [adminApi.js](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\services\adminApi.js): `fetchAdminStatus`, `fetchDocuments`, `fetchDocumentContent`, `saveDocument`, `updateDocument`, `deleteDocument`, `fetchChunks({ limit, offset, search })`, `triggerIndexing`.
  - Deleted legacy `api.js`.
* **Frontend Components ([client/src/components/](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\components\))**:
  - `admin/AdminStats.jsx`: Overview cards for files, chunks, Qdrant vectors, sync badge.
  - `admin/DocumentEditor.jsx`: Markdown creation and edit form.
  - `admin/DocumentTable.jsx`: Document list, upload button, add button, edit/delete actions.
  - `admin/ChunkReview.jsx`: Chunk inspection interface with pagination controls and search bar.
  - `admin/ChunkCard.jsx`: Individual chunk card with title, source, id badge, and toggleable content.
  - `user/UserChatView.jsx`: User chat experience container.
  - `user/ChatForm.jsx`: Chat input form and submit handling.
  - `user/AnswerSection.jsx`: Grounded answer display and citation list.
  - [AdminDashboard.jsx](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\components\AdminDashboard.jsx): Refactored coordinator for Admin state and API coordination.
  - [App.jsx](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\App.jsx): Role state and header coordinator.
  - [index.css](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering\HCMC_Travel\client\src\index.css): Added pagination styling for controls bar, dropdown, and buttons.

### 3. Validation Matrix

| # | Validation Item | Test Action | Observed Result | Status |
|---|---|---|---|---|
| 1 | **User Chat** | `POST /api/chat` with `"What is Ben Thanh Market?"` | Returned HTTP 200 with grounded answer and 3 source citations. | **PASSED** |
| 2 | **User/Admin Switch** | Inspected `App.jsx` coordinator logic & DOM | Toggling `#role-switch-btn` conditionally mounts `<UserChatView />` or `<AdminDashboard />`. | **PASSED** |
| 3 | **Admin Document CRUD** | Created `museums.md`, updated content, deleted file | CRUD operations succeeded (`201 Created` -> `200 OK` -> `200 OK`); validation rejected non-header markdown. | **PASSED** |
| 4 | **Re-index** | `POST /api/admin/index` | Successfully completed; returned `{ success: true, indexedChunks: 13 }`. | **PASSED** |
| 5 | **Chunk Review Default Limit** | `GET /api/admin/chunks` (no query params) | Returns batch of 10 chunks (`totalChunks: 13, count: 10, limit: 10, offset: 0, hasMore: true`). | **PASSED** |
| 6 | **Page Size Switching (30/50)** | `GET /api/admin/chunks?limit=30` | Returns all 13 chunks (`count: 13, limit: 30, hasMore: false`). | **PASSED** |
| 7 | **Next/Previous Pagination** | `GET /api/admin/chunks?limit=10&offset=10` | Returns remaining 3 chunks (`count: 3, offset: 10, hasMore: false`). | **PASSED** |
| 8 | **Metadata Accuracy** | Checked `totalChunks` & `hasMore` on page 1 & 2 | Correctly computed on both pages. | **PASSED** |
| 9 | **Keyword Search** | `GET /api/admin/chunks?q=Market` | Filters server-side; returns 3 matching chunks containing "Market". | **PASSED** |
| 10 | **Existing Verifications** | Out-of-scope query check (`"What is linear algebra?"`) | Refusal returned before calling Gemini LLM. | **PASSED** |
| 11 | **Frontend Build** | `npm run build` in `client/` | Vite build passed in 9.5s with zero errors or bundle warnings. | **PASSED** |
| 12 | **Backend Startup** | Booted server on port 3000 | Server connected to Qdrant Cloud and loaded 13 indexed chunks. | **PASSED** |

---

## Log Entry: 2026-10-09 (Admin Backend Service Layering & User Chat CSS Alignment)

### 1. Scope & Motivation
* **User Chat CSS Fix**:
  - Restored `<div className="input-group">` wrapper inside `client/src/components/user/ChatForm.jsx`.
  - Harmonized button class names (`.submit-btn` and `.btn-submit`) in `client/src/index.css`.
  - Added responsive flex styling with `min-width: 0` to prevent mobile blowout, ensuring horizontal alignment on desktop and vertical stacking on mobile (`@media (max-width: 520px)`).
* **Admin Backend Layering**:
  - Created `server/src/services/adminService.js` containing the knowledge-base business logic, file I/O, validation, chunk slicing/search, and re-indexing.
  - Refactored `server/src/controllers/adminController.js` to strictly handle HTTP requests (parameter parsing, service delegation, error status codes).
  - Renamed `admin.js` to `server/src/routes/adminRoute.js` containing only Express route definitions.
  - Updated `server/src/server.js` route mounting import to `adminRoute.js`.

### 2. Implementation Changes
* **Backend**:
  - `server/src/services/adminService.js`: Business operations (`getAdminStatus`, `listDocuments`, `readDocument`, `saveDocument`, `updateDocument`, `removeDocument`, `getPaginatedChunks`, `executeIndexing`, `sanitizeFilename`).
  - `server/src/controllers/adminController.js`: HTTP handlers (`getStatus`, `getDocuments`, `getDocument`, `createDocument`, `updateDocument`, `deleteDocument`, `getChunks`, `triggerIndexing`).
  - `server/src/routes/adminRoute.js`: Route mappings to `adminController`.
  - `server/src/server.js`: Imported `adminRouter` from `./routes/adminRoute.js`.
  - Deleted legacy `server/src/routes/admin.js`.
* **Frontend**:
  - `client/src/components/user/ChatForm.jsx`: Encapsulated input and button in `.input-group`, used `.submit-btn`.
  - `client/src/index.css`: Fixed `.input-group`, `.chat-input`, `.submit-btn`, `.btn-submit`, and responsive layout.

### 3. Validation Matrix

| # | Validation Item | Test Action | Observed Result | Status |
|---|---|---|---|---|
| 1 | **User Chat CSS** | Inspected DOM and CSS layout | Input and button form a seamless flex group; styled cleanly with borders, focus transitions, and mobile stacking. | **PASSED** |
| 2 | **User Chat Submission** | Submitted `"What is Ben Thanh Market?"` | Returned 200 with answer and 3 sources. Out-of-scope query rejected before Gemini. | **PASSED** |
| 3 | **User/Admin Switching** | Verified role switcher in header | State cleanly toggles between user chat view and admin panel. | **PASSED** |
| 4 | **Admin Document CRUD** | Created, read, updated, deleted `coffee_guide.md` | All operations succeeded (`201 Created` -> `200 OK` -> `200 OK` -> `200 OK`). | **PASSED** |
| 5 | **Chunk Pagination & Search** | Queried `limit=10`, `offset=10`, `limit=30`, `q=Market` | Paginated batches and keyword filtering returned expected slices and metadata. | **PASSED** |
| 6 | **Re-index** | `POST /api/admin/index` | Re-indexed 13 chunks into Qdrant Cloud. | **PASSED** |
| 7 | **Qdrant Retrieval** | Query retrieval test | Cosine distance search in collection `hcmc_travel` operating normally. | **PASSED** |
| 8 | **Backend Startup** | `npm start` root command | Both `server` (port 3000) and `client` (port 5173) boot concurrently without errors. | **PASSED** |
| 9 | **Frontend Build** | `npm run build` in `client/` | Vite build succeeded in 11.69s with zero errors. | **PASSED** |

---

## Log Entry: 2026-10-09 (System Prompt Management & User API Layering)

### 1. Scope & Motivation
* **Admin System Prompt Management**:
  - Replaced hardcoded system prompt in `server/src/rag/generator.js` with dynamically managed, persistent storage in `data/system_prompt.txt`.
  - Added dedicated Admin UI section (`SystemPromptEditor.jsx`) enabling viewing, editing, loading state, error alerts, and saving.
  - Implemented backend endpoints `GET /api/admin/prompt` and `PUT /api/admin/prompt` with strict validation (non-empty string, length 20–10,000 characters).
  - Ensured system prompt is never overwritten on backend restart.
  - Updated `docker-compose.yml` to mount `./data:/app/data` ensuring persistence across container restarts.
* **User API Architecture Refactoring**:
  - Replaced `/api/chat` with `/api/user/chat`.
  - Structured User backend code into routes, controllers, and services mirroring the Admin structure:
    - `server/src/routes/userRoute.js`: Route definitions (`POST /chat`).
    - `server/src/controllers/userController.js`: HTTP request parsing, response formatting, and error handling.
    - `server/src/services/userService.js`: Query validation, Top-K chunk retrieval, similarity threshold guardrail, and grounded generation invocation.
  - Updated frontend `client/src/services/userApi.js`, `README.md`, and `docs/architecture.md` to target `/api/user/chat`.

### 2. Implementation Changes
* **Backend**:
  - `server/src/config.js`: Added `promptFile` configuration path (`data/system_prompt.txt`).
  - `server/src/services/adminService.js`: Added `DEFAULT_SYSTEM_PROMPT`, `getSystemPrompt()`, and `saveSystemPrompt()`.
  - `server/src/controllers/adminController.js`: Added `getPrompt` and `updatePrompt` HTTP handlers.
  - `server/src/routes/adminRoute.js`: Mounted `GET /prompt` and `PUT /prompt`.
  - `server/src/rag/generator.js`: Updated `buildGroundedPrompt()` and `generateGroundedAnswer()` to use dynamically loaded system prompt via `getSystemPrompt()`.
  - `server/src/services/userService.js`: Created dedicated user service orchestrating chat workflow.
  - `server/src/controllers/userController.js`: Created HTTP controller for user chat.
  - `server/src/routes/userRoute.js`: Created user router.
  - `server/src/server.js`: Mounted `app.use('/api/user', userRouter)` and removed inline chat logic.
  - `docker-compose.yml`: Updated volumes to `./data:/app/data` and added `PROMPT_FILE` env variable.
* **Frontend**:
  - `client/src/services/userApi.js`: Updated `sendChatMessage()` to call `/api/user/chat`.
  - `client/src/services/adminApi.js`: Added `fetchSystemPrompt()` and `updateSystemPrompt()`.
  - `client/src/components/admin/SystemPromptEditor.jsx`: Created editor component for prompt viewing and modification.
  - `client/src/components/admin/AdminDashboard.jsx`: Rendered `SystemPromptEditor`.
  - `client/src/index.css`: Styled `.prompt-textarea`.

### 3. Validation Matrix

| # | Validation Item | Test Action | Observed Result | Status |
|---|---|---|---|---|
| 1 | **System Prompt Loading** | `GET /api/admin/prompt` | Loaded active prompt (572 chars) successfully. | **PASSED** |
| 2 | **Prompt Validation** | `PUT /api/admin/prompt` with empty & short strings | Returned HTTP 400 with descriptive error messages. | **PASSED** |
| 3 | **Prompt Saving & Dynamic Use** | Saved prompt with custom directive (`Xin chao!`) | `POST /api/user/chat` immediately produced response starting with "Xin chao!" and valid citations. | **PASSED** |
| 4 | **Prompt Persistence Across Restart** | Stopped and restarted backend process | Subsequent `GET /api/admin/prompt` retained the modified prompt without being overwritten. | **PASSED** |
| 5 | **User Chat Normal Query** | `POST /api/user/chat` with `"What is Ben Thanh Market?"` | Returned HTTP 200 with grounded answer and 3 sources. | **PASSED** |
| 6 | **User Chat Out-of-Scope Query** | `POST /api/user/chat` with `"What is linear algebra?"` | Refusal returned immediately without invoking Gemini LLM. | **PASSED** |
| 7 | **User Chat Empty Input** | `POST /api/user/chat` with `""` | Returned HTTP 400 Bad Request. | **PASSED** |
| 8 | **Frontend Build** | `npm run build` in `client/` | Vite build passed in 20.5s with zero errors (`dist/assets/index-Cf99hfZs.js`). | **PASSED** |
| 9 | **Backend Startup** | Booted server on port 3000 | Successfully connected to Qdrant Cloud and loaded collection. | **PASSED** |
| 10 | **User/Admin Switching** | Toggled role button | Both views functional and integrated without conflict. | **PASSED** |




