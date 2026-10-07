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
|   └── generator.js (Generate answer via Gemini LLM)       |
|          │                                                |
|          ▼                                                |
|   [ In-Memory Store & Gemini Client ]                     |
|   ├── In-Memory Chunks & Vector Array                     |
|   └── gemini.js (embedText, generateContent)              |
+-----------------------------------------------------------+
```

---

## 3. Core User Workflow

1. **User asks a question** in the browser (e.g., *"Where can I eat Cơm Tấm in District 1?"*).
2. **Frontend sends POST request** with `{ "message": "..." }` to `/api/chat`.
3. **Retrieval step**:
   - Query text is converted to a vector embedding via Gemini embedding model.
   - Vector is compared against in-memory chunk vectors using pure JavaScript cosine similarity.
   - Top-K (default $K=3$) most relevant chunks are selected.
4. **Generation step**:
   - Retrieved chunks are formatted into a prompt with strict grounding instructions.
   - Gemini generates an answer citing the retrieved sources.
5. **Response delivery**:
   - Backend returns JSON `{ "answer": "...", "sources": [...] }`.
   - Frontend displays the answer and source badges.

---

## 4. Minimal API Contract

### 4.1. Health Check
* **Method & Path**: `GET /api/health`
* **Purpose**: Verify server is running and knowledge base is loaded in memory.
* **Response (`200 OK`)**:
```json
{
  "status": "ok",
  "indexedChunks": 18
}
```

### 4.2. Chat Query
* **Method & Path**: `POST /api/chat`
* **Purpose**: Ask travel questions and receive grounded answers.
* **Request Body**:
```json
{
  "message": "Where should I go for coffee near Notre-Dame Cathedral?"
}
```
* **Success Response (`200 OK`)**:
```json
{
  "answer": "Near Notre-Dame Cathedral, you can visit cà phê bệt (sidewalk coffee) at 30/4 Park, or historic cafes along Dong Khoi Street [Landmarks & Cafes].",
  "sources": [
    {
      "id": "landmarks_02",
      "title": "Notre-Dame Cathedral & Surrounding Cafes",
      "source": "landmarks.md",
      "score": 0.82
    }
  ]
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
// Chunk Model (Stored in memory)
{
  id: "food_01",
  title: "Cơm Tấm (Broken Rice)",
  content: "Cơm tấm is a signature breakfast dish...",
  source: "food.md",
  embedding: [0.012, -0.045, ...] // Float array
}

// Retrieval Result
{
  chunk: KnowledgeChunk,
  score: 0.82
}

// Chat API Request
{
  message: string
}

// Chat API Response
{
  answer: string,
  sources: [
    { id: string, title: string, source: string, score: number }
  ]
}
```

---

## 6. End-to-End RAG Pipeline

```
[Markdown Files (data/knowledge/*.md)]
                  │
                  ▼ (1) Header Chunking (split by '## ')
   [Plain Chunks: { id, title, content, source }]
                  │
                  ▼ (2) Server Startup Embedding (Gemini Embeddings API)
   [In-Memory Chunks with Vectors Array]
                  │
             User Query
                  │
                  ▼ (3) Embed Query Vector
                  │
                  ▼ (4) Cosine Similarity Search (retriever.js)
   [Top-K (K=3) Relevant Chunks]  <--- Independent test point
                  │
                  ▼ (5) Prompt Augmentation
        "Answer ONLY using this context:
         Context: [Chunks]
         Question: [Query]"
                  │
                  ▼ (6) LLM Generation (generator.js)
   [Grounded Answer + Citations]  <--- Independent test point
```

### Separation for Testing
* **`retriever.js`** can be tested independently with mock/query vectors without invoking text generation.
* **`generator.js`** can be tested with static mock chunks without running vector search.

---

## 7. Folder Structure

```
HCMC_Travel/
├── docs/
│   ├── architecture.md       # Minimal architecture and specs
│   └── agent-log.md          # Implementation progress log
├── data/
│   └── knowledge/            # Small, focused Markdown files
│       ├── food.md           # HCMC food, street dishes, famous stalls
│       ├── attractions.md    # Markets, museums, walking streets
│       └── landmarks.md      # Historic buildings and architectural spots
├── public/                   # Static frontend served by Express
│   ├── index.html            # Minimal clean chat interface
│   ├── style.css             # Simple modern styling
│   └── app.js                # Form submit, fetch /api/chat, render response
├── src/
│   ├── config.js             # Environment variables (PORT, models, API key)
│   ├── rag/
│   │   ├── chunker.js        # Split markdown files by '## ' into chunks
│   │   ├── gemini.js         # Gemini SDK wrapper (embedText, generateText)
│   │   ├── retriever.js      # Cosine similarity & top-K chunk retrieval
│   │   └── generator.js      # Context prompt construction & LLM invocation
│   └── server.js             # Express app, routes, startup indexer
├── .env.example              # Config keys (GEMINI_API_KEY, models)
├── package.json              # Express, dotenv, @google/genai
└── README.md                 # 2-step run instructions
```

---

## 8. Out-of-Scope List

To maintain the 2-hour budget and keep the code easy to defend:
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
| **Vector Search** | In-Memory Cosine Similarity | ~10 lines of standard math loop. Fast (< 2ms for < 50 chunks), zero dependency, 100% explainable. |
| **Separated Modules** | `retriever.js` & `generator.js` | Modular design allows unit testing or manual verification of retrieval accuracy separately from generation. |
| **Model Configuration** | Configurable via `.env` | Prevents hardcoded model failures; allows switching embedding/generation models easily. |
| **Single Server Process** | Express serves API + `public/` | No CORS friction, no proxy configs, single command (`npm start`) to run everything. |
