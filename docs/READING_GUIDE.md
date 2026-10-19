# Student Handbook Assistant — Feature Flow Guide

A quick navigation map tracing requests from HTTP entry points to data layers.

---

### 1. User Chat Entry Point
- **Route**: `POST /api/user/chat` in `server/src/routes/userRoute.js`
- **Middleware**: `validateRequest({ body: chatRequestSchema })` validates input before handler.
- **Controller**: `userController.chat` in `server/src/controllers/userController.js` (delegates to `chatStream` if `stream: true` or `Accept: text/event-stream`).

### 2. Normal Chat Flow
- **Flow**: `userRoute.js` → `userController.chat()` → `chatOrchestrator.orchestrateChat()` → `ragService.executeRAG()` → `llmService.generateText()`
- **Logic**: `executeRAG` queries Qdrant via `retriever.js`. If similarity >= threshold (0.60), passes grounded prompt to Gemini; otherwise returns early refusal text.

### 3. Streaming Chat & SSE Events
- **Flow**: `userRoute.js` (`POST /chat/stream`) → `userController.chatStream()` → `chatOrchestrator.orchestrateChatStream()` → `gemini.generateAnswerStream()`
- **SSE Events**:
  - `metadata`: Sources and retrieval diagnostics emitted immediately.
  - `delta`: Incremental text chunks streamed as generated (`data: {"text":"..."}`).
  - `done`: Final sources and completion signal.
  - `error`: Stream error payload if generation fails mid-stream.
- **Lifecycle**: Invalid input triggers 400 JSON before SSE headers; client abort terminates upstream stream via `AbortController`.

### 4. Document CRUD & Cloud Indexing
- **CRUD Flow**: `adminRoute.js` → `adminController.js` (`getDocument`, `createDocument`, `updateDocument`, `deleteDocument`) → `documentService.js` (`readDocument`, `saveDocument`, `updateDocument`, `removeDocument`) → filesystem (`data/knowledge/*.md`).
- **Indexing Flow**: `POST /api/admin/index` → `adminController.triggerIndexing()` → `adminService.executeIndexing()` → `indexer.runIndexer()` → `vectorStore.initVectorStore()` (Qdrant).

### 5. Chunk Retrieval & Pagination
- **Flow**: `GET /api/admin/chunks` → `adminRoute.js` → `adminController.getChunks()` → `adminService.getPaginatedChunks()` → `chunker.loadAndChunkMarkdown()`
- **Logic**: Parses `limit` (1–50, default 10) and `offset` (default 0) from `res.locals.validated.query`, filters in-memory chunks by keyword, and returns page slice with `hasMore`.

### 6. System Prompt Management
- **Flow**: `GET|PUT|POST /api/admin/prompt[/reset]` → `adminRoute.js` → `adminController.getPrompt|updatePrompt|resetPrompt` → `promptService.js` (`getSystemPrompt`, `saveSystemPrompt`, `resetSystemPrompt`) → persistent template file (`data/prompts/system_prompt.txt`).

### 7. Cross-Cutting Infrastructure
- **Validation**: `server/src/validation/` (`schemas.js`, `validate.js`, `index.js`). Populates `res.locals.validated`.
- **Errors**: `server/src/errors/` (`AppError.js`, `index.js`) & centralized `server/src/middleware/errorHandler.js`.
- **Config & Constants**: `server/src/config.js` (env vars), `server/src/constants/` (`config.js`, `messages.js`, `httpStatus.js`).
