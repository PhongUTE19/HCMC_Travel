# Architecture: HCMC Travel Assistant (RAG)

## 1. Goal & Context
* **Project**: A containerized HCMC Travel Assistant using Retrieval-Augmented Generation (RAG).
* **Stack**: React (Vite / Nginx) + Node.js (Express) + Qdrant Vector Database + Google Gemini API.
* **Core Philosophy**: Clean separation of concerns, containerized via Docker Compose, reproducible environment with zero host dependency issues.

---

## 2. Containerized Multi-Service Architecture

The system is organized into three services managed by Docker Compose within a shared internal bridge network:

```
+-----------------------------------------------------------------------------------------+
|                                    Docker Host Network                                  |
|                                                                                         |
|        Host Port 5173                          Host Port 3000          Host Port 6333   |
|              │                                       │                       │          |
+--------------┼───────────────────────────────────────┼───────────────────────┼----------+
|              ▼                                       ▼                       ▼          |
|  +─────────────────────────+          +─────────────────────────+  +──────────────────+ |
|  |     hcmc-client         |          |       hcmc-server       |  |   hcmc-qdrant    | |
|  |   (Nginx :80)           |          |   (Express :3000)       |  |  (Qdrant :6333)  | |
|  |                         |          |                         |  |                  | |
|  | - Serves React bundle   |  proxy   | - Health Check Endpoint |  | - Vector Search  | |
|  | - Reverse-proxies /api/ ├─────────►| - RAG Pipeline Router   |  | - Payload Store  | |
|  |   to http://server:3000 |          | - Similarity Gate (0.60)|  | - HNSW Index     | |
|  |                         |          | - Grounded Gen (Gemini) |  |                  | |
|  +─────────────────────────+          +────────────┬────────────+  +────────┬─────────+ |
|                                                    │                        │           |
|                                                    │  http://qdrant:6333    │           |
|                                                    └───────────────────────►│           |
|                                                                             │           |
|                                                     +───────────────────────┴────────+  |
|                                                     | Named Volume:                  |  |
|                                                     | hcmc_qdrant_storage            |  |
|                                                     | (/qdrant/storage)              |  |
|                                                     +────────────────────────────────+  |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Core User Workflow

1. **User queries the Assistant** in the React web interface (e.g., *"What is Ben Thanh Market?"*).
2. **Frontend issues request** to `/api/chat` via Nginx reverse proxy, which forwards to `http://server:3000/api/chat`.
3. **Retrieval step (`server/src/rag/retriever.js`)**:
   - Query text is vectorized into 3072-dimensional embedding using `embedText()` (Gemini `gemini-embedding-001`).
   - Query embedding is sent via `@qdrant/js-client-rest` to Qdrant collection `hcmc_travel` using cosine similarity.
   - Top-K ($K=3$) most relevant chunks with payload metadata are returned.
4. **Relevance / Guardrail Check**:
   - If `bestScore < 0.60` (`SIMILARITY_THRESHOLD`):
     - The query is deemed out-of-scope or ungrounded.
     - Backend immediately returns a safe refusal with `sources: []`, skipping the LLM call entirely.
5. **Grounded Generation step (`server/src/rag/generator.js`)**:
   - If accepted (`bestScore >= 0.60`), retrieved chunk contents are assembled into a strictly grounded prompt.
   - Gemini (`gemini-3.5-flash-lite`) generates an answer strictly citing sources in brackets `[Source Title]`.
6. **Response Delivery**:
   - Backend returns `{ "answer": "...", "sources": [...] }`.
   - React UI displays the answer and clickable/formatted source cards.

---

## 4. Minimal API Contract

### 4.1. Health Check
* **Method & Path**: `GET /api/health`
* **Response (`200 OK`)**:
```json
{
  "status": "ok",
  "indexedChunks": 13
}
```

