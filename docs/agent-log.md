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
  - `EMBEDDING_MODEL` (e.g., `text-embedding-004`)
  - `GEMINI_MODEL` (e.g., `gemini-1.5-flash` or `gemini-2.0-flash`)

### 3. Decisions & Trade-Offs
* **Native Cosine Similarity vs. External DB**: In-memory math takes < 15 lines of code, runs in under 2ms for small corpora, eliminates deployment and dependency complexity, and is easily explained in a midterm presentation.
* **Decoupled RAG modules**: `src/rag/retriever.js` and `src/rag/generator.js` are separated so retrieval can be verified on its own before testing the LLM generation step.
* **Static frontend in Express**: Removing a separate frontend dev server means running the app only requires `npm start`.

### 4. Next Phase
* Ready for implementation upon confirmation:
  1. Initialize `package.json` with minimal dependencies (`express`, `dotenv`, `@google/genai` or `@google/generative-ai`).
  2. Create sample knowledge base files in `data/knowledge/`.
  3. Implement RAG pipeline modules in `src/rag/`.
  4. Implement `src/server.js` with `GET /api/health` and `POST /api/chat`.
  5. Build minimal frontend in `public/`.
