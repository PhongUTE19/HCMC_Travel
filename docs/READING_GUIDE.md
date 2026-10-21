# Student Handbook Assistant — Feature Flow Guide

A concise navigation guide for engineers to quickly understand system architecture, key request flows, and critical files.

---

## 1. System Overview

The system is a RAG assistant with a React frontend, an Express backend organized by feature domains, and cloud external services:
* **Retrieval & Storage**: Qdrant Cloud (3072-dim vector collection: `Student_Handbook`).
* **AI Provider**: Google Gemini (`gemini-3.5-flash-lite`, `gemini-embedding-001`) abstracted behind a pluggable interface.
* **Analytics**: Supabase PostgreSQL persistence with an automated in-memory buffer fallback.
* **Knowledge**: Section-based Markdown documents in `data/knowledge/` and editable prompts in `data/systemPrompt/`.

---

## 2. Request Flow Navigation Map

### 1. User Chat (Synchronous)
* **Route**: `POST /api/user/chat` in `server/src/features/chat/chat.routes.js`
* **Validation**: `validateRequest({ body: chatRequestSchema })` $\rightarrow$ parses into `res.locals.validated.body`.
* **Controller**: `chat.controller.js` (`chat`)
* **Service**: `chat.service.js` (`orchestrateChat`)
* **Retrieval**: `ragService.js` $\rightarrow$ `retriever.js` embeds query via `shared/integrations/ai` and queries Qdrant Cloud.
* **Relevance Gate**: If top similarity $< 0.60$, returns safe refusal; if $\ge 0.60$, builds prompt via `promptBuilder.js` using active system prompt from `prompts.service.js`.
* **Generation**: Generates grounded answer via `geminiProvider.js` and records metrics to `usageTracker.js`.

### 2. Streaming Chat (SSE)
* **Route**: `POST /api/user/chat/stream` in `server/src/features/chat/chat.routes.js`
* **Controller**: `chat.controller.js` (`chatStream`)
* **Service**: `chat.service.js` (`orchestrateChatStream`)
* **Events**: Emits SSE stream: `metadata` (sources) $\rightarrow$ `delta` (`data: {"text":"..."}`) $\rightarrow$ `done`. Supports client abort via `req.on('close')` and `AbortController`.
* **Client UI**: `AnswerContent.jsx` renders incoming tokens with subtle opacity fade-in animation (`streaming-text-fade`).

### 3. Document Management (CRUD)
* **Routes**: `/api/admin/documents[/:filename]` in `server/src/features/documents/documents.routes.js` (mounted in `adminRoute.js`)
* **Controller**: `documents.controller.js` (`getDocuments`, `getDocument`, `createDocument`, `updateDocument`, `deleteDocument`)
* **Service**: `documents.service.js` reads, writes, updates, or deletes files in `data/knowledge/` while enforcing valid Level-2 Markdown headers.

### 4. Knowledge Status & Cloud Indexing
* **Status**: `GET /api/admin/status` in `server/src/features/knowledge/knowledge.routes.js` compares active files to Qdrant vector counts.
* **Indexing**: `POST /api/admin/index` $\rightarrow$ `knowledge.controller.js` $\rightarrow$ `indexer.js`:
  - Parses Markdown via `chunker.js` (splitting on Level-2 `## ` headers without splitting tables).
  - Re-initializes collection in Qdrant Cloud (`vectorStore.js`).
  - Generates embeddings via `embedText()` with retry backoff and upserts vectors.

### 5. Chunk Review & Server Pagination
* **Route**: `GET /api/admin/chunks` in `server/src/features/knowledge/knowledge.routes.js`
* **Validation**: `paginationQuerySchema` parses `limit` (1–50, default 10), `offset` (default 0), and search `q`.
* **Controller**: `knowledge.controller.js` (`getChunks`) $\rightarrow$ `chunker.loadAndChunkMarkdown()` filters and returns slice with `hasMore`.

### 6. System Prompt Management & Reset
* **Routes**: `GET|PUT /api/admin/prompt` and `POST /api/admin/prompt/reset` in `server/src/features/systemPrompt/prompts.routes.js`
* **Controller**: `prompts.controller.js`
* **Service**: `prompts.service.js` reads/writes `data/systemPrompt/system_prompt.txt`. Reset endpoint restores factory default from `data/systemPrompt/system_prompt_default.txt`.

### 7. AI Usage Analytics & Telemetry
* **Routes**: `/api/admin/analytics/{overview,timeseries,breakdown,history}` in `server/src/features/analytics/analytics.routes.js`
* **Controller**: `analytics.controller.js` $\rightarrow$ `analytics.service.js` $\rightarrow$ `analytics.repository.js`
* **Data Flow**: `geminiProvider.js` $\rightarrow$ `usageTracker.js` $\rightarrow$ `analytics.writer.js` (queue) $\rightarrow$ writes to Supabase table `ai_usage_analytics` (or in-memory circular fallback buffer if offline).

---

## 3. Important File Reference

| File | Responsibility |
|---|---|
| `server/src/server.js` | Express app configuration, middleware mounting, and vector store health check. |
| `server/src/config.js` | Centralized environment variable resolution with sensible defaults. |
| `server/src/routes/adminRoute.js` | Root admin route router mounting documents, prompts, knowledge, and analytics routers. |
| `server/src/features/chat/chat.service.js` | Chat orchestrator coordinating RAG retrieval, threshold gating, and LLM text/streaming generation. |
| `server/src/features/knowledge/ragService.js` | Executes vector retrieval, evaluates similarity scores, and constructs the augmented prompt. |
| `server/src/features/knowledge/chunker.js` | Level-2 heading chunker preserving structured Markdown tables and section metadata. |
| `server/src/features/knowledge/vectorStore.js` | Qdrant Cloud client initialization, collection management, and vector count queries. |
| `server/src/shared/integrations/ai/index.js` | Provider-agnostic AI interface (`embedText`, `generateAnswer`, `generateAnswerStream`, `registerAIProvider`). |
| `server/src/shared/integrations/ai/providers/geminiProvider.js` | Official Google Gemini SDK implementation with exponential backoff and telemetry tracking. |
| `server/src/shared/integrations/supabase.js` | Shared singleton client for Supabase database operations. |
| `server/src/shared/middleware/validateRequest.js` | Zod validation middleware populating `res.locals.validated` for body, params, and query. |
| `server/src/shared/middleware/errorHandler.js` | Centralized error handler distinguishing operational `AppError` from 500 internal errors. |
| `client/src/App.jsx` | Primary view coordinator switching between Chat, Admin Console, and Analytics. |
| `client/src/hooks/useTextReveal.js` | Progressive streaming text reveal hook managing active animation fragments and stable text. |
| `client/src/utils/collectionUtils.js` | Pure collection utilities for client-side pagination, multi-field search, and bi-directional sorting. |

---

## 4. Cross-Cutting Infrastructure

* **Validation**: Centralized Zod schemas in each feature directory (`*.schemas.js`). Always read validated data from `res.locals.validated` in controllers.
* **Error Handling**: Throw `AppError` (or domain subclasses like `PromptServiceError`, `ChatOrchestrationError`) with explicit HTTP status codes; unhandled exceptions are safely masked as HTTP 500.
* **Configuration**: Defined in `server/src/constants/config.js` and loaded through `server/src/config.js`.

---

## 5. Verification Commands

```bash
# Run unit & mock tests (offline)
npm test

# Run feature-specific suites
node --test test/aiProvider.test.js
node --test test/analytics.test.js
node --test test/collectionUtils.test.js

# Verify client build
npm --prefix client run build

# Verify git diff formatting
git diff --check
```