### 4.2. Chat Query
* **Method & Path**: `POST /api/chat`
* **Request Body**:
```json
{
  "message": "What is Ben Thanh Market?"
}
```
* **Success Response (`200 OK`)**:
```json
{
  "answer": "Chợ Bến Thành is Ho Chi Minh City's most iconic central market...",
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

---

## 5. Qdrant Collection Configuration & Data Models

### 5.1. Qdrant Collection Spec
* **Collection Name**: `hcmc_travel` (configurable via `QDRANT_COLLECTION_NAME`)
* **Vector Dimension**: `3072` (matching Google Gemini `gemini-embedding-001`)
* **Distance Metric**: `Cosine`
* **Persistence**: Backed by named Docker volume `hcmc_qdrant_storage` mapped to `/qdrant/storage`
* **Point Schema**:
```javascript
{
  id: 1, // Positive integer ID (1..N)
  vector: [0.012, -0.045, ...], // 3072-dim float array
  payload: {
    id: "attractions_0",
    title: "Chợ Bến Thành (Ben Thanh Market)",
    content: "Chợ Bến Thành is Ho Chi Minh City's most iconic...",
    source: "attractions.md"
  }
}
```

### 5.2. Scored Chunk (Retriever Output)
```javascript
{
  id: string,
  title: string,
  content: string,
  source: string,
  score: number // Cosine similarity: 0.0 to 1.0
}
```

---

## 6. End-to-End RAG Pipeline & Vector Database Choice

```
[Markdown Files (data/knowledge/*.md)]
                  │
                  ▼ (1) Header Chunking (split by '## ')
   [Plain Chunks: { id, title, content, source }]
                  │
                  ▼ (2) Indexing Execution (indexer.js -> Gemini Embeddings)
   [Qdrant Collection: hcmc_travel (cosine: 3072-dim)]
                  │
             User Query
                  │
                  ▼ (3) Embed Query Vector (gemini.js)
                  │
                  ▼ (4) Vector Similarity Query (retriever.js -> Qdrant /collections/hcmc_travel)
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

### Vector Database Choice: Qdrant
We migrated from Vectra to **Qdrant** for production-grade vector storage:
1. **Dedicated Service Architecture**: Decouples vector indexing and search from the Node.js process.
2. **True Persistence**: Robust disk persistence with write-ahead logs (WAL) via Docker volume (`hcmc_qdrant_storage`), surviving container restarts and shutdowns.
3. **High-Performance HNSW Indexing**: Native Rust-powered vector indexing with sub-millisecond query latency.
4. **Official REST Client SDK**: Seamless integration with `@qdrant/js-client-rest`.

---

## 7. Folder Structure

```
HCMC_Travel/
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/       # UI components (HealthBadge, ChatForm, AnswerSection)
│   │   ├── services/         # API fetch client
│   │   ├── App.jsx           # Main chat UI
│   │   ├── index.css         # Styling
│   │   └── main.jsx
│   ├── Dockerfile            # Node 22 build -> Nginx reverse proxy
│   ├── nginx.conf            # Nginx config
│   ├── package.json
│   └── vite.config.js        # Vite dev server proxy
├── server/                   # Node.js + Express backend
│   ├── src/
│   │   ├── config.js         # Configuration (Qdrant URL, models, threshold, topK)
│   │   ├── rag/
│   │   │   ├── chunker.js    # Markdown header chunking
│   │   │   ├── gemini.js     # Gemini SDK client (embedText, generateAnswer)
│   │   │   ├── vector_store.js # Qdrant client singleton & collection manager
│   │   │   ├── indexer.js    # Indexes knowledge into Qdrant collection
│   │   │   ├── retriever.js  # Top-K retrieval via Qdrant
│   │   │   └── generator.js  # Grounded prompt generation
│   │   └── server.js         # Express server & API routes
│   ├── Dockerfile            # Node 22-alpine container image
│   ├── package.json          # Dependencies (@google/genai, @qdrant/js-client-rest, express)
│   ├── .env.example
│   └── .env                  # Local backend configuration
├── data/
│   └── knowledge/            # Markdown knowledge files
│       ├── food.md
│       ├── attractions.md
│       └── landmarks.md
├── docs/
│   ├── architecture.md       # Architecture & specifications
│   ├── agent-log.md          # Progress & validation log
│   └── learning-guide.md     # Comprehensive explanation guide
├── docker-compose.yml        # Docker Compose configuration (Qdrant, Server, Client)
├── .env.example              # Docker Compose environment template
├── package.json              # Root orchestration scripts
└── README.md
```

---

## 8. Out-of-Scope List

* ❌ Remote cloud vector database instances (Pinecone, Qdrant Cloud).
* ❌ Heavy relational / NoSQL database servers (PostgreSQL, MongoDB).
* ❌ User authentication, sessions, or login.
* ❌ Multi-turn conversational chat history.
* ❌ Real-time web scraping / Google Search live grounding.
* ❌ Admin document upload UI.
* ❌ Agent / Tool Calling workflows.

---

## 9. Key Decisions & Rationale

| Decision | Choice | Rationale |
|---|---|---|
| **Vector Database** | Qdrant (`qdrant/qdrant:latest`) | Enterprise-grade vector database with persistent storage volume, HNSW search, and REST client. |
| **Containerization** | Docker Compose | Complete environment reproducibility for Qdrant, Express, and React with health checks. |
| **Frontend Serving** | Nginx Alpine (Multi-stage) | Production-ready static React delivery with built-in `/api/` reverse proxy eliminating CORS concerns. |
| **Persistence Strategy** | Named Volume `hcmc_qdrant_storage` | Preserves vectors across `docker compose down` and `docker compose up`. |
| **Service Communication** | Internal Docker Bridge Network | `server` communicates with `http://qdrant:6333`, `client` proxies to `http://server:3000`. |
| **Similarity Guardrail** | Pre-generation cutoff ($0.60$) | Filters out-of-scope non-travel queries before calling Gemini, saving latency and cost. |
