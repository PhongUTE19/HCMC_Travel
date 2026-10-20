# Lumen Institute Student Handbook 2026–2027 RAG Assistant

An authoritative question-answering assistant for the **Lumen Institute of Technology — Student Handbook 2026–2027** built using Retrieval-Augmented Generation (RAG) with Google Gemini, Qdrant Cloud vector database, Supabase analytics, an Express.js backend, and a React frontend.

---

## Project Overview

The Student Handbook Assistant helps undergraduate students at Lumen Institute of Technology query official university policies, tuition structures, credit overload rules, scholarships, dormitory curfews, exam rules, graduation requirements, and recent amendments.

### Key Capabilities

1. **Grounded Question Answering**: Retrieves authoritative section chunks and generates factually grounded responses citing specific handbook sections.
2. **Relevance Guardrail Gate**: Applies a cosine similarity cutoff (`SIMILARITY_THRESHOLD = 0.60`). Queries failing the threshold receive a safe refusal without calling generative LLMs, saving latency and API cost.
3. **Real-time SSE Streaming**: Emits Server-Sent Events (`metadata`, `delta`, `done`, `error`) with smooth client-side token reveal and fade-in animations.
4. **Interactive Retrieval Diagnostics**: In-UI transparency allowing inspection of candidate pools, similarity scores, ranks, and threshold pass/filter decisions.
5. **Admin Knowledge Management**:
   - Section-aware Markdown parsing and chunk inspection with search, sorting, and pagination.
   - Document CRUD operations stored in `data/knowledge/`.
   - One-click cloud re-indexing into Qdrant Cloud (`Student_Handbook` collection).
   - System prompt customization with instant restore to default template (`data/prompts/`).
6. **AI Provider Abstraction Layer**: Lightweight, provider-independent interface (`embedText`, `generateAnswer`, `generateAnswerStream`) supporting pluggable AI backends with Google Gemini as the reference implementation.
7. **AI Usage Analytics & Telemetry**: Automatically tracks request counts, token usage (prompt, completion, total), latencies (P50, P95), and estimated costs with dual-mode persistence (Supabase PostgreSQL with in-memory buffer fallback).

---

## Technology Stack

* **Frontend**: React 18, Vite 6, Vanilla CSS modular design system.
* **Backend**: Node.js (v20+ / v22), Express.js 4/5 (Feature-first modular architecture).
* **AI Provider Abstraction**: Provider-independent registry in `server/src/shared/integrations/ai/`.
* **Default LLM Provider & Model**: Google Gemini via official `@google/genai` SDK, model **`gemini-3.5-flash-lite`**.
* **Embedding Model & Vector Dimension**: Google Gemini **`gemini-embedding-001`** (**3072** dimensions, `Cosine` metric).
* **Vector Database**: **Qdrant Cloud** (managed cluster over HTTPS, collection: `Student_Handbook`).
* **Database & Telemetry**: **Supabase** (`@supabase/supabase-js`) for analytics persistence + in-memory circular fallback.
* **Validation & Error Handling**: Zod runtime schema validation (`validateRequest.js`), centralized operational error pipeline (`AppError.js`, `errorHandler.js`).

---

## Knowledge-Base Processing

### Source Document & Format
* **Location**: `data/knowledge/KB-A_Lumen-Institute-Student-Handbook.md`
* **Supported Format**: Markdown (`.md`) formatted with Level-2 headings (`## `) and Markdown tables.

### Chunking Strategy
* **Implementation**: `server/src/features/knowledge/chunker.js`.
* **Strategy**: Section-based chunking on Markdown Level-2 headings (`## `).
* **Guarantees**: Chunking preserves entire logical sections without mid-table or mid-rule splits. Complex structured sections—such as the Section 2 Programs table and Section 11 Amendment overrides—remain intact within single coherent chunks.
* **Extracted Chunk Metadata**:
  - `id`: Unique identifier formatted as `${baseId}_sec${sectionNumber}` (e.g., `KB-A_Lumen-Institute-Student-Handbook_sec2`).
  - `sectionNumber`: Integer extracted from the header (1 to 12).
  - `sectionTitle`: Clean title string (e.g., `"Programs at a Glance"`).
  - `title`: Full heading string (e.g., `"2. Programs at a Glance"`).
  - `source`: Source filename (`KB-A_Lumen-Institute-Student-Handbook.md`).
  - `content`: Complete Markdown section body text.

### Embedding Generation & Indexing
* **Embeddings**: Generated via `embedText()` in `server/src/shared/integrations/ai/` using `gemini-embedding-001`.
* **Resilience**: Embedded with exponential backoff retry logic handling transient HTTP 503 or 429 errors.
* **Idempotent Cloud Indexing**: Executed via `server/src/features/knowledge/indexer.js` (`npm run index`). Recreates and populates the Qdrant Cloud collection to prevent stale points.

---

## Setup and Environment Configuration

