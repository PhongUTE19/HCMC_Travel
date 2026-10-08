# Architecture: HCMC Travel Assistant (RAG)

## 1. Goal & Context
* **Project**: A containerized HCMC Travel Assistant using Retrieval-Augmented Generation (RAG).
* **Stack**: React (Vite / Nginx) + Node.js (Express) + Qdrant Cloud + Google Gemini API.
* **Core Philosophy**: Clean separation of concerns, containerized via Docker Compose, reproducible environment with managed cloud vector storage.

---

## 2. Containerized Multi-Service Architecture (with Qdrant Cloud)

The system consists of two containerized application services managed by Docker Compose, communicating externally with **Qdrant Cloud** and **Google Gemini API**:

```
+-----------------------------------------------------------------------------------------+
|                                    Docker Host Network                                  |
|                                                                                         |
|        Host Port 5173                          Host Port 3000                           |
|              │                                       │                                  |
+--------------┼───────────────────────────────────────┼──────────────────────────────────+
|              ▼                                       ▼                                  |
|  +─────────────────────────+          +─────────────────────────+                       |
|  |     hcmc-client         |          |       hcmc-server       |                       |
|  |   (Nginx :80)           |          |   (Express :3000)       |                       |
|  |                         |          |                         |                       |
|  | - Serves React bundle   |  proxy   | - Health Check Endpoint |                       |
|  | - Reverse-proxies /api/ ├─────────►| - RAG Pipeline Router   |                       |
|  |   to http://server:3000 |          | - Similarity Gate (0.60)|                       |
|  |                         |          | - Grounded Gen (Gemini) |                       |
|  +─────────────────────────+          +────────────┬────────────+                       |
+----------------------------------------------------┼────────────────────────────────----+
                                                     │
                                                     │  HTTPS (REST API)
                                                     ▼
                                        +─────────────────────────+
                                        |      Qdrant Cloud       |
                                        | (Managed Cluster :6333) |
                                        |                         |
                                        | - 3072-dim Cosine Index |
                                        | - Secure API Key Auth   |
                                        | - Managed Persistence   |
                                        | - High-Performance HNSW|
                                        +─────────────────────────+
```

---

## 3. Core User Workflow

1. **User queries the Assistant** in the React web interface (e.g., *"What is Ben Thanh Market?"*).
2. **Frontend issues request** to `/api/chat` via Nginx reverse proxy, which forwards to `http://server:3000/api/chat`.
3. **Retrieval step (`server/src/rag/retriever.js`)**:
   - Query text is vectorized into a 3072-dimensional embedding using `embedText()` (Gemini `gemini-embedding-001`).
   - Query embedding is sent via `@qdrant/js-client-rest` over HTTPS with `QDRANT_API_KEY` to Qdrant Cloud collection `hcmc_travel` using cosine similarity.
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
   - React UI displays the answer and formatted source cards.

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

## 5. Qdrant Cloud Collection Configuration & Data Models

### 5.1. Qdrant Cloud Collection Spec
* **Collection Name**: `hcmc_travel` (configurable via `QDRANT_COLLECTION_NAME`)
* **Vector Dimension**: `3072` (matching Google Gemini `gemini-embedding-001`)
* **Distance Metric**: `Cosine`
* **Cluster Connection**: Managed Qdrant Cloud endpoint (`https://<cluster-id>.<region>.cloud.qdrant.io:6333`)
* **Authentication**: Secret API Key passed in `api-key` header
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

## 6. End-to-End RAG Pipeline & Cloud Vector Database Choice

```
[Markdown Files (data/knowledge/*.md)]
                  │
                  ▼ (1) Header Chunking (split by '## ')
   [Plain Chunks: { id, title, content, source }]
                  │
                  ▼ (2) Indexing Execution (indexer.js -> Gemini Embeddings)
   [Qdrant Cloud: hcmc_travel (cosine: 3072-dim)]
                  │
             User Query
                  │
                  ▼ (3) Embed Query Vector (gemini.js)
                  │
                  ▼ (4) Vector Similarity Query (retriever.js -> Qdrant Cloud HTTPS)
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

### Cloud Vector Database Choice: Qdrant Cloud
We migrated from local self-hosted Qdrant to **Qdrant Cloud**:
1. **Zero Host Overhead**: No need to manage or allocate RAM/CPU for a local database container on developer machines.
2. **Managed Cloud Persistence**: Vector backups, clustering, high availability, and storage lifecycle are fully managed.
3. **Consistent Deployment**: Both local developers and containerized CI/CD environments connect to the same reliable cloud vector database.
4. **Clean Decoupling**: Docker Compose only contains application workloads (`client` and `server`), avoiding stateful volume management on local Docker hosts.

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
│   │   ├── config.js         # Configuration (Qdrant Cloud URL, models, threshold, topK)
│   │   ├── rag/
│   │   │   ├── chunker.js    # Markdown header chunking
│   │   │   ├── gemini.js     # Gemini SDK client (embedText, generateAnswer)
│   │   │   ├── vector_store.js # Qdrant client singleton & collection manager
│   │   │   ├── indexer.js    # Indexes knowledge into Qdrant Cloud
│   │   │   ├── retriever.js  # Top-K retrieval via Qdrant Cloud
│   │   │   └── generator.js  # Grounded prompt generation
│   │   └── server.js         # Express server & API routes
│   ├── Dockerfile            # Node 22-alpine container image
│   ├── package.json          # Dependencies (@google/genai, @qdrant/js-client-rest, express)
│   └── .env                  # Local backend configuration (ignored by Git)
├── data/
│   └── knowledge/            # Markdown knowledge files
│       ├── food.md
│       ├── attractions.md
│       └── landmarks.md
├── docs/
│   ├── architecture.md       # Architecture & specifications
│   ├── agent-log.md          # Progress & validation log
│   └── learning-guide.md     # Comprehensive explanation guide
├── docker-compose.yml        # Docker Compose configuration (Server, Client)
├── .env.example              # Unified environment template
├── package.json              # Root orchestration scripts
└── README.md
```

---

## 8. Out-of-Scope List

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
| **Vector Database** | Qdrant Cloud | Managed vector database in the cloud, removing local container and volume maintenance. |
| **Authentication** | API Key (`api-key` header) | Secure authentication with Qdrant Cloud cluster; key stored strictly in environment variables. |
| **Containerization** | Docker Compose (`server` + `client`) | Light application containers; stateless and easily deployable anywhere. |
| **Unified Environment Configuration** | Root `.env` & `.env.example` | Eliminates duplicated `.env` files across root and server; both Docker and local Node load root `.env`. |
| **Similarity Guardrail** | Pre-generation cutoff ($0.60$) | Filters out-of-scope non-travel queries before calling Gemini, saving latency and cost. |
