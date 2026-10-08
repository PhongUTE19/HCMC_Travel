# HCMC Travel Assistant (RAG)

A lightweight Ho Chi Minh City travel question-answering assistant using Retrieval-Augmented Generation (RAG) powered by Google Gemini, Qdrant Cloud managed vector database, Express backend, and React frontend, fully containerized with Docker Compose.

---

## 1. Project Structure

```text
HCMC_Travel/
├── client/                 # React + Vite frontend (Port 5173 / Containerized Nginx)
│   ├── src/
│   │   ├── components/     # HealthBadge, ChatForm, AnswerSection, ErrorMessage
│   │   ├── services/       # api.js (calls /api/health and /api/chat)
│   │   ├── App.jsx         # Main application state & orchestration
│   │   ├── index.css       # Clean design styles
│   │   └── main.jsx        # React root entry
│   ├── Dockerfile          # Multi-stage build (Node 22 build -> Nginx reverse proxy)
│   ├── nginx.conf          # Nginx config routing /api to Express backend
│   └── package.json
├── server/                 # Node.js + Express backend (Port 3000)
│   ├── src/
│   │   ├── config.js       # Environment, Qdrant Cloud URL, and model configurations
│   │   ├── server.js       # Express server & API endpoints
│   │   └── rag/
│   │       ├── chunker.js      # Section-based Markdown chunker (## headings)
│   │       ├── gemini.js       # Google GenAI SDK wrapper (embedContent & generateContent)
│   │       ├── vector_store.js # Qdrant Cloud client singleton, init & point counting
│   │       ├── indexer.js      # Vector indexing script inserting points to Qdrant Cloud
│   │       ├── retriever.js    # Qdrant Cloud Top-K cosine similarity search
│   │       └── generator.js    # Grounded prompt formatting & citation enforcement
│   ├── Dockerfile          # Node 22-alpine container image
│   └── package.json
├── data/
│   └── knowledge/          # Controlled ground-truth Markdown documents
│       ├── food.md
│       ├── attractions.md
│       └── landmarks.md
├── docs/                   # Architecture, agent logs, and learning guide
├── docker-compose.yml      # Multi-container orchestration (Server, Client)
├── .env.example            # Single unified environment template
├── package.json            # Root workspace orchestration scripts
└── README.md
```

---

## 2. Docker Compose (Recommended)

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Docker Compose v2+.
* A Google Gemini API Key.
* A [Qdrant Cloud](https://cloud.qdrant.io/) cluster and API Key.

### Step 1: Configure Environment Variables
Create a root `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Edit `.env` and fill in your Gemini and Qdrant Cloud credentials:
```env
PORT=3000
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
EMBEDDING_MODEL=gemini-embedding-001
TOP_K=3
SIMILARITY_THRESHOLD=0.60

# Qdrant Cloud Configuration
QDRANT_URL=https://your-cluster-id.region.gcp.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_cloud_api_key_here
QDRANT_COLLECTION_NAME=hcmc_travel
```

### Step 2: Build & Start Application Containers
```bash
docker compose up -d
```
This starts two application services:
* **`hcmc-server`**: Express Backend (:3000), connecting to Qdrant Cloud over HTTPS.
* **`hcmc-client`**: Nginx + React Frontend (:5173), reverse-proxying `/api` to the backend.

### Step 3: Index Knowledge Base into Qdrant Cloud
Run the indexing process inside the server container:
```bash
docker compose exec server npm run index
```
*(Or from root using npm script: `npm run docker:index`).*

### Step 4: Open the Assistant
Visit **http://localhost:5173** in your web browser.

---

## 3. Data Persistence Guarantee

Vectors and payloads are securely hosted and persisted in **Qdrant Cloud**:
```bash
# Stop local containers:
docker compose down

# Restart containers anytime (vectors remain instantly accessible from Qdrant Cloud):
docker compose up -d
```

---

## 4. Local Development Without Docker (Optional)

If running directly on the host machine:

1. Install dependencies:
   ```bash
   npm run install:all
   ```
2. Ensure `.env` at the project root contains your `GEMINI_API_KEY`, `QDRANT_URL`, and `QDRANT_API_KEY`.
3. Index the knowledge base into Qdrant Cloud:
   ```bash
   npm run index
   ```
4. Start backend and frontend concurrently:
   ```bash
   npm run dev
   ```

---

## 5. API Endpoints

* **`GET /api/health`**: Returns `{ "status": "ok", "indexedChunks": 13 }`.
* **`POST /api/chat`**:
  - Request: `{ "message": "What is Ben Thanh Market?" }`
  - Response:
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
