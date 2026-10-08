# Architecture: HCMC Travel Assistant (RAG)

## 1. Goal & Context
* **Project**: A lightweight HCMC Travel Assistant using Retrieval-Augmented Generation (RAG).
* **Target Audience**: Midterm practice project with a **strict 2-hour implementation budget**.
* **Core Philosophy**: Minimal, clean JavaScript/Node.js stack that is easy to write, understand, and defend without unneeded abstractions.

---

## 2. Simplified Architecture

A single Express.js process serving both static frontend assets and the minimal RAG API:

```
+-----------------------------------------------------------+
|               Browser UI (public/)                        |
|       Vanilla HTML + CSS + JavaScript                     |
+-----------------------------+-----------------------------+
                              | HTTP POST /api/chat
                              | HTTP GET  /api/health
                              v
+-----------------------------------------------------------+
|               Express.js Server (src/server.js)           |
|                                                           |
|   1. GET /api/health                                      |
|   2. POST /api/chat                                       |
|          │                                                |
|          ▼                                                |
|   [ RAG Pipeline ]                                        |
|   ├── retriever.js (Retrieve Top-K chunks via Cosine Sim) |
|   ├── Threshold Gate (bestScore >= 0.60)                  |
|   └── generator.js (Grounded generation via Gemini LLM)   |
|          │                                                |
|          ▼                                                |
|   [ In-Memory Store & Gemini Client ]                     |
|   ├── In-Memory Chunks & Vector Array                     |
|   └── gemini.js (embedText, generateAnswer)               |
+-----------------------------------------------------------+
```

---

## 3. Core User Workflow

1. **User asks a question** in the browser (e.g., *"What is Ben Thanh Market?"*).
2. **Frontend sends POST request** with `{ "message": "..." }` to `/api/chat`.
3. **Retrieval step (`src/rag/retriever.js`)**:
   - Query text is converted to a vector embedding via `embedText()`.
   - Vector is compared against in-memory chunk vectors using pure JavaScript cosine similarity.
   - Top-K ($K=3$) most relevant chunks are selected and scored.
4. **Relevance / Guardrail Check**:
   - If the best score is below `SIMILARITY_THRESHOLD` ($0.60$):
     - The query is classified as out-of-scope or ungrounded.
     - Execution skips the LLM call entirely, returning an immediate safe response with `sources: []`.
5. **Grounded Generation step (`src/rag/generator.js`)**:
   - If accepted, chunks are formatted into a prompt with strict grounding instructions.
   - Gemini generates an answer strictly citing the retrieved sources without inventing facts.
   - If the context lacks specifics, Gemini states that the knowledge base does not contain enough information.
6. **Response delivery**:
   - Backend returns JSON `{ "answer": "...", "sources": [...] }`.
   - Frontend displays the answer and clickable/readable source citations.

---

## 4. Minimal API Contract

### 4.1. Health Check
* **Method & Path**: `GET /api/health`
* **Purpose**: Verify server is running and knowledge base is loaded in memory.
* **Response (`200 OK`)**:
```json
{
  "status": "ok",
  "indexedChunks": 13
}
```

### 4.2. Chat Query
* **Method & Path**: `POST /api/chat`
* **Purpose**: Ask travel questions and receive grounded answers.
* **Request Body**:
```json
{
  "message": "What is Ben Thanh Market?"
}
```
* **Success Response (`200 OK`)**:
```json
{
  "answer": "Chợ Bến Thành (Ben Thanh Market) is Ho Chi Minh City's most iconic central market, located in District 1 at Quách Thị Trang Square [Chợ Bến Thành (Ben Thanh Market)]. Built in 1914, its south entrance clock tower is a universally recognized symbol of the city...",
  "sources": [
    {
      "title": "Chợ Bến Thành (Ben Thanh Market)",
      "source": "attractions.md",
      "score": 0.77
    }
  ]
}
```
* **Out-of-Scope Response (`200 OK`)**:
```json
{
  "answer": "I do not have verified travel information about this topic in the local knowledge base. Please ask about Ho Chi Minh City food, landmarks, or attractions.",
  "sources": []
}
```
* **Error Response (`400 Bad Request` / `500 Server Error`)**:
```json
{
  "error": "Query message is required."
}
```

---

## 5. Minimal Data Models

```javascript
// Chunk Model (Stored in memory and data/embeddings.json)
{
  id: "food_0",
  title: "Cơm Tấm (Broken Rice)",
  content: "Cơm tấm is the quintessential...",
  source: "food.md",
  embedding: [0.012, -0.045, ...] // 3072-dim Float array
}

// Scored Chunk (Internal to Retriever)
{
  id: string,
  title: string,
  content: string,
  source: string,
  score: number // Cosine similarity: 0.0 to 1.0
}

// Chat API Request
{
  message: string
}

// Chat API Response
{
  answer: string,
  sources: [
    { title: string, source: string, score: number }
  ]
}
```

---

## 6. End-to-End RAG Pipeline & Thresholding

