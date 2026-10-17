# RAG Configuration and Architecture Audit

> **System**: Lumen Institute of Technology — Student Handbook 2026–2027 RAG Assistant  
> **Audit Date**: 2026-10-09  
> **Verification Status**: Verified via runtime inspection, static code analysis, and automated test execution.

---

## 1. Executive Configuration Summary

The following table summarizes the primary RAG parameters actively implemented in the codebase:

| Setting | Actual Value | Unit | Configured In |
|---|---|---|---|
| **Chunking strategy** | Section-based chunking on Markdown Level-2 headers (`## `) | — | [`server/src/rag/chunker.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/chunker.js#L24-L67) |
| **Chunk size** | Varies by section length (min: 286, max: 565, avg: 398.17 chars; tokens not measured) | Characters (no token limit) | [`server/src/rag/chunker.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/chunker.js) (unbounded per section) |
| **Chunk overlap** | `0` (no overlap) | Characters/tokens | Not configured ([`server/src/rag/chunker.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/chunker.js)) |
| **Embedding model** | `gemini-embedding-001` | — | [`server/src/config.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L16) (`EMBEDDING_MODEL`) |
| **Embedding dimensions** | `3072` | Dimensions | [`server/src/config.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L24) (`config.vectorSize`) |
| **Vector database** | Qdrant Cloud (Managed cluster over HTTPS) | — | [`server/src/config.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L20) (`QDRANT_URL`) |
| **Distance metric** | `Cosine` | — | [`server/src/config.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L25) / Qdrant collection schema |
| **Top-K** | `4` | Chunks | [`server/src/config.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L18) (`TOP_K`) |
| **Candidate pool size** | `6` (`Math.max(topK, 6)`) | Chunks | [`server/src/rag/retriever.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/retriever.js#L61) |
| **Similarity threshold** | `0.60` | Score (Cosine similarity) | [`server/src/config.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L17) (`SIMILARITY_THRESHOLD`) |
| **Maximum context size** | Not explicitly configured (Provider default: 1M+ tokens for Gemini 3.5 Flash Lite) | Tokens | Not configured in application code |
| **Maximum output tokens** | Not explicitly configured (Provider default for Gemini 3.5 Flash Lite) | Tokens | Not configured in [`server/src/rag/gemini.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/gemini.js#L73) |
| **Temperature** | Not explicitly configured (Provider default for Gemini 3.5 Flash Lite) | — | Not configured in [`server/src/rag/gemini.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/gemini.js#L73) |

---

## 2. Configuration Reference by Subsystem

### A. Knowledge Base and Ingestion Configuration

| Setting Name | Actual Value / Behavior | Unit | Source File & Function | Explanation |
|---|---|---|---|---|
| **Source document path** | `data/knowledge/` (`data/knowledge/KB-A_Lumen-Institute-Student-Handbook.md`) | File path | [`server/src/config.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L19) (`config.knowledgeDir`) | Directory where ground-truth Markdown documents reside. |
| **Supported file formats** | `.md` only | Extension | [`server/src/rag/chunker.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/chunker.js#L16) (`loadAndChunkMarkdown`) | Filtered via `files.filter(f => f.endsWith('.md'))`. Non-markdown files are ignored. |
| **Number of documents** | `1` document | Count | Filesystem (`data/knowledge/`) | Exactly 1 authoritative document: `KB-A_Lumen-Institute-Student-Handbook.md`. |
| **Number of sections** | `12` sections | Count | Verified by parser & Qdrant | Sections 1 through 12, covering About, Programs, Tuition, Overload, Library, Scholarships, Exams, Dorms, Warnings, Graduation, Amendments, FAQs. |
| **Document loading method** | Synchronous UTF-8 file read (`fs.readFileSync`) | — | [`server/src/rag/chunker.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/chunker.js#L21) (`loadAndChunkMarkdown`) | Reads raw file text into memory during chunking. |
| **Section/header parsing rules** | Split by lines starting with `## ` | Regex / Prefix | [`server/src/rag/chunker.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/chunker.js#L31) | Markdown H2 headers define boundaries. H1 title is ignored; lines prior to first H2 are skipped. |
| **Metadata extraction rules** | `^(\d+)\.\s*(.*)$` | Regex | [`server/src/rag/chunker.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/chunker.js#L36) | Parses integer section number and section title from header string. |
| **Re-indexing behavior** | Collection reset then upsert (`initVectorStore({ reset: true })`) | — | [`server/src/rag/indexer.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/indexer.js#L21) (`runIndexer`) | Deletes existing collection in Qdrant and recreates it before insertion. |
| **Duplicate prevention** | Collection recreation on indexing | — | [`server/src/rag/vector_store.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/vector_store.js#L39-L49) (`initVectorStore`) | Prevents duplicate vectors by purging previous collection contents completely. |
| **Stale chunk removal** | Full purge on re-index | — | [`server/src/rag/vector_store.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/vector_store.js#L40) (`client.deleteCollection`) | Legacy chunks from deleted files (such as old travel documents) are fully eliminated. |
| **Ingestion error handling** | Directory existence check with clear exception throw | — | [`server/src/rag/chunker.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/chunker.js#L12) | Throws `Error('Knowledge directory does not exist: ...')` if path is missing. |

---

### B. Chunking Configuration & Detailed Statistics

#### 1. Strategy & Boundary Rules
* **Strategy**: Semantic section-level splitting on Markdown H2 headers (`## `).
* **Chunk Boundary Rules**: A chunk starts immediately after a line beginning with `## ` and continues until the next `## ` or end-of-file.
* **Chunk Size Limit**: **Not explicitly configured**. No maximum character or token cutoff exists in `chunker.js`. The effective chunk size is determined entirely by the length of each author-written Markdown section.
* **Chunk Overlap**: **0** (no overlap). Overlap is **not configurable** in the current implementation.
* **Handling of Oversized Sections**: Oversized sections are **not split**. If an individual section were to exceed an embedding model's context limit, the current chunker would pass the entire section to the API, causing an API rejection. (In the current handbook, however, all sections are well below context limits).
* **Table Integrity**: Tables are kept **completely intact**. Because splitting occurs strictly on `## `, Section 2's Markdown table (headers, divider, and all 5 rows) is preserved without any mid-table truncation.
* **Headings in Chunk Content**: The `## ` header line itself is **stripped from the body content** and stored separately in `chunk.title`, `chunk.sectionTitle`, and `chunk.sectionNumber`.
* **Headings in Embedding Input**: **Included**. In `server/src/rag/indexer.js#L27`, the embedding input text is explicitly assembled as `${chunk.title}\n${chunk.content}`.
* **Chunk ID Format**: `${baseId}_sec${sectionNumber}` (e.g., `KB-A_Lumen-Institute-Student-Handbook_sec2`).
* **Chunk Payload Fields**: `id`, `sectionNumber`, `sectionTitle`, `title`, `source`, `content`.

#### 2. Actual Handbook Chunk Statistics

> [!NOTE]
> Character counts represent raw UTF-8 string lengths measured directly from the parsed chunks. Token counts were **not measured** because no local tokenizer is configured in this Node.js project.

* **Total Chunks**: `12`
* **Minimum Chunk Length**: `286` characters (Section 9: Academic Warning and Probation)
* **Maximum Chunk Length**: `565` characters (Section 5: Library)
* **Average Chunk Length**: `398.17` characters
* **Total Characters Across All Chunks**: `4,778` characters

#### 3. Length Distribution by Section

| Section # | Chunk Identifier | Section Title | Content Chars | Header + Content Chars | Line Count | Table Present? |
|---|---|---|---|---|---|---|
| **1** | `KB-A_..._sec1` | About This Handbook | 353 | 376 | 1 | No |
| **2** | `KB-A_..._sec2` | Programs at a Glance | 309 | 333 | 7 | **Yes (5 rows)** |
| **3** | `KB-A_..._sec3` | Paying Tuition | 407 | 425 | 3 | No |
| **4** | `KB-A_..._sec4` | Course Registration and Credit Overload | 496 | 539 | 7 | No |
| **5** | `KB-A_..._sec5` | Library | 565 | 576 | 9 | No |
| **6** | `KB-A_..._sec6` | Scholarships | 402 | 418 | 4 | No |
| **7** | `KB-A_..._sec7` | Exam Rules | 419 | 433 | 3 | No |
| **8** | `KB-A_..._sec8` | Dormitory | 304 | 317 | 5 | No |
| **9** | `KB-A_..._sec9` | Academic Warning and Probation | 286 | 320 | 1 | No |
| **10** | `KB-A_..._sec10` | Graduation Requirements | 340 | 368 | 6 | No |
| **11** | `KB-A_..._sec11` | Amendments (approved November 2026) | 485 | 525 | 4 | No |
| **12** | `KB-A_..._sec12` | Frequently Asked Questions | 412 | 443 | 8 | No |

---

### C. Embedding Configuration

| Setting | Value / Implementation | Source Location | Description |
|---|---|---|---|
| **Embedding Provider** | Google Gemini (`@google/genai` v2.27.0 SDK) | [`server/src/rag/gemini.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/gemini.js#L1) | Official Google GenAI Node.js SDK. |
| **Embedding Model ID** | `gemini-embedding-001` | [`server/src/config.js#L16`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L16) | Configurable via `EMBEDDING_MODEL` in `.env`. |
| **Embedding Input Construction** | `${chunk.title}\n${chunk.content}` | [`server/src/rag/indexer.js#L27`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/indexer.js#L27) | Prepend section title to content to enrich semantic density. |
| **Query Embedding Construction** | `query.trim()` | [`server/src/rag/retriever.js#L57`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/retriever.js#L57) | Whitespace-trimmed raw query string. |
| **Vector Dimensions** | `3072` | [`server/src/config.js#L24`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L24) | Native output dimension of `gemini-embedding-001`. |
| **Distance Metric** | `Cosine` | [`server/src/config.js#L25`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L25) | Matched to normalized vector space in Qdrant. |
| **Batch Size** | `1` (sequential loop) | [`server/src/rag/indexer.js#L24`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/indexer.js#L24) | Chunks embedded sequentially one-by-one. |
| **Retry Count** | `3` attempts | [`server/src/rag/gemini.js#L19`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/gemini.js#L19) (`withRetry`) | Retries transient errors (`503 UNAVAILABLE`, `429 RATE_LIMIT`). |
| **Retry Backoff Strategy** | Exponential backoff (`1200ms * 2^(attempt-1)`) | [`server/src/rag/gemini.js#L32`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/gemini.js#L32) | Backoff intervals: 1.2s, 2.4s, 4.8s. |
| **Timeout Behavior** | Not explicitly configured | Provider default | Relies on underlying Node.js `fetch` default timeout. |
| **Vector Normalization** | Application normalization: None | Gemini API native | `gemini-embedding-001` returns pre-normalized unit vectors. |

---

### D. Vector Database Configuration (Qdrant Cloud)

* **Provider**: Qdrant Cloud (Managed Cluster, `@qdrant/js-client-rest` v1.19.0).
* **Collection Name**: `student_handbook` (configured via `QDRANT_COLLECTION_NAME` in `.env`).
* **Vector Configuration**:
  - `size`: `3072`
  - `distance`: `Cosine`
  - `on_disk_payload`: `true`
* **HNSW Index Parameters** (retrieved directly from Qdrant Cloud collection metadata):
  - `m`: `16`
  - `ef_construct`: `100`
  - `full_scan_threshold`: `10000`
* **Point ID Strategy**: Sequential 1-based integers (`1` to `12`) matching chunk loop index.
* **Payload Fields**:
  - `id`: String chunk ID (e.g., `KB-A_Lumen-Institute-Student-Handbook_sec2`)
  - `sectionNumber`: Integer (1 to 12)
  - `sectionTitle`: String (e.g., `Programs at a Glance`)
  - `title`: String (e.g., `2. Programs at a Glance`)
  - `source`: String (`KB-A_Lumen-Institute-Student-Handbook.md`)
  - `content`: String (Markdown section text)
* **Upsert Behavior**: `client.upsert(collection, { wait: true, points })` ensures vectors and payload are committed before reporting indexing completion.
* **Reset & Purge Mechanism**: `initVectorStore({ reset: true })` checks collection existence via `client.collectionExists()`, deletes it if present, and recreates it.

---

### E. Retrieval Configuration

```
User Query: "Can Honors Program students pay tuition using the installment plan?"
   │
   ▼
1. embedText(query) ──> 3072-dim query embedding vector
   │
   ▼
2. client.query(collection, { limit: 6, with_payload: true })
   │
   ├── Candidate Pool: 6 points retrieved by cosine similarity
   │     1. Sec 3 (Paying Tuition) - score: 0.7076
   │     2. Sec 2 (Programs at a Glance) - score: 0.6468
   │     3. Sec 10 (Graduation Requirements) - score: 0.6175
   │     4. Sec 11 (Amendments) - score: 0.6075
   │     5. Sec 6 (Scholarships) - score: 0.5980
   │     6. Sec 7 (Exam Rules) - score: 0.5890
   │
   ▼
3. Primary Top-K Slice: candidates.slice(0, 4)
   │
   ▼
4. Amendment-Aware Grounding Check:
   Is an amendment chunk present in candidate pool with score >= 0.55?
   ├── Yes (Sec 11 has score 0.6075 >= 0.55)
   └── Is it already in primary slice? (Yes, rank 4) -> Retained in context
   │
   ▼
5. Relevance Threshold Guardrail Gate:
   bestScore = 0.7076 >= SIMILARITY_THRESHOLD (0.60)?
   ├── ACCEPTED (>= 0.60) ──> Pass retrieved chunks to generateGroundedAnswer()
   └── REJECTED (< 0.60)  ──> Early return "The provided Student Handbook does not..." (Gemini skipped)
```

| Retrieval Parameter | Actual Value | Configured In | Notes |
|---|---|---|---|
| **Retrieval Strategy** | Dense vector search (Cosine similarity) | [`server/src/rag/retriever.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/retriever.js#L60) | Uses Qdrant Cloud HNSW index. Sparse/BM25 hybrid search is **not implemented**. |
| **Top-K (`topK`)** | `4` | [`server/src/config.js#L18`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L18) | Configurable via `TOP_K` in `.env`. |
| **Candidate Pool Size** | `6` (`Math.max(topK, 6)`) | [`server/src/rag/retriever.js#L61`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/retriever.js#L61) | Qdrant query limit fetching broader candidates to detect relevant amendments. |
| **Amendment Retrieval Rule** | `score >= 0.55` | [`server/src/rag/retriever.js#L91-L100`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/retriever.js#L91-L100) | If Section 11 is in candidates with score $\ge 0.55$ and not in top-K, it is appended to selected context. |
| **Similarity Threshold** | `0.60` | [`server/src/config.js#L17`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L17) | Configurable via `SIMILARITY_THRESHOLD` in `.env`. |
| **Threshold Evaluation Order** | Evaluated on `bestScore` (Rank 1) **before** LLM generation | [`server/src/services/userService.js#L54`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/services/userService.js#L54) | If `bestScore < 0.60`, LLM call is bypassed completely. |
| **Metadata Filters** | None | [`server/src/rag/retriever.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/retriever.js) | No payload filtering applied during search. |
| **Deduplication** | Unique chunk ID set check | [`server/src/rag/retriever.js#L98`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/retriever.js#L98) | Prevents duplicate chunk inclusion when appending amendments. |
| **Behavior on 0 Chunks** | Returns empty array `[]` | [`server/src/rag/retriever.js#L82`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/retriever.js#L82) | Results in fallback response. |
| **Behavior on Qdrant Error** | Caught in try/catch, sets `retrieval.error` | [`server/src/services/userService.js#L35`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/services/userService.js#L35) | Returns structured error payload without unhandled server crash. |

---

### F. Generation and Prompt Configuration

| Setting | Actual Value | Source / Precedence | Explanation |
|---|---|---|---|
| **LLM Provider** | Google Gemini | [`server/src/rag/gemini.js#L1`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/gemini.js#L1) | Official `@google/genai` Node.js client. |
| **Generation Model ID** | `gemini-3.5-flash-lite` | [`server/src/config.js#L15`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L15) | Sourced from `GEMINI_MODEL` in `.env`. |
| **System Prompt Source** | Persistent file `data/system_prompt.txt` | [`server/src/config.js#L23`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L23) (`config.promptFile`) | Loaded dynamically on each request via `getSystemPrompt()`. Falls back to `DEFAULT_SYSTEM_PROMPT`. |
| **System Prompt Modifiability** | Admin editable via API & UI | [`server/src/routes/adminRoute.js`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/routes/adminRoute.js) | `GET /api/admin/prompt` and `PUT /api/admin/prompt`. Changes persist to disk without restart. |
| **Prompt Template Assembly** | Multi-block string interpolation | [`server/src/rag/generator.js#L13-L32`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/generator.js#L13-L32) (`buildGroundedPrompt`) | `${systemPrompt}\n\nContext:\n${contextSections}\n\nUser Question:\n${question}\n\nAnswer:` |
| **Context Section Format** | Tagged source headers | [`server/src/rag/generator.js#L17`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/generator.js#L17) | `[Source N: Document: <source> \| Section: <title> \| Chunk ID: <id>]\n<content>` |
| **Context Length Limit** | Not explicitly configured | Provider default | Managed by Gemini's native context window (1M+ tokens). |
| **Max Output Tokens** | Not explicitly configured | Provider default | Not passed in SDK call; uses Gemini model default. |
| **Temperature** | Not explicitly configured | Provider default | Not passed in SDK call; uses Gemini model default. |
| **Top-P / Top-K Sampling** | Not explicitly configured | Provider default | Not passed in SDK call. |
| **Citation Format** | Bracketed citation | System prompt rule 4 | `[Document: <doc> \| Section: <title> \| Chunk ID: <id>]`. |
| **Post-Gen Citation Validation** | None (Prompt enforced only) | — | Application does not parse or validate bracketed strings via AST post-generation. |
| **Amendment Precedence Rule** | Explicit prompt directive | System prompt rule 3 | Instructs model that Section 11 strictly overrides earlier provisions. |
| **Malformed Response Handling** | Fallback to empty string | [`server/src/rag/gemini.js#L84`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/rag/gemini.js#L84) | Returns `response.text \|\| ''`. |

---

### G. Environment Variables Specification

The application loads configuration in `server/src/config.js` via `dotenv.config({ path: path.join(projectRoot, '.env') })`.

| Variable | Actual Default | Purpose | Required? | Where Used |
|---|---|---|---|---|
| `PORT` | `3000` | Port for Express HTTP server | No | [`server/src/config.js#L13`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L13), `server.js` |
| `GEMINI_API_KEY` | `""` (empty string) | Authentication key for Google Gemini API | **Yes** | [`server/src/config.js#L14`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L14), `gemini.js` |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Generative LLM model ID | No | [`server/src/config.js#L15`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L15), `gemini.js` |
| `EMBEDDING_MODEL` | `gemini-embedding-001` | Text embedding model ID | No | [`server/src/config.js#L16`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L16), `gemini.js` |
| `SIMILARITY_THRESHOLD` | `0.60` | Minimum score gate to allow generation | No | [`server/src/config.js#L17`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L17), `userService.js` |
| `TOP_K` | `4` | Number of chunks to select for generation | No | [`server/src/config.js#L18`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L18), `userService.js`, `retriever.js` |
| `KNOWLEDGE_DIR` | `<projectRoot>/data/knowledge` | Path to Markdown knowledge documents | No | [`server/src/config.js#L19`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L19), `chunker.js`, `adminService.js` |
| `QDRANT_URL` | `""` (empty string) | HTTPS endpoint for Qdrant Cloud cluster | **Yes** | [`server/src/config.js#L20`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L20), `vector_store.js` |
| `QDRANT_API_KEY` | `""` (empty string) | Authentication API key for Qdrant Cloud | **Yes** | [`server/src/config.js#L21`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L21), `vector_store.js` |
| `QDRANT_COLLECTION_NAME` | `Student_Handbook` | Name of Qdrant collection | No | [`server/src/config.js#L22`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L22), `vector_store.js`, `indexer.js` |
| `PROMPT_FILE` | `<projectRoot>/data/system_prompt.txt` | Path to persistent system prompt | No | [`server/src/config.js#L23`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/server/src/config.js#L23), `adminService.js` |

*Precedence*: Values in `.env` override hardcoded defaults in `server/src/config.js`. Process-level environment variables (e.g. Docker environment) override `.env`.

---

### H. API and Diagnostics Specification

#### 1. Endpoints
* **Primary Chat Route**: `POST /api/user/chat`
* **Legacy Alias**: `POST /api/chat` (mounted in `server/src/server.js#L17` for backward compatibility)
* **Health Check**: `GET /api/health` (queries live count from Qdrant Cloud)

#### 2. Request Body Schema
```json
{
  "message": "Can Honors Program students use the installment plan to pay tuition?"
}
```

#### 3. Response Body Schema
```json
{
  "answer": "Based on the Lumen Institute of Technology Student Handbook, Honors Program students can no longer use the installment plan to pay tuition, as the amendment in Section 11 overrides the earlier installment plan provisions in Section 3.\n\n[Document: KB-A_Lumen-Institute-Student-Handbook.md | Section: 11. Amendments (approved November 2026) | Chunk ID: KB-A_Lumen-Institute-Student-Handbook_sec11]",
  "sources": [
    {
      "id": "KB-A_Lumen-Institute-Student-Handbook_sec3",
      "title": "3. Paying Tuition",
      "sectionNumber": 3,
      "sectionTitle": "Paying Tuition",
      "source": "KB-A_Lumen-Institute-Student-Handbook.md",
      "score": 0.7076
    },
    {
      "id": "KB-A_Lumen-Institute-Student-Handbook_sec11",
      "title": "11. Amendments (approved November 2026)",
      "sectionNumber": 11,
      "sectionTitle": "Amendments (approved November 2026)",
      "source": "KB-A_Lumen-Institute-Student-Handbook.md",
      "score": 0.6075
    }
  ],
  "retrieval": {
    "similarityThreshold": 0.6,
    "bestScore": 0.7076,
    "retrievedChunks": [
      {
        "rank": 1,
        "id": "KB-A_Lumen-Institute-Student-Handbook_sec3",
        "title": "3. Paying Tuition",
        "sectionNumber": 3,
        "sectionTitle": "Paying Tuition",
        "source": "KB-A_Lumen-Institute-Student-Handbook.md",
        "score": 0.7076,
        "content": "Tuition must be paid within 15 days after the semester starts...",
        "passedToLLM": true
      },
      {
        "rank": 4,
        "id": "KB-A_Lumen-Institute-Student-Handbook_sec11",
        "title": "11. Amendments (approved November 2026)",
        "sectionNumber": 11,
        "sectionTitle": "Amendments (approved November 2026)",
        "source": "KB-A_Lumen-Institute-Student-Handbook.md",
        "score": 0.6075,
        "content": "The following changes override earlier sections of this handbook...",
        "passedToLLM": true
      }
    ],
    "usedChunks": [
      /* Identical to retrievedChunks when passedThreshold is true */
    ]
  }
}
```

#### 4. Out-of-Scope Response (Guardrail Rejection)
When `bestScore < 0.60` (e.g., query `"Can I do cryptocurrency trading on campus?"` with best score `0.5903`):
* `answer`: `"The provided Student Handbook does not contain enough information to answer this question."`
* `sources`: `[]` (empty array)
* `retrieval.retrievedChunks`: Contains all 4 retrieved candidate chunks with `passedToLLM: false` (fully inspectable).
* `retrieval.usedChunks`: `[]` (empty array, verifying zero chunks were provided to generative LLM).

#### 5. Error Response Format
If vector database connection fails:
```json
{
  "answer": "Failed to retrieve relevant handbook information due to a vector database error.",
  "sources": [],
  "retrieval": {
    "error": "Connection refused to Qdrant cluster...",
    "retrievedChunks": [],
    "usedChunks": [],
    "similarityThreshold": 0.6,
    "bestScore": 0
  }
}
```

#### 6. Frontend Debug Controls
* Located in [`client/src/components/user/AnswerSection.jsx`](file:///d:/HCMUTE/2627S1/New_Technologies_In_Software_Engineering/Student_Handbook/client/src/components/user/AnswerSection.jsx#L95-L162).
* Toggle button: `▶ Show retrieved chunks (N)` / `▼ Hide retrieved chunks`.
* Visual badges:
  - Rank badge (`#1`, `#2`)
  - Status badge: `✓ Passed to LLM` (green) vs `✕ Filtered out (< 0.6)` (red)
  - Score badge: `Score: 0.7076`
  - Chunk identifier badge: `KB-A_Lumen-Institute-Student-Handbook_secN`
  - Expand/Collapse content button toggling full text display.

---

## 3. Potential Issues and Architectural Observations

During the configuration audit, four specific observations were identified:

1. **Unbounded Chunk Length Safeguard**:
   - *Current State*: Chunks are bounded by `## ` headings with no numeric character/token cap. For the current handbook, the largest section is Section 5 (565 characters), which easily fits in `gemini-embedding-001`'s context window.
   - *Observation*: If a future handbook section exceeds the embedding model's input token limit, `chunker.js` will not split it, leading to an embedding API error.
2. **Pre-Filtering vs Candidate Expansion for Amendments**:
   - *Current State*: Candidate expansion (`candidateLimit = 6`) searches for Section 11 amendments and includes it if `score >= 0.55`. However, the similarity gate checks `bestScore >= 0.60` (the rank 1 candidate).
   - *Observation*: If a query has a rank 1 score slightly below 0.60 (e.g. 0.59), the entire query is rejected even if an amendment chunk scored 0.58. This functions correctly as an out-of-scope guardrail, but highlights that threshold calibration governs generation entry.
3. **Generation Parameters at Provider Defaults**:
   - *Current State*: `temperature`, `maxOutputTokens`, and `topP` are not explicitly defined in `gemini.js#L76`.
   - *Observation*: The system relies on Google's model defaults. While prompt instructions enforce conciseness, setting an explicit temperature (e.g. `0.0` or `0.2`) would further solidify deterministic output repeatability across API versions.
4. **Citation Validation**:
   - *Current State*: Citations are enforced purely via system prompt instructions and context header alignment.
   - *Observation*: The server does not perform regex/AST validation on the LLM's response before returning it to the user.
