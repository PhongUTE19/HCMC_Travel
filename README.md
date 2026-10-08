# HCMC Travel Assistant (RAG)

A lightweight Ho Chi Minh City travel question-answering assistant using Retrieval-Augmented Generation (RAG) powered by Google Gemini and a verified local Markdown knowledge base.

---

## 1. Project Structure

```text
HCMC_Travel/
├── client/                 # React + Vite frontend (Port 5173)
│   ├── src/
│   │   ├── components/     # HealthBadge, ChatForm, AnswerSection, ErrorMessage
│   │   ├── services/       # api.js (fetch client calling /api/health and /api/chat)
│   │   ├── App.jsx         # Main application state & orchestration
│   │   ├── index.css       # Clean design styles
│   │   └── main.jsx        # React root entry
│   ├── package.json
│   └── vite.config.js      # Development proxy (/api -> http://localhost:3000)
├── server/                 # Node.js + Express backend (Port 3000)
│   ├── src/
│   │   ├── config.js       # Environment and model configurations
│   │   ├── server.js       # Express server & API endpoints
│   │   └── rag/
│   │       ├── chunker.js   # Section-based Markdown chunker (## headings)
│   │       ├── gemini.js    # Google GenAI SDK wrapper (embedContent & generateContent)
│   │       ├── retriever.js # In-memory cosine similarity and Top-K ranking
│   │       ├── generator.js # Grounded prompt formatting & citation enforcement
│   │       └── indexer.js   # Offline embedding generator (data/embeddings.json)
│   ├── package.json
│   ├── .env.example
│   └── .env                # Secrets & model configurations
├── data/
│   ├── knowledge/          # Controlled ground-truth Markdown documents
│   │   ├── food.md
│   │   ├── attractions.md
│   │   └── landmarks.md
│   └── embeddings.json     # Generated vector embeddings cache
├── docs/                   # Architecture, agent logs, and learning guide
├── package.json            # Root workspace orchestration (concurrently)
└── README.md
```

---

## 2. Quickstart

### Prerequisites
* Node.js (v18+)
* A Google Gemini API key

### Installation
From the project root:
```bash
npm run install:all
```
*(Or install inside `server/` and `client/` manually: `cd server && npm install && cd ../client && npm install`).*

### Configuration
Ensure `server/.env` exists with your Gemini API key:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
EMBEDDING_MODEL=gemini-embedding-001
TOP_K=3
SIMILARITY_THRESHOLD=0.60
```

---

## 3. Running the Application

### 1. Index Knowledge Base (Generate Embeddings)
Whenever knowledge documents in `data/knowledge/` change, run:
```bash
npm run index
```
This parses the Markdown sections, requests vector embeddings, and writes `data/embeddings.json`.

### 2. Start Client & Server Concurrently
To start both the Express backend (:3000) and the React frontend (:5173):
```bash
npm run dev
```

Open your browser at:
**http://localhost:5173**

---

## 4. API Endpoints

* `GET /api/health`: Returns server status and number of indexed chunks loaded in RAM.
* `POST /api/chat`: Accepts `{ "message": "string" }` and returns `{ "answer": "...", "sources": [...] }`.
