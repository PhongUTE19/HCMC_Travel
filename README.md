# Lumen Institute Student Handbook 2026–2027 RAG Assistant

An authoritative question-answering assistant for the **Lumen Institute of Technology — Student Handbook 2026–2027** built using Retrieval-Augmented Generation (RAG) with Google Gemini, Qdrant Cloud vector database, an Express.js backend, and a React frontend.

---

## Project Overview

The Student Handbook Assistant helps undergraduate students at Lumen Institute of Technology query official university policies, tuition structures, credit overload rules, scholarships, dormitory curfews, exam rules, graduation requirements, and recent amendments.

### RAG Architecture

1. **Knowledge Ingestion**: The authoritative Markdown document (`data/knowledge/KB-A_Lumen-Institute-Student-Handbook.md`) is ingested and partitioned into section-aware chunks demarcated by Level-2 headers (`## `).
2. **Dense Vector Embeddings**: Each section is converted into a 3072-dimensional vector embedding using Google Gemini's embedding model and indexed into a managed Qdrant Cloud vector database.
3. **Retrieval**: When a student enters a question, the query is converted into an embedding and matched against indexed sections using cosine similarity. A candidate pool is inspected to ensure relevant amendment provisions (Section 11) are retrieved alongside base policies.
4. **Guardrail Gate**: If the top similarity score is below `SIMILARITY_THRESHOLD` (0.60), the query is safely rejected without invoking the generative LLM, returning a clear response that the handbook lacks information.
5. **Grounded Generation**: For queries passing the threshold, the retrieved sections are injected into a strict prompt. The LLM generates a concise, factually grounded response citing exact section names and chunk identifiers.
6. **Diagnostics & Inspection**: Every response includes retrieval diagnostic metadata allowing inspection of candidate chunks, ranks, scores, and filtering decisions before and after generation.

---

## Technology Stack

The project uses the following verified technologies and model IDs:

* **Frontend Framework**: React 18, Vite 6, Vanilla CSS design system.
* **Backend Framework**: Node.js (v20+ / v22), Express.js 4.
* **LLM Provider & Model ID**: Google Gemini via official `@google/genai` SDK, model ID **`gemini-3.5-flash-lite`**.
* **Embedding Provider & Model ID**: Google Gemini via `@google/genai` SDK, model ID **`gemini-embedding-001`** (vector dimension: **3072**).
* **Vector Database & Collection**: **Qdrant Cloud** (managed cloud cluster over HTTPS), Collection name: **`student_handbook`** (distance metric: `Cosine`).

---

## Knowledge-Base Processing

### Source Document & Format
* **Location**: `data/knowledge/KB-A_Lumen-Institute-Student-Handbook.md`
* **Supported Format**: Markdown (`.md`) with Level-2 headings (`## `) and Markdown tables.

### Chunking Strategy
* **Strategy**: Section-based chunking on Markdown Level-2 headings (`## `).
* **Chunk Size & Overlap**: Chunking is strictly section-based rather than based on fixed character counts or token counts. There is **no numeric chunk size limit** and **no sliding window overlap** configured. This design guarantees that complete structured content—specifically the Section 2 Programs table (headers, separator, and all rows) and Section 11 Amendments—remains unified in single, coherent chunks without mid-table or mid-rule splits.
* **Extracted Chunk Metadata**:
  - `id`: Unique identifier formatted as `${baseId}_sec${sectionNumber}` (e.g., `KB-A_Lumen-Institute-Student-Handbook_sec2`).
  - `sectionNumber`: Integer extracted from the header (1 to 12).
  - `sectionTitle`: Clean title string (e.g., `"Programs at a Glance"`).
  - `title`: Full heading string (e.g., `"2. Programs at a Glance"`).
  - `source`: Source filename (`KB-A_Lumen-Institute-Student-Handbook.md`).
  - `content`: Complete Markdown section body text.

### Embedding Generation
* Implemented in `server/src/rag/gemini.js` (`embedText()`).
* Embeds `${chunk.title}\n${chunk.content}` using model `gemini-embedding-001`.
* Wrapped with an automated `withRetry()` helper that handles transient API spikes (HTTP 503 UNAVAILABLE or 429 RATE_LIMIT) with exponential backoff.

### Indexing & Idempotency
* Implemented in `server/src/rag/indexer.js` (`npm run index`).
* **Repeatable Re-Indexing**: To prevent stale or duplicate chunks from prior runs or legacy datasets, `initVectorStore({ reset: true })` checks for the collection in Qdrant Cloud. If present, it deletes the collection and recreates it before points are upserted. This guarantees that re-indexing is fully idempotent and the collection contains exactly the 12 active sections.

---

## Setup and Execution