```
[Markdown Files (data/knowledge/*.md)]
                  │
                  ▼ (1) Header Chunking (split by '## ')
   [Plain Chunks: { id, title, content, source }]
                  │
                  ▼ (2) Offline / Startup Indexing (gemini-embedding-001)
   [data/embeddings.json loaded into memory array]
                  │
             User Query
                  │
                  ▼ (3) Embed Query Vector (gemini.js)
                  │
                  ▼ (4) Cosine Similarity Search (retriever.js)
             [Top-K (K=3)]
                  │
                  ├─────────────────────────────┐
        bestScore < 0.60               bestScore >= 0.60
                  │                             │
                  ▼                             ▼
       Safe Out-of-Scope Refusal       Prompt Augmentation
       (Gemini call blocked)           (generator.js)
                  │                             │
                  │                             ▼
                  │                    Gemini Generation
                  │                    (gemini-3.5-flash-lite)
                  │                             │
                  └──────────────┬──────────────┘
                                 ▼
                     Formatted API Response
```

### Retrieval & Threshold Choice
* **Top-K ($K = 3$)**: Keeps prompt size minimal, latency low, and provides sufficient context without distracting the LLM.
* **Similarity Threshold ($0.60$)**:
  - *Empirical Calibration*:
    - Clearly answerable travel queries score $0.75 - 0.80+$.
    - Partially related topics (e.g. general travel/transportation) score $0.62 - 0.66$.
    - Completely irrelevant questions (e.g. *"What is linear algebra?"*) score $0.44$.
    - Ambiguous short queries (e.g. *"Where should I go?"*) score $0.52$.
  - Setting the cutoff at $0.60$ reliably prevents out-of-scope non-travel queries from reaching the LLM, reducing API costs and latency.
* **Two-Layer Guardrail**:
  1. *Layer 1 (Pre-LLM)*: Mathematical filter rejects queries with $\text{bestScore} < 0.60$.
  2. *Layer 2 (In-Prompt)*: Strict prompt instructions force the LLM to output *"The knowledge base does not contain enough information to answer this question"* if facts are missing from retrieved chunks.

---

## 7. Folder Structure

```
HCMC_Travel/
├── docs/
│   ├── architecture.md       # Minimal architecture and specs
│   └── agent-log.md          # Implementation progress log
├── data/
│   ├── knowledge/            # Small, focused Markdown files
│   │   ├── food.md           # HCMC food, street dishes, famous stalls
│   │   ├── attractions.md    # Markets, museums, walking streets
│   │   └── landmarks.md      # Historic buildings and architectural spots
│   └── embeddings.json       # Generated chunk embeddings (in .gitignore)
├── public/                   # Static frontend served by Express
│   ├── index.html            # Minimal clean chat interface + source list
│   ├── style.css             # Simple modern styling
│   └── app.js                # Form submit, fetch /api/chat, render response & sources
├── src/
│   ├── config.js             # Environment variables (PORT, models, threshold, topK)
│   ├── rag/
│   │   ├── chunker.js        # Split markdown files by '## ' into chunks
│   │   ├── gemini.js         # Gemini SDK wrapper (embedText, generateAnswer)
│   │   ├── retriever.js      # Cosine similarity & top-K chunk retrieval
│   │   ├── generator.js      # Grounded prompt construction & LLM invocation
│   │   └── indexer.js        # Offline script to generate data/embeddings.json
│   └── server.js             # Express app, routes, startup indexer
├── .env.example              # Config keys (GEMINI_API_KEY, models, TOP_K, THRESHOLD)
├── package.json              # Express, dotenv, @google/genai
└── README.md                 # 2-step run instructions
```

---

## 8. Out-of-Scope List

* ❌ External database (MongoDB, PostgreSQL, SQLite).
* ❌ External vector database (Pinecone, ChromaDB, Weaviate).
* ❌ User authentication, sessions, or login.
* ❌ Multi-turn conversational chat history.
* ❌ Real-time web scraping / Google Search live grounding.
* ❌ Category filtering (retrieval is purely semantic based on the query).
* ❌ Agent / Tool Calling workflows.
* ❌ Audio / Voice / Image features.

---

## 9. Key Decisions & Rationale

| Decision | Choice | Rationale |
|---|---|---|
| **Runtime & Framework** | Node.js + Express | Matches user familiarity; allows rapid coding and confident oral defense. |
| **Vector Search** | In-Memory Cosine Similarity | ~15 lines of standard math loop. Fast (< 2ms for < 50 chunks), zero external dependencies, 100% explainable. |
| **Decoupled RAG Pipeline** | `retriever.js` & `generator.js` | Retrieval and prompt generation are separate modules, allowing isolated unit testing. |
| **Relevance Thresholding** | Pre-generation cutoff ($0.60$) | Blocks irrelevant queries before calling Gemini, saving latency and token budget. |
| **Two-Tier Safety** | Threshold + Grounded Prompt | Pre-filter eliminates non-travel queries; prompt guardrail eliminates hallucination for unindexed travel queries. |
