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
* Phase 4: UI integration and polish (e.g. sample suggestion chips, responsive styling, or React frontend as specified for later phases).