### Prerequisites
* [Node.js](https://nodejs.org/) v20.x or v22.x
* [npm](https://www.npmjs.com/) v9+
* A Google Gemini API key
* A managed Qdrant Cloud cluster with an API key

### Environment Variables
Configure environment variables in a single `.env` file at the project root (see `.env.example`):

| Variable Name | Description | Default / Example Value |
|---|---|---|
| `PORT` | Express backend port | `3000` |
| `GEMINI_API_KEY` | Google Gemini API key (Required) | `your_gemini_api_key` |
| `GEMINI_MODEL` | Google Gemini LLM model ID | `gemini-3.5-flash-lite` |
| `EMBEDDING_MODEL` | Google Gemini embedding model ID | `gemini-embedding-001` |
| `TOP_K` | Number of chunks to retrieve | `4` |
| `SIMILARITY_THRESHOLD` | Minimum cosine similarity score | `0.60` |
| `QDRANT_URL` | Qdrant Cloud cluster endpoint | `https://<cluster-id>.<region>.cloud.qdrant.io` |
| `QDRANT_API_KEY` | Qdrant Cloud API key | `your_qdrant_api_key` |
| `QDRANT_COLLECTION_NAME` | Vector collection name | `student_handbook` |
| `PROMPT_FILE` | Persistent system prompt file path | `data/system_prompt.txt` |
| `KNOWLEDGE_DIR` | Directory containing knowledge files | `data/knowledge` |

> [!NOTE]
> All credentials remain strictly on the backend. No API keys or internal endpoints are exposed to the frontend.

### Installation & Execution Steps

1. **Install Dependencies**:
   ```bash
   npm run install:all
   ```

2. **Index the Student Handbook**:
   ```bash
   npm run index
   ```
   *(Indexes all 12 handbook sections into Qdrant Cloud).*

3. **Start the Application**:
   ```bash
   npm start
   ```
   *(Starts backend on port 3000 with `--watch` and Vite frontend on port 5173).*

4. **Access the Application**:
   * **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   * **Backend API**: [http://localhost:3000](http://localhost:3000)
   * **Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## Running Tests

The test suite separates automated offline verification from live external integration tests:

### 1. Automated Unit & Mock Tests (Default, No Live API Calls)
Runs offline tests using Node's native test runner with mocks for external services. Requires no API keys and incurs no costs:
```bash
npm test
```
**Tests Covered**:
* Document loading and section-aware chunking for all 12 sections.
* Section 2 table column-to-row integrity.
* Section 11 override provisions integrity.
* Vector similarity math and cosine distance calculation.
* Mocked idempotent indexing and Qdrant collection reset.
* Out-of-scope query guardrail rejection without invoking LLM.
* Structured error handling for vector database failures and LLM errors.
* Complete chat response and retrieval diagnostics contract.

### 2. Live End-to-End Integration Tests (Requires Credentials)
Runs live queries against the Qdrant Cloud collection and Gemini generation API:
```bash
npm run test:integration
```
Verifies live queries for Honors tuition, Section 11 installment plan overrides, updated make-up exam fees, library fine amendments, and cryptocurrency refusal.

### 3. Run All Tests
```bash
npm run test:all
```

---

## Retrieval Debugging & Chunk Inspection

Every answer returned by the chatbot includes interactive retrieval diagnostics:

1. **Visible Control**: Click the **`Show retrieved chunks`** button located directly beneath any assistant answer.
2. **Diagnostics Summary Bar**: Displays candidate pool count, active similarity threshold (0.60), top similarity score, and generation status.
3. **Chunk Card Badges**:
   * **Rank (`#1`, `#2`, ...)**: The retrieval order returned by the vector database.
   * **Similarity Score (`Score: 0.7313`)**: The cosine similarity between the query embedding and the section vector (scale 0.0 to 1.0).
   * **Status Badge**:
     - `Passed to LLM`: Green badge indicating the chunk met the threshold and was provided to Gemini as context.
     - `Filtered out (< 0.6)`: Red badge indicating the chunk fell below the relevance threshold and was withheld from generation.
   * **Source & Chunk ID**: Filename (`KB-A_Lumen-Institute-Student-Handbook.md`) and section ID (`..._secN`).
   * **Section Title**: Heading of the section.
   * **Content View**: Click **`Expand content`** to inspect the exact retrieved text, ensuring full transparency of vector search results.

---

## Common Troubleshooting

* **Server Port 3000 in Use**: If port 3000 is occupied, set `PORT=3001` in `.env` and restart.
* **Transient Gemini 503 / 429 Errors**: The backend automatically retries up to 3 times with exponential backoff.
* **Qdrant Connection Error**: Verify `QDRANT_URL` and `QDRANT_API_KEY` in `.env`. Ensure your cloud cluster status is active.
* **Unsynced Chunks**: If chunks are modified, execute `npm run index` to re-index the collection.
