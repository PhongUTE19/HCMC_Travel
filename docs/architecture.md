# Architecture: Student Handbook Assistant (RAG)

## 1. Goal & Context
* **Project**: A containerized Student Handbook Assistant using Retrieval-Augmented Generation (RAG).
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
|  |     student-handbook-client         |          |       student-handbook-server       |                       |
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
2. **Frontend issues request** to `/api/user/chat` via Nginx reverse proxy, which forwards to `http://server:3000/api/user/chat`.
3. **Retrieval step (`server/src/rag/retriever.js`)**:
   - Query text is vectorized into a 3072-dimensional embedding using `embedText()` (Gemini `gemini-embedding-001`).
   - Query embedding is sent via `@qdrant/js-client-rest` over HTTPS with `QDRANT_API_KEY` to Qdrant Cloud collection `hcmc_travel` using cosine similarity.
   - Top-K ($K=3$) most relevant chunks with payload metadata are returned.
4. **Relevance / Guardrail Check**:
   - If `bestScore < 0.60` (`SIMILARITY_THRESHOLD`):
     - The query is deemed out-of-scope or ungrounded.
     - Backend immediately returns a safe refusal with `sources: []`, skipping the LLM call entirely.
5. **Grounded Generation step (`server/src/rag/generator.js`)**:
   - If accepted (`bestScore >= 0.60`), the generator dynamically reads the active system prompt (from persistent storage `data/system_prompt.txt`) and retrieved chunk contents into a strictly grounded prompt.
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

### 4.2. User Chat Query
* **Method & Path**: `POST /api/user/chat`
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

### 4.3. Admin Management Endpoints
* **`GET /api/admin/status`**:
  - Response: `{ documentCount, totalFileChunks, indexedChunks, isIndexing, lastIndexedAt, isSynced }`
* **`GET /api/admin/documents`**:
  - Response: `{ documents: [{ filename, size, modifiedAt, sectionCount }] }`
* **`GET /api/admin/documents/:filename`**:
  - Response: `{ filename, content }`
* **`POST /api/admin/documents`**:
  - Request Body: `{ filename, content, overwrite? }`
  - Response (`201 Created`): `{ success: true, filename, message }`
* **`PUT /api/admin/documents/:filename`**:
  - Request Body: `{ content }`
  - Response (`200 OK`): `{ success: true, filename, message }`
* **`DELETE /api/admin/documents/:filename`**:
  - Response (`200 OK`): `{ success: true, filename, message }`
* **`GET /api/admin/chunks`** (Paginated with Server-side Search):
  - **Query Parameters**:
    - `limit`: Number of chunks returned per batch. Supported options: `10`, `30`, `50`. Default: `10`. Maximum: `50`.
    - `offset`: Zero-based start index. Default: `0`.
    - `q` / `search`: Optional search query string. Filters chunks matching `id`, `title`, `source`, or `content` before slicing.
  - **Response (`200 OK`)**:
    ```json
    {
      "totalChunks": 13,
      "chunks": [
        {
          "id": "attractions_0",
          "title": "Chợ Bến Thành (Ben Thanh Market)",
          "source": "attractions.md",
          "content": "..."
        }
      ],
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
    ```
  - **Pagination Behavior**:
    - `totalChunks`: Total count of chunks matching the query.
    - `hasMore`: Boolean flag (`offset + chunks.length < totalChunks`).
    - The client only fetches and renders the current page of chunks.
    - Previous and Next controls increment/decrement `offset` by `limit`. Changing page size or search query resets `offset` to `0`.
* **`POST /api/admin/index`**:
  - Response: `{ success: true, message, indexedChunks }`
* **`GET /api/admin/prompt`**:
  - Response: `{ prompt: string }`
* **`PUT /api/admin/prompt`**:
  - Request Body: `{ prompt: string }`
  - Response (`200 OK`): `{ success: true, message: string, prompt: string }`

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
│   │   ├── components/       # Component tree
│   │   │   ├── admin/        # Admin UI modules (AdminStats, DocumentEditor, DocumentTable, ChunkReview, ChunkCard, SystemPromptEditor)
│   │   │   ├── user/         # User UI modules (UserChatView, ChatForm, AnswerSection)
│   │   │   ├── AdminDashboard.jsx # Admin container coordinator
│   │   │   ├── HealthBadge.jsx    # Shared health indicator
│   │   │   ├── ErrorMessage.jsx   # Shared error alert
│   │   │   └── SuccessMessage.jsx # Shared dismissible success alert
│   │   ├── services/         # Modular API fetch services
│   │   │   ├── userApi.js    # User chat & health fetch methods
│   │   │   └── adminApi.js   # Admin status, document CRUD, prompt, paginated chunks, and indexing
│   │   ├── App.jsx           # Role switcher coordinator (User <-> Admin)
│   │   ├── index.css         # Styling system
│   │   └── main.jsx
│   ├── Dockerfile            # Node 22 build -> Nginx reverse proxy
│   ├── nginx.conf            # Nginx config
│   ├── package.json
│   └── vite.config.js        # Vite dev server proxy
├── server/                   # Node.js + Express backend
│   ├── src/
│   │   ├── config.js         # Configuration (Qdrant Cloud URL, models, threshold, topK, promptFile)
│   │   ├── controllers/
│   │   │   ├── adminController.js # Admin HTTP parsing, response formatting & error handling
│   │   │   └── userController.js  # User HTTP parsing & error handling
│   │   ├── services/
│   │   │   ├── adminService.js    # Knowledge-base business logic, file I/O, prompt persistence, indexing
│   │   │   └── userService.js     # Chat workflow orchestration, threshold guardrail, generation
│   │   ├── routes/
│   │   │   ├── adminRoute.js      # Admin route definitions and controller references
│   │   │   └── userRoute.js       # User route definitions (/api/user/chat)
│   │   ├── rag/
│   │   │   ├── chunker.js    # Markdown header chunking
│   │   │   ├── gemini.js     # Gemini SDK client (embedText, generateAnswer)
│   │   │   ├── vector_store.js # Qdrant client singleton & collection manager
│   │   │   ├── indexer.js    # Indexes knowledge into Qdrant Cloud
│   │   │   ├── retriever.js  # Top-K retrieval via Qdrant Cloud
│   │   │   └── generator.js  # Grounded prompt generation using dynamic system prompt
│   │   └── server.js         # Express server mounting /api/admin and /api/user
│   ├── Dockerfile            # Node 22-alpine container image
│   ├── package.json          # Dependencies (@google/genai, @qdrant/js-client-rest, express)
│   └── .env                  # Local backend configuration (ignored by Git)
├── data/
│   ├── knowledge/            # Markdown knowledge files
│   │   ├── food.md
│   │   ├── attractions.md
│   │   └── landmarks.md
│   └── system_prompt.txt     # Persistent storage for active system prompt
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