### Prerequisites
* [Node.js](https://nodejs.org/) v20.x or v22.x
* [npm](https://www.npmjs.com/) v9+
* Google Gemini API key
* Managed Qdrant Cloud cluster and API key
* Supabase project URL and service role key (optional, for persistent AI analytics)

### Environment Variables
Configure environment variables in a single `.env` file at the project root (see `.env.example`):

| Variable Name | Description | Default / Example Value |
|---|---|---|
| `PORT` | Express backend port | `3000` |
| `AI_PROVIDER` | AI provider implementation key | `gemini` |
| `GEMINI_API_KEY` | Google Gemini API key (Required for Gemini) | `your_gemini_api_key_here` |
| `GEMINI_MODEL` | Generative LLM model ID | `gemini-3.5-flash-lite` |
| `EMBEDDING_MODEL` | Text embedding model ID | `gemini-embedding-001` |
| `TOP_K` | Number of chunks to retrieve | `4` |
| `SIMILARITY_THRESHOLD` | Cosine similarity cutoff for RAG generation | `0.60` |
| `QDRANT_URL` | Qdrant Cloud cluster endpoint | `https://<cluster-id>.<region>.cloud.qdrant.io:6333` |
| `QDRANT_API_KEY` | Qdrant Cloud secret API key | `your_qdrant_cloud_api_key_here` |
| `QDRANT_COLLECTION_NAME` | Vector collection name | `Student_Handbook` |
| `PROMPT_FILE` | Persistent system prompt file path | `data/prompts/system_prompt.txt` |
| `PROMPT_FILE_DEFAULT` | Default system prompt template path | `data/prompts/system_prompt_default.txt` |
| `KNOWLEDGE_DIR` | Knowledge base directory path | `data/knowledge` |
| `SUPABASE_URL` | Supabase project URL (Analytics) | `https://your-project.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase service role key (or `SUPABASE_KEY`) | `your_supabase_service_role_key` |

> [!NOTE]
> All credentials remain strictly on the backend. No API keys or internal database URLs are exposed to the client.

---

## Run Instructions

### 1. Install Dependencies
```bash
npm run install:all
```
*(Installs dependencies for root, `server/`, and `client/`).*

### 2. Index the Knowledge Base
```bash
npm run index
```
*(Embeds all handbook sections and upserts them into Qdrant Cloud).*

### 3. Start the Development Servers
```bash
npm start
# or
npm run dev
```
*(Concurrently launches the Express server on port 3000 and the Vite frontend on port 5173).*

### 4. Application Access URLs
* **User Chat & Assistant UI**: [http://localhost:5173](http://localhost:5173)
* **Backend API Base**: [http://localhost:3000](http://localhost:3000)
* **Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### 5. Docker Deployment (Optional)
```bash
# Build and run containers
npm run docker:up

# Run indexing inside container
npm run docker:index

# Tear down containers
npm run docker:down
```

---

## Testing & Quality Assurance

The project includes unit, schema, regression, and live integration tests:

### 1. Default Unit & Component Tests (Offline, No API Costs)
```bash
npm test
```
Runs the core RAG test suite (`test/rag.test.js`) verifying chunking, table preservation, cosine math, guardrails, SSE streaming, and error handling.

### 2. Dedicated Feature Test Suites
```bash
# AI provider abstraction test suite
node --test test/aiProvider.test.js

# Analytics repository, writer, and telemetry test suite
node --test test/analytics.test.js

# Client collection utilities (pagination, search, sorting)
node --test test/collectionUtils.test.js

# Backend and client validation test suites
node --test test/validation.test.js
node --test test/tableUtils.test.js
```

### 3. Live Integration Tests (Requires Active Cloud Credentials)
```bash
npm run test:integration
```
Runs live end-to-end queries against Qdrant Cloud and Gemini, testing tuition questions, Section 11 installment overrides, make-up exam fees, and out-of-scope refusals.

### 4. Run All Test Suites
```bash
npm run test:all
```

---

## Retrieval Diagnostics & Inspection

Every answer returned by the assistant includes real-time diagnostics:
* **Candidate Pool**: Inspect candidate chunk count and top similarity score.
* **Threshold Status**: Green badge (`Passed to LLM`) for chunks meeting $\ge 0.60$; Red badge (`Filtered out (< 0.6)`) for withheld chunks.
* **Chunk Cards**: Display rank, cosine score, source file, section title, and expandable body text for complete transparency.

---

## Common Troubleshooting

* **Server Port in Use**: If port 3000 is occupied, set `PORT=3001` in `.env` and restart.
* **Transient LLM 503 / 429 Errors**: The backend automatically retries up to 3 times with exponential backoff.
* **Qdrant Connection Issues**: Verify `QDRANT_URL` and `QDRANT_API_KEY` in `.env`. Ensure your cloud cluster status is active.
* **Missing Analytics Data**: If `SUPABASE_URL` or `SUPABASE_SECRET_KEY` is not provided, the application automatically switches to in-memory buffering without crashing or interrupting chat requests.
* **Unsynced Chunks**: If markdown files in `data/knowledge/` are modified, run `npm run index` to synchronize Qdrant Cloud.
