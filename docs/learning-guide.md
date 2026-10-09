# Student Handbook Assistant: Complete Learning & Implementation Guide

---

## 1. Project Overview

### What This Application Does
The **Student Handbook Assistant** is a web-based question-answering system focused on the Lumen Institute of Technology Student Handbook (academic programs, tuition, course registration, library rules, scholarships, exams, dormitory regulations, and policies). Users submit natural-language questions through a browser interface (for example, *"What is the tuition fee for the Standard Program?"* or *"What are the requirements for the Aurora Scholarship?"*). The system looks up relevant information from a curated local knowledge base and produces a concise, factual answer that cites the source documents. If the question is outside the scope of the knowledge base or is not related to the Student Handbook, the system safely refuses to answer instead of hallucinating.

### What RAG Means in This Project
**RAG (Retrieval-Augmented Generation)** is an architectural pattern that combines search with large language models:
1. **Retrieval**: Before calling an LLM, the system converts the user's question into a mathematical vector (embedding) and searches a private, trusted local knowledge base for the most semantically relevant text sections.
2. **Augmentation**: The system injects those retrieved sections into a carefully structured prompt as the *only* factual context.
3. **Generation**: The LLM reads the provided context and writes a response grounded solely in those facts, citing the document titles.

In this project, RAG solves three major problems of raw LLMs:
* **Hallucination Prevention**: The model is instructed never to invent facts not present in the local knowledge base.
* **Verifiable Sourcing**: Every answer lists the exact local documents and sections used.
* **Domain Boundary Enforcement**: Questions unrelated to Student Handbook are blocked before invoking the LLM, saving execution time and API cost.

### Complete End-to-End Flow
1. **Offline Phase (Indexing)**: Markdown documents in `data/knowledge/` are split into section chunks by `chunker.js`. For each chunk, `indexer.js` calls Gemini's embedding API (`gemini-embedding-001`) to generate a 3,072-dimensional vector. These chunks and vectors are saved as a static file in `data/embeddings.json`.
2. **Server Boot Phase**: On startup, `server.js` loads `data/embeddings.json` into an in-memory JavaScript array (`inMemoryChunks`).
3. **Query Phase**:
   - The user enters a question in `public/index.html`.
   - `public/app.js` sends an HTTP `POST` to `/api/chat`.
   - `retriever.js` generates an embedding of the query and computes the cosine similarity against all in-memory chunks.
   - The chunks are sorted, and the top $K=3$ candidates are evaluated against a similarity threshold ($0.60$).
   - If the highest score is below $0.60$, the server returns an immediate out-of-scope response without calling Gemini.
   - If the score meets or exceeds $0.60$, `generator.js` builds a grounded prompt containing the retrieved chunks and calls `generateAnswer()` (`gemini-3.5-flash-lite`).
   - The server responds with `{ answer, sources }`, which the browser renders dynamically.

### Responsibility of Major Files

| File | Primary Responsibility |
|---|---|
| `src/config.js` | Centralizes environment variables, model names, thresholds, and file paths. |
| `src/server.js` | Express server; serves static frontend, `/api/health`, and the `/api/chat` RAG endpoint. |
| `src/rag/chunker.js` | Parses markdown files into section-level chunk objects based on `## ` headings. |
| `src/rag/gemini.js` | Wrapper around `@google/genai` SDK for embedding (`embedContent`) and text generation (`generateContent`). |
| `src/rag/indexer.js` | Offline CLI script that runs chunking, embeds each chunk, and saves `data/embeddings.json`. |
| `src/rag/retriever.js` | Pure JavaScript vector search; computes cosine similarity and ranks Top-K chunks. |
| `src/rag/generator.js` | Constructs strictly grounded prompts with source references and invokes text generation. |
| `public/index.html` | User interface structure (chat form, health badge, response box, sources list). |
| `public/app.js` | Client-side logic (status check, form submission, fetch call, DOM manipulation). |
| `public/style.css` | Minimal, responsive layout styles. |

### Why the Project Uses a Minimal Architecture
1. **2-Hour Exam / Defense Scope**: Building, testing, and presenting the project under tight time constraints requires eliminating unnecessary moving parts.
2. **100% Explainability**: Every line of code can be understood and defended by a student. Vector search is 15 lines of elementary arithmetic (`dot product / magnitudes`) rather than thousands of lines of black-box database code.
3. **Zero Infrastructure Dependencies**: No Docker containers, no PostgreSQL, no ChromaDB/Pinecone servers, and no multi-process coordination. `npm start` runs the entire system.
4. **Predictable Performance**: With 13 curated chunks, in-memory cosine similarity takes less than 2 milliseconds.

### ASCII Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  WEB BROWSER                                      |
|   public/index.html  <-- (User Input & Rendered Answer + Sources)                |
|   public/app.js      --> fetch('/api/chat', { message })                          |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTP POST
                                          v
+-----------------------------------------------------------------------------------+
|                             EXPRESS APPLICATION SERVER                            |
|                                    src/server.js                                  |
|                                                                                   |
|  [ In-Memory Store ]                                                              |
|    inMemoryChunks <=== (Loaded from data/embeddings.json at startup)              |
|                                                                                   |
|  [ Request Pipeline: /api/chat ]                                                  |
|    1. Query Validation                                                            |
|    2. Call retriever.js -----------------------------------------+                |
|    3. Threshold Check: bestScore >= 0.60?                        |                |
|       - NO  --> Early Return: Safe out-of-scope response         |                |
|       - YES --> Call generator.js -----------------------+       |                |
|    4. Return JSON { answer, sources }                    |       |                |
+----------------------------------------------------------+-------+----------------+
                                                           |       |
                                   Text Generation Request |       | Embedding Request
                                                           |       |
                                                           v       v
                                       +----------------------------------------+
                                       |            src/rag/gemini.js           |
                                       |       (@google/genai Client SDK)       |
                                       +-------------------+--------------------+
                                                           |
                                           Google API REST | (HTTPS)
                                                           v
                                       +----------------------------------------+
                                       |            GOOGLE GEMINI API           |
                                       |  - gemini-embedding-001 (Vectorize)   |
                                       |  - gemini-3.5-flash-lite (Generate)   |
                                       +----------------------------------------+
```

---

## 2. Phase-by-Phase Evolution

### Phase 0: Architecture Planning
* **Technology Choice**: Node.js and Express were chosen over Python/FastAPI because of team familiarity, fast project initialization, and direct runtime compatibility.
* **Deliberate Minimalism**: Excluded external databases (PostgreSQL, MongoDB), vector databases (ChromaDB, Pinecone), user accounts/authentication, and multi-turn chat sessions.
* **Separation of Concerns**: Even in planning, retrieval (`retriever.js`) was decoupled from generation (`generator.js`) so that retrieval accuracy could be evaluated independently of the LLM.

### Phase 2: Walking Skeleton & Offline Indexing
In Phase 2, the team verified basic connectivity and the indexing pipeline before writing any retrieval code:

```
[data/knowledge/*.md]
        │
        ▼ (chunker.js reads files & splits on '## ')
  Array of Chunks: [{ id, title, content, source }]
        │
        ▼ (indexer.js calls gemini.js embedText() in a loop)
  Chunks with Embeddings: [{ ..., embedding: [3072 floats] }]
        │
        ▼ (Saved to disk as JSON)
[data/embeddings.json]
        │
        ▼ (server.js startup: fs.readFileSync & JSON.parse)
  inMemoryChunks in Server RAM
```

#### Why Embeddings are Generated During Indexing (Not on Server Startup)
* **API Cost & Quota Conservation**: Embedding 13 chunks requires 13 remote API calls. Doing this on every server restart would quickly exhaust API quotas during local development.
* **Instant Server Startup**: Reading `data/embeddings.json` from local disk takes ~5 milliseconds. Generating embeddings over network API calls takes 10 to 15 seconds.
* **Separation of Roles**: The knowledge base is authoring-time data. The server is runtime infrastructure.

At the end of Phase 2, the server had a "walking skeleton" flow:
$$\text{Browser} \rightarrow \text{Express} \rightarrow \text{Direct Gemini Call (no context)} \rightarrow \text{Browser}$$

### Phase 3: RAG Retrieval + Grounded Generation
Phase 3 introduced the actual RAG pipeline:
1. `retriever.js` was created to vectorize the user query and calculate cosine similarity against every chunk in `inMemoryChunks`.
2. A **Similarity Threshold Gate** ($0.60$) was added: if the query has no strong semantic relationship to the knowledge base, it returns immediately without calling the LLM.
3. `generator.js` was created to wrap the retrieved chunks inside a strict prompt requiring facts to come solely from the context.
4. `server.js` was updated to chain these steps and return the source list `{ title, source, score }`.
5. `public/app.js` and `public/index.html` were updated to render the retrieved source cards underneath the answer.

---

## 3. File-by-File Code Explanation

### 3.1. `src/config.js`
* **Problem Solved**: Prevents hardcoded magic numbers, API keys, and model names scattered across multiple files.
* **Imports**:
  * `path`, `url`: Resolves absolute filesystem paths regardless of the current working directory.
  * `dotenv`: Reads variables from the local `.env` file into `process.env`.
* **Exported Structure**:
  ```javascript
  export const config = {
    port: process.env.PORT || 3000,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    embeddingModel: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.60'),
    topK: parseInt(process.env.TOP_K || '3', 10),
    knowledgeDir: path.join(projectRoot, 'data', 'knowledge'),
    embeddingsFile: path.join(projectRoot, 'data', 'embeddings.json'),
  };
  ```
* **Interactions**: Imported by `server.js`, `gemini.js`, and `indexer.js`.
* **What Breaks If Changed**: If model fallback names are wrong (e.g. referencing deprecated models like `gemini-2.5-flash`), calls fail with HTTP 404 from the Gemini API.

---

### 3.2. `src/rag/chunker.js`
* **Problem Solved**: Converts large, unstructured markdown files into small, self-contained sections suitable for semantic embedding.
* **Imports**: `fs`, `path` for filesystem operations.
* **Exported Function**: `loadAndChunkMarkdown(knowledgeDir)`
  * **Input**: Directory path (e.g. `data/knowledge`).
  * **Processing**:
    1. Reads all files ending in `.md`.
    2. Splits lines sequentially.
    3. Detects lines starting with `## ` (markdown Level-2 headings).
    4. Collects all text between headings as the `content`.
    5. Sets `title` to the heading text without `## `.
    6. Constructs an ID: `${baseFileName}_${sectionIndex}`.
  * **Output**: An array of plain chunk objects:
    ```json
    {
      "id": "KB-A_Lumen-Institute-Student-Handbook_1",
      "title": "2. Programs at a Glance",
      "content": "| Item | Standard Program | Honors Program |\n|---|---|---|...",
      "source": "KB-A_Lumen-Institute-Student-Handbook.md"
    }
    ```
* **Why Header-Based Chunking Was Chosen**: Fixed-character chunking (e.g., splitting every 500 characters) cuts words or sentences in half, separating policy criteria from fee schedules. Splitting by `## ` guarantees that every chunk contains exactly one cohesive section.
* **What Breaks If Changed**: If heading detection breaks, files become one giant chunk, exceeding optimal embedding focus and losing granularity.

---

### 3.3. `src/rag/gemini.js`
* **Problem Solved**: Encapsulates all direct communication with the Google Gemini SDK. Other modules never touch the SDK directly.
* **Imports**: `GoogleGenAI` from `@google/genai`, `config` from `../config.js`.
* **Internal State**: `let aiInstance = null;` implements a lazy singleton pattern.
* **Exported Functions**:
  1. `embedText(text)`:
     * Calls `ai.models.embedContent({ model: config.embeddingModel, contents: text })`.
     * Handles both SDK response variants: `response.embedding?.values` and `response.embeddings?.[0]?.values`.
     * Returns: A `number[]` array of length 3,072.
  2. `generateAnswer(prompt)`:
     * Calls `ai.models.generateContent({ model: config.geminiModel, contents: prompt })`.
     * Returns: A string of generated text.
* **Interactions**: Used by `indexer.js` and `retriever.js` (for embeddings), and by `generator.js` (for text generation).
* **What Breaks If Changed**: If the SDK method calls or return shape parsers fail, neither indexing nor generation can function.

---

### 3.4. `src/rag/indexer.js`
* **Problem Solved**: Pre-computes embeddings for the knowledge base and writes them to a JSON file.
* **Imports**: `fs`, `path`, `config`, `loadAndChunkMarkdown`, `embedText`.
* **Exported Function**: `runIndexer()`
  * **Processing**:
    1. Calls `loadAndChunkMarkdown(config.knowledgeDir)`.
    2. Iterates over every chunk sequentially.
    3. Constructs the text representation: `${chunk.title}\n${chunk.content}`.
    4. Calls `embedText(textToEmbed)`.
    5. Appends the resulting vector as `chunk.embedding`.
    6. Writes the array to `data/embeddings.json` using `JSON.stringify(..., null, 2)`.
* **Execution**: Can be run from CLI via `node src/rag/indexer.js` or `npm run index`.
* **What Breaks If Changed**: Without this file, `data/embeddings.json` cannot be created or updated when knowledge documents change.

---

### 3.5. `src/rag/retriever.js`
* **Problem Solved**: Finds the most relevant knowledge base chunks for an arbitrary user question using vector math.
* **Imports**: `embedText` from `./gemini.js`.
* **Exported Functions**:
  1. `cosineSimilarity(a, b)`:
     * **Formula**:
       $$\text{Cosine Similarity} = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \|\mathbf{b}\|} = \frac{\sum_{i=1}^{n} a_i b_i}{\sqrt{\sum_{i=1}^{n} a_i^2} \sqrt{\sum_{i=1}^{n} b_i^2}}$$
     * Computes the dot product and vector magnitudes in a single loop over 3,072 indices.
     * Returns a float between -1.0 and 1.0 (typically 0.40 to 0.85 for normalized text embeddings).
  2. `retrieveRelevantChunks(query, chunks, topK = 3)`:
     * **Processing**:
       1. Calls `embedText(query.trim())` to convert the question into a 3,072-dimensional vector.
       2. Loops through `chunks`, computing `cosineSimilarity(queryEmbedding, chunk.embedding)`.
       3. Returns objects with `{ id, title, content, source, score }`.
       4. Sorts the array descending by `score`.
       5. Slices the top `topK` items (`scoredChunks.slice(0, topK)`).
* **Why Pure JS Was Chosen**: For 13 chunks, looping 13 times over an array of 3,072 numbers takes **under 1 millisecond** in V8. A vector database would add network latency, operational overhead, and configuration complexity for no performance benefit.
* **What Breaks If Changed**: If cosine similarity logic has errors (e.g. division by zero or mismatched vector lengths), search ranking fails completely.

---

### 3.6. `src/rag/generator.js`
* **Problem Solved**: Converts retrieved text chunks and the user's question into a prompt that prevents hallucination, then gets the LLM's response.
* **Imports**: `generateAnswer` from `./gemini.js`.
* **Exported Functions**:
  1. `buildGroundedPrompt(question, chunks)`:
     * Combines chunk titles, sources, and contents into labeled context blocks:
       ```
       [Source 1: 2. Programs at a Glance (KB-A_Lumen-Institute-Student-Handbook.md)]
       | Item | Standard Program | Honors Program |
       ```
     * Injects strict negative rules:
       - Rely *only* on stated facts.
       - Do *not* extrapolate or guess.
       - If context lacks information, state: *"The knowledge base does not contain enough information to answer this question."*
       - Cite sources in brackets, e.g. `[2. Programs at a Glance]`.
  2. `generateGroundedAnswer(question, chunks)`:
     * Checks if `chunks` is empty; if so, returns the fallback string immediately.
     * Otherwise calls `generateAnswer(prompt)`.
* **Why Separated From `retriever.js`**: By keeping prompt creation and LLM calling in a separate module, the generation logic can be tested using mock chunks without performing actual vector searches.

---

### 3.7. `src/server.js`
* **Problem Solved**: Acts as the system orchestrator, serving the web UI and exposing REST endpoints.
* **Imports**: `express`, `fs`, `path`, `fileURLToPath`, `config`, `retrieveRelevantChunks`, `generateGroundedAnswer`.
* **State**: `let inMemoryChunks = [];`
  * Function `loadEmbeddingsIntoMemory()`: Reads and parses `data/embeddings.json` synchronously before listening on `config.port`.
* **Endpoints**:
  1. `GET /api/health`: Returns `{ status: "ok", indexedChunks: inMemoryChunks.length }`.
  2. `POST /api/chat`:
     * Expects `{ message: string }`.
     * Validates input (rejects empty messages with HTTP 400).
     * Calls `retrieveRelevantChunks(query, inMemoryChunks, config.topK)`.
     * Inspects `bestScore = retrievedChunks[0]?.score || 0`.
     * **Guardrail**: If `bestScore < config.similarityThreshold` ($0.60$):
       - Logs rejection to console.
       - Returns HTTP 200 with:
         ```json
         {
           "answer": "I do not have verified information about this topic in the student handbook knowledge base. Please ask about Lumen Institute programs, tuition, scholarships, courses, exams, or student rules.",
           "sources": []
         }
         ```
       - **Skips Gemini generation entirely.**
     * If accepted:
       - Calls `generateGroundedAnswer(query, retrievedChunks)`.
       - Maps `sources` to clean objects (`{ title, source, score }`) without exposing internal embedding vectors.
       - Returns HTTP 200 with `{ answer, sources }`.
* **Static Hosting**: `app.use(express.static(path.join(projectRoot, 'public')));` serves the frontend directly.

---

### 3.8. `public/index.html`, `public/app.js`, `public/style.css`
* **`public/index.html`**:
  * Semantic HTML structure containing a title, health badge (`#health-badge`), chat form (`#chat-form`), text input (`#message-input`), submit button (`#submit-btn`), loading indicator (`#loading`), error container (`#error-box`), answer container (`#answer-section`), and source citations list (`#sources-list`).
* **`public/app.js`**:
  * `checkHealth()`: Queries `GET /api/health` on page load to display the server status and count of indexed chunks in memory.
  * Form `submit` event listener:
    1. Prevents default form reload.
    2. Sets UI to loading state (disables submit button, shows `#loading`, hides previous answers and errors).
    3. Calls `fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message }) })`.
    4. On success: Writes `data.answer` into `#answer-text`. If `data.sources` contains items, creates `<li>` elements displaying document title, filename, and score.
    5. On failure: Displays the error message in `#error-box`.
    6. In `finally`: Re-enables the submit button and hides the loading indicator.
* **`public/style.css`**: Clean, accessible CSS with a container width of 680px, responsive inputs, and distinct visual states for loading and error alerts.

---

## 4. Tracing Real Requests

### Trace 1: In-Scope Accepted Query — `"What is the tuition fee for the Standard Program?"`

1. **User Action**: User types `"What is the tuition fee for the Standard Program?"` and clicks "Send".
2. **Browser Layer (`client/src/components/user/UserChatView.jsx`)**:
   - `fetch('/api/user/chat', { method: 'POST', body: '{"message":"What is the tuition fee for the Standard Program?"}' })` is executed.
3. **Route Handler & Controller (`server/src/controllers/userController.js`)**:
   - `req.body.message` is validated and trimmed.
4. **Retrieval (`server/src/rag/retriever.js`)**:
   - `retrieveRelevantChunks("What is the tuition fee for the Standard Program?", 3)` is called.
   - `gemini.embedText(...)` sends an API request to `models/gemini-embedding-001`.
   - The query vector (3,072 floats) is compared against Qdrant Cloud collection `student_handbook`.
   - Top-3 scored chunks:
     1. `2. Programs at a Glance` (`KB-A_Lumen-Institute-Student-Handbook.md`) — **Score: 0.8124**
     2. `3. Paying Tuition` (`KB-A_Lumen-Institute-Student-Handbook.md`) — **Score: 0.7410**
     3. `1. About This Handbook` (`KB-A_Lumen-Institute-Student-Handbook.md`) — **Score: 0.6380**
5. **Threshold Evaluation (`server/src/services/userService.js`)**:
   - `bestScore = 0.8124`.
   - Condition: `0.8124 < 0.60` is **`false`**.
   - Server logs: `[Chat] Query accepted (0.8124 >= 0.6). Calling generateGroundedAnswer()...`
6. **Prompt Construction (`server/src/rag/generator.js`)**:
   - `buildGroundedPrompt()` injects the 3 retrieved chunks into the prompt context:
     ```text
     Context:
     [Source 1: 2. Programs at a Glance (KB-A_Lumen-Institute-Student-Handbook.md)]
     | Item | Standard Program | Honors Program |
     ...
     Question: What is the tuition fee for the Standard Program?
     ```
7. **LLM Generation (`server/src/rag/gemini.js`)**:
   - `generateAnswer(prompt)` sends the augmented prompt to `models/gemini-3.5-flash-lite`.
   - Gemini responds with a grounded paragraph citing `[2. Programs at a Glance]`.
8. **HTTP Response**:
   - Status: `200 OK`.
   - Body:
     ```json
     {
       "answer": "The tuition fee for the Standard Program is 42,000,000 VND per semester [2. Programs at a Glance].",
       "sources": [
         { "title": "2. Programs at a Glance", "source": "KB-A_Lumen-Institute-Student-Handbook.md", "score": 0.8124 },
         { "title": "3. Paying Tuition", "source": "KB-A_Lumen-Institute-Student-Handbook.md", "score": 0.7410 },
         { "title": "1. About This Handbook", "source": "KB-A_Lumen-Institute-Student-Handbook.md", "score": 0.6380 }
       ]
     }
     ```
9. **UI Rendering**: The browser displays the answer and renders 3 source cards with their respective scores.

---

### Trace 2: Out-of-Scope Rejected Query — `"What is linear algebra?"`

1. **User Action**: User types `"What is linear algebra?"` and clicks "Send".
2. **Browser Layer (`public/app.js`)**:
   - `fetch('/api/chat')` sends `{ "message": "What is linear algebra?" }`.
3. **Route Handler (`src/server.js`)**:
   - Message is validated.
4. **Retrieval (`src/rag/retriever.js`)**:
   - `retrieveRelevantChunks("What is linear algebra?", inMemoryChunks, 3)` is called.
   - `gemini.embedText("What is linear algebra?")` converts the question into a 3,072-dimensional vector.
   - Cosine similarity is computed against all 13 in-memory chunks.
   - Top-3 scored chunks:
     1. `8. Dormitory` (`KB-A_Lumen-Institute-Student-Handbook.md`) — **Score: 0.4412**
     2. `5. Library` (`KB-A_Lumen-Institute-Student-Handbook.md`) — **Score: 0.4398**
     3. `7. Exam Rules` (`KB-A_Lumen-Institute-Student-Handbook.md`) — **Score: 0.4391**
5. **Threshold Evaluation (`src/server.js`)**:
   - `bestScore = 0.4412`.
   - Condition: `0.4412 < 0.60` is **`true`**.
   - Server logs: `[Chat] Query rejected by similarity threshold (0.4412 < 0.6). Early return before calling generateGroundedAnswer().`
6. **Bypass / Early Return**:
   - **`generateGroundedAnswer()` is NEVER called.**
   - **`gemini.generateAnswer()` is NEVER called.**
   - The route handler immediately returns:
     ```json
     {
       "answer": "I do not have verified information about this topic in the student handbook knowledge base. Please ask about Lumen Institute programs, tuition, scholarships, courses, exams, or student rules.",
       "sources": []
     }
     ```
7. **HTTP Response**: Status `200 OK` returns in ~750ms (the time needed only for the single embedding API call, completely avoiding the generation call).
8. **UI Rendering**: The browser renders the safe refusal notice. Since `sources` is empty (`[]`), the sources container is hidden.

---

## 5. Important Concepts

### 1. Large Language Model (LLM)
* **What It Means**: A neural network trained on vast text corpora to predict and generate natural language.
* **Why This Project Needs It**: To synthesize readable, grammatical answers from raw knowledge text.
* **Project Example**: `gemini-3.5-flash-lite`, invoked in `src/rag/gemini.js`.

### 2. Embedding
* **What It Means**: A mathematical projection that maps human language into a high-dimensional continuous vector space, where concepts with similar meanings sit physically close to one another.
* **Why This Project Needs It**: Enables semantic search rather than exact keyword matching (e.g. recognizing that "cost of classes" relates to "tuition fees").
* **Project Example**: Gemini's `embedContent` API transforming a string into 3,072 floating-point numbers.

### 3. Vector
* **What It Means**: An ordered array of numbers: $[v_0, v_1, \dots, v_{3071}]$.
* **Why This Project Needs It**: Computers cannot directly measure the "meaning" of words, but they can calculate distances between number arrays.
* **Project Example**: The `embedding` field attached to every chunk in `data/embeddings.json`.

### 4. Chunk
* **What It Means**: A discrete piece of a larger document.
* **Why This Project Needs It**: Passing an entire 10,000-word student handbook document into an LLM context is expensive, slow, and causes the model to miss details. Chunking isolates specific topics.
* **Project Example**: The text under `## 2. Programs at a Glance` in `data/knowledge/KB-A_Lumen-Institute-Student-Handbook.md`.

### 5. Cosine Similarity
* **What It Means**: A metric that measures the cosine of the angle between two multi-dimensional vectors:
  $$\cos(\theta) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \|\mathbf{b}\|}$$
  It measures directional alignment rather than vector length.
* **Why This Project Needs It**: Ranks how closely the semantic meaning of the user's query matches each chunk.
* **Project Example**: The `cosineSimilarity(a, b)` function in `src/rag/retriever.js`.

### 6. Top-K
* **What It Means**: The parameter $K$ specifying how many of the highest-scoring search results to keep.
* **Why This Project Needs It**: Limits the context sent to the LLM to only the most relevant items.
* **Project Example**: `topK: 3` in `src/config.js`.

### 7. Retrieval
* **What It Means**: The step of searching an index to find relevant information for a query.
* **Why This Project Needs It**: Locates the specific needle in the knowledge base haystack before generation.
* **Project Example**: `retrieveRelevantChunks()` in `src/rag/retriever.js`.

### 8. Context
* **What It Means**: The factual reference text supplied to the LLM alongside the question in the prompt.
* **Why This Project Needs It**: Provides the ground-truth facts from which the LLM must construct its answer.
* **Project Example**: The formatted `[Source 1: ...] [Source 2: ...]` string in `buildGroundedPrompt()`.

### 9. Grounded Generation
* **What It Means**: Prompting an LLM under strict instructions to answer using *only* the facts in the provided context, without bringing in external knowledge.
* **Why This Project Needs It**: Eliminates hallucinations and ensures answers reflect only verified project data.
* **Project Example**: The prompt rules in `src/rag/generator.js`.

### 10. RAG (Retrieval-Augmented Generation)
* **What It Means**: The combined pipeline: User Query $\rightarrow$ Vector Search $\rightarrow$ Context Injection $\rightarrow$ LLM Generation.
* **Why This Project Needs It**: Connects general-purpose LLM reasoning to private, verifiable local data.
* **Project Example**: The end-to-end flow inside `app.post('/api/chat')`.

### 11. Similarity Threshold
* **What It Means**: A minimum numeric cutoff score required for a search result to be considered relevant.
* **Why This Project Needs It**: Top-K *always* returns $K$ results, even for completely irrelevant queries. The threshold filters out queries that have no real match.
* **Project Example**: `similarityThreshold = 0.60` in `src/config.js`.

### 12. Source Citation
* **What It Means**: Directly attributing statements in the generated response to specific source titles.
* **Why This Project Needs It**: Allows the user to verify where each fact came from.
* **Project Example**: Returning `sources: [{ title, source, score }]` and generating inline tags like `[Cơm Tấm (Broken Rice)]`.

### 13. In-Memory Data
* **What It Means**: Storing data structures in server RAM rather than querying disk or a database on every request.
* **Why This Project Needs It**: Searching 13 chunks in RAM takes less than 1 millisecond.
* **Project Example**: `inMemoryChunks` in `src/server.js`.

### 14. Pre-Computed Embeddings
* **What It Means**: Generating and saving vector embeddings in advance (during an offline indexing step) rather than on the fly.
* **Why This Project Needs It**: Avoids generating embeddings for the entire knowledge base every time the server starts or when a user asks a question.
* **Project Example**: `data/embeddings.json` created by `src/rag/indexer.js`.

---

## 6. Important Distinctions

### Knowledge Text vs. Embedding Vector
* **Knowledge Text**: Human-readable characters (`"Cơm tấm is made from fractured rice..."`). Used by the human and by the LLM during answer generation.
* **Embedding Vector**: Machine-readable array of 3,072 numbers (`[-0.012, 0.045, ...]`). Used purely for mathematical similarity comparisons during retrieval.

### Indexing vs. Retrieval
* **Indexing (Offline)**: Runs once when documents change. Chunks markdown files, calls the embedding API for each chunk, and saves `data/embeddings.json`.
* **Retrieval (Online / Runtime)**: Runs on every user question. Embeds the question and searches against the already-indexed chunks in RAM.

### Retrieval vs. Generation
* **Retrieval**: Does *not* generate any new words. It only finds and ranks existing text chunks.
* **Generation**: Does *not* search the knowledge base. It receives the text found by retrieval and writes a natural language response.

### Top-K vs. Similarity Threshold
* **Top-K**: Controls the *quantity* of candidates returned (e.g. always take the top 3). It does *not* know if the candidates are good or bad.
* **Similarity Threshold**: Controls the *quality* cutoff (e.g. score must be $\ge 0.60$). It decides whether the best candidate is good enough to proceed.

### Similarity Score vs. Confidence
* **Similarity Score**: The cosine angle between two vector directions. It measures *semantic closeness* between the query and chunk text, not whether the factual answer is true.
* **Confidence**: How certain a model is that its answer is factually correct. High semantic similarity does not guarantee the chunk contains the exact answer to the question.

### RAG vs. Simply Asking Gemini
* **Asking Gemini Directly**: The model relies on whatever it memorized during training. It may hallucinate, cite outdated facts, or invent nonexistent Saigon restaurants.
* **RAG**: The model is restricted to a curated local knowledge base. It must cite its sources and cannot answer if the facts are missing.

### Knowledge Base vs. LLM Knowledge
* **Knowledge Base**: The controlled files in `data/knowledge/*.md`. This is the ground truth.
* **LLM Knowledge**: The billions of parameters inside Google's neural network. In this application, the LLM's role is restricted to reading comprehension and synthesis, not acting as the source of truth.

### `gemini.js` vs. `retriever.js` vs. `generator.js`
* **`gemini.js`**: Low-level SDK wrapper. Makes HTTP calls to Google's API for `embedContent` and `generateContent`.
* **`retriever.js`**: Math and ranking module. Takes a query, calls `gemini.embedText()`, runs cosine similarity against `inMemoryChunks`, and returns Top-K chunks.
* **`generator.js`**: Prompt crafting module. Takes retrieved chunks, builds a grounded prompt with guardrails, and calls `gemini.generateAnswer()`.

### `embeddings.json` vs. `inMemoryChunks`
* **`embeddings.json`**: The persistent representation on the hard drive. Survives server reboots.
* **`inMemoryChunks`**: The runtime JavaScript array in server RAM. Created by parsing `embeddings.json` on startup for sub-millisecond access.

---

## 7. Failure Cases and Limitations

### 1. Why an Unrelated Query Still Receives Top-K Results
Vector similarity is a relative ranking. If you have 13 chunks and ask for Top-3, the retriever calculates 13 numbers and sorts them. Even if every chunk is completely irrelevant, three of them will mathematically have higher scores than the other ten.
* *Example*: For `"What is linear algebra?"`, the highest score was `Landmark 81` with **`0.4412`**. Without a threshold, Landmark 81 would have been sent to Gemini as "relevant" context.

### 2. Why Top-K Does Not Mean "Relevant"
Top-K simply returns the $K$ highest mathematical values. It does not know what those values mean in human terms. This is why a **similarity threshold** is mandatory.

### 3. The Graduate Tuition Case (Semantic Proximity Without Factual Answers)
* **User Query**: *"What is the tuition fee for Master's degree programs?"*
* **Top Retrieved Chunk**: *2. Programs at a Glance* or *3. Paying Tuition* with a score around **`0.64`**.
* **Why it passed the threshold ($0.64 \ge 0.60$)**: The query contains terms like "tuition", "fee", and "degree", which are semantically close to university programs and fee structures in the vector space.
* **How the system handled it**: The chunks were passed to `generator.js`. Gemini read the context about undergraduate Standard and Honors programs, saw that Master's programs were not mentioned anywhere in the handbook, and followed Rule 3:
  > *"The knowledge base does not contain enough information to answer this question."*
* **Takeaway**: The system uses a two-layer defense. Layer 1 (threshold) stops obvious out-of-scope queries (like linear algebra). Layer 2 (prompt grounding) catches queries that pass the threshold but lack specific answers in the retrieved text.

### 4. Why the Threshold is a Heuristic, Not a Probability
Cosine similarity produces a geometric value between -1.0 and 1.0. A score of `0.60` does **not** mean "60% probability of being correct." It is simply an empirical cutoff chosen based on testing:
* In-domain questions score between $0.75$ and $0.81$.
* Out-of-scope questions score below $0.45$.
* Ambiguous questions score around $0.52$.
* Setting the threshold at $0.60$ cleanly separates these groups for this dataset.

### 5. Where Retrieval Can Fail
* **Vocabulary Mismatch**: If a user uses slang, acronyms, or non-standard spellings that the embedding model doesn't associate with the topic, the similarity score drops below the threshold.
* **Chunk Granularity**: If a chunk is too long, the embedding becomes diluted across multiple subtopics, lowering the score for specific questions.
* **Cross-Language Variance**: While `gemini-embedding-001` supports Vietnamese and English, queries in less common languages may produce lower similarity scores.

### 6. Where Generation Can Fail
* **Context Overload**: If $K$ is set too large (e.g. $K=20$), the prompt fills with irrelevant text, increasing the chance that the LLM misses the key fact ("lost in the middle" problem).
* **Instruction Drift**: If the prompt instructions are not strict enough, the LLM may fall back to its pre-trained knowledge and answer ungrounded questions.

### 7. Why RAG Does Not Guarantee Correctness
RAG only ensures that the generation is grounded in the *retrieved context*. If the context itself contains outdated or incorrect information (for example, if a scholarship deadline in the handbook changed without updating the document), the LLM will output that incorrect information with a valid source citation. The quality of a RAG system is fundamentally limited by the quality of its knowledge base.

---

## 8. Execution Trace (ASCII Sequence Diagram)

```
USER / BROWSER                 EXPRESS SERVER                RETRIEVER / GENERATOR                 GOOGLE GEMINI API
 (public/app.js)              (src/server.js)              (retriever.js / generator.js)          (@google/genai Client)
       │                             │                                   │                                  │
       │ 1. POST /api/chat           │                                   │                                  │
       │    { message: "..." }       │                                   │                                  │
       ├────────────────────────────>│                                   │                                  │
       │                             │ 2. Validate input                 │                                  │
       │                             │ 3. retrieveRelevantChunks()       │                                  │
       │                             ├──────────────────────────────────>│                                  │
       │                             │                                   │ 4. embedText(query)              │
       │                             │                                   ├─────────────────────────────────>│
       │                             │                                   │    [EMBEDDING REQUEST]           │
       │                             │                                   │    model: gemini-embedding-001   │
       │                             │                                   │                                  │
       │                             │                                   │ 5. Returns query vector (3072)   │
       │                             │                                   │<─────────────────────────────────┤
       │                             │                                   │                                  │
       │                             │                                   │ 6. Loop inMemoryChunks:          │
       │                             │                                   │    calculate cosineSimilarity    │
       │                             │                                   │ 7. Sort & slice Top-K (3)        │
       │                             │ 8. Returns Top-K chunks + scores  │                                  │
       │                             │<──────────────────────────────────┤                                  │
       │                             │                                                                      │
       │                             │ 9. Evaluate Threshold Gate:                                         │
       │                             │    Is bestScore >= 0.60 ?                                            │
       │                             │                                                                      │
       │                             ├─────────────────────────────────────────────────┐                    │
       │                             │ [IF bestScore < 0.60: OUT-OF-SCOPE]             │                    │
       │                             │ - Log rejection                                 │                    │
       │                             │ - Skip LLM generation                           │                    │
       │ 10a. HTTP 200 OK            │ - Return safe refusal message                   │                    │
       │      { answer, sources: [] }│                                                 │                    │
       │<────────────────────────────┤                                                 │                    │
       │                             │                                                 │                    │
       │                             │ [IF bestScore >= 0.60: ACCEPTED]                │                    │
       │                             │ 10b. generateGroundedAnswer()                   │                    │
       │                             ├────────────────────────────────────────────────>│                    │
       │                             │                                   │ 11. buildGroundedPrompt()        │
       │                             │                                   │ 12. generateAnswer(prompt)       │
       │                             │                                   ├─────────────────────────────────>│
       │                             │                                   │     [GENERATION REQUEST]         │
       │                             │                                   │     model: gemini-3.5-flash-lite │
       │                             │                                   │                                  │
       │                             │                                   │ 13. Returns generated text       │
       │                             │                                   │<─────────────────────────────────┤
       │                             │ 14. Returns grounded answer text  │                                  │
       │                             │<──────────────────────────────────┤                                  │
       │                             │                                                                      │
       │                             │ 15. Map clean source metadata [{ title, source, score }]             │
       │ 16. HTTP 200 OK             │                                                                      │
       │     { answer, sources }     │                                                                      │
       │<────────────────────────────┤                                                                      │
       │                             │                                                                      │
       │ 17. Render answer & sources │                                                                      │
       v                             v                                                                      v
```

---

## 9. "Read the Code in This Order"

For a beginner or student studying this repository, follow this reading path:

1. **`src/server.js`**:
   * *Why Start Here*: It is the entry point. You see how Express boots, where requests arrive (`/api/chat`), and how the overall control flow works.
2. **`src/config.js`**:
   * *Why Second*: You see all the settings and constants that `server.js` relies on (`port`, `topK`, `similarityThreshold`, model names).
3. **`src/rag/gemini.js`**:
   * *Why Third*: Understand the two primitive operations this system needs from Google: converting text to vectors (`embedText`) and asking a model to generate text (`generateAnswer`).
4. **`src/rag/indexer.js`**:
   * *Why Fourth*: Understand how the offline data pipeline works: how documents are prepared before the server ever starts.
5. **`src/rag/chunker.js`**:
   * *Why Fifth*: See how markdown text is split on `## ` headings into individual chunks with IDs and metadata.
6. **`src/rag/retriever.js`**:
   * *Why Sixth*: The core of the "R" in RAG. See how `cosineSimilarity` works mathematically and how Top-K ranking is implemented in pure JavaScript.
7. **`src/rag/generator.js`**:
   * *Why Seventh*: The core of the "G" in RAG. See how retrieved chunks are converted into an augmented prompt with strict grounding rules.
8. **Frontend Files (`public/index.html`, `public/app.js`, `public/style.css`)**:
   * *Why Last*: See how the user interacts with the system, how the loading states work, and how answers and source cards are displayed.

---

## 10. Defense Questions & Model Answers

### Q1: Why use RAG instead of fine-tuning or prompt engineering alone?
* **Answer**: Fine-tuning is expensive, slow, and bakes knowledge into model weights where it can still hallucinate or become outdated. Prompt engineering alone is limited by how much text fits in the prompt. RAG dynamically retrieves only the relevant sections from an external, easily updated knowledge base, providing verifiable citations with zero model training cost.

### Q2: Why not just send the whole knowledge base in the prompt on every request?
* **Answer**: Our knowledge base is currently small (13 chunks), but real knowledge bases have thousands of pages. Sending everything wastes tokens, increases cost, increases latency, and degrades model attention ("lost in the middle" effect). RAG keeps prompts small, fast, and focused.

### Q3: Why do we need vector embeddings? Why not just use keyword search (`String.includes` or regex)?
* **Answer**: Keyword search fails when users use synonyms (e.g. searching "cost of attendance" wouldn't match a document titled "Tuition and Fees"). Embeddings capture *semantic meaning*, so "cost", "tuition", "semester fee", and "payment" all map to similar vector directions regardless of the exact words used.

### Q4: Why did you choose cosine similarity over Euclidean distance?
* **Answer**: Cosine similarity measures the *angle* between vectors rather than their magnitude:
  $$\cos(\theta) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \|\mathbf{b}\|}$$
  In text embeddings, vector length can vary with text length or model scaling. Cosine similarity normalizes for length, measuring only thematic alignment.

### Q5: Why is Top-K set to 3?
* **Answer**: With 13 sections in our knowledge base, $K=3$ provides enough breadth to cover questions spanning multiple spots (e.g. Broken Rice stalls across districts) while keeping the prompt under 1,000 tokens for fast, low-cost generation.

### Q6: Why did you choose 0.60 as the similarity threshold?
* **Answer**: Through empirical testing with `gemini-embedding-001`:
  * Direct student handbook questions scored between $0.75$ and $0.82$.
  * Related handbook queries scored between $0.62$ and $0.66$.
  * Out-of-scope queries (e.g. *"What is linear algebra?"*) scored $0.44$.
  * Ambiguous queries scored $0.52$.
  A threshold of $0.60$ cleanly separates relevant queries from irrelevant queries before calling Gemini.

### Q7: Why didn't you use a vector database like ChromaDB, Pinecone, or Milvus?
* **Answer**: For 13 chunks (or even a few thousand), in-memory JavaScript vector math takes under 2 milliseconds. Adding an external vector database would introduce network latency, Docker dependencies, configuration overhead, and potential binary compatibility issues, with zero benefit for a project of this scale.

### Q8: Why store embeddings in `data/embeddings.json` instead of generating them at server startup?
* **Answer**: Generating embeddings requires remote API calls. Calling the API on every server restart wastes quotas and takes 10–15 seconds. Pre-computing them during an indexing step allows the server to load them from disk in ~5 milliseconds.

### Q9: Why separate `retriever.js` from `generator.js`?
* **Answer**: Modularity. It allows us to unit test retrieval accuracy (verifying that the right chunks and scores come back) without spending API credits on text generation, and vice versa.

### Q10: What happens when the answer is not in the knowledge base?
* **Answer**: The system uses a two-tier defense:
  1. *Tier 1 (Retriever Threshold)*: If the query is completely unrelated (score $< 0.60$), the server returns a safe refusal message and never calls Gemini.
  2. *Tier 2 (Grounded Prompt)*: If the query passes the threshold due to partial word overlap, Gemini is instructed to respond: *"The knowledge base does not contain enough information to answer this question."*

### Q11: Can RAG still hallucinate?
* **Answer**: Yes, though the risk is greatly reduced. An LLM can still misinterpret the retrieved text or blend facts from different chunks if the context is ambiguous. Strict prompt constraints minimize this risk, but cannot eliminate it entirely.

### Q12: What are the current scalability limitations?
* **Answer**:
  1. *Linear scan*: Computing cosine similarity against every chunk is $O(N)$. At 100,000 chunks, this would become slow and require an approximate nearest neighbor (ANN) index (like HNSW).
  2. *Single process RAM*: All chunks live in Node.js process memory.
  3. *Single-turn only*: The server does not maintain conversational session state.

### Q13: What would you change for a production multi-user system?
* **Answer**:
  1. Add an ANN vector index (e.g., pgvector in PostgreSQL or ChromaDB).
  2. Add Redis for caching frequent query embeddings and responses.
  3. Implement rate-limiting middleware (`express-rate-limit`) to prevent API abuse.
  4. Add conversation session memory stored in a database.
  5. Add streaming responses (Server-Sent Events) so answers appear word-by-word.

---

## 11. Code-to-Concept Map

| Concept | Actual File | Function / Code Reference | Concrete Purpose |
|---|---|---|---|
| **Configuration** | `src/config.js` | `export const config` | Centralizes port, API key, model names, topK, and threshold. |
| **Document Chunking** | `src/rag/chunker.js` | `loadAndChunkMarkdown()` | Splits markdown files on `## ` into self-contained section objects. |
| **Vector Embedding** | `src/rag/gemini.js` | `embedText()` | Calls `@google/genai` `models.embedContent` to turn text into a 3,072-dim array. |
| **Text Generation** | `src/rag/gemini.js` | `generateAnswer()` | Calls `@google/genai` `models.generateContent` with a prompt. |
| **Offline Indexing** | `src/rag/indexer.js` | `runIndexer()` | Embeds all chunks and saves them to `data/embeddings.json`. |
| **Cosine Similarity** | `src/rag/retriever.js` | `cosineSimilarity()` | Calculates normalized dot product between two vector arrays. |
| **Top-K Retrieval** | `src/rag/retriever.js` | `retrieveRelevantChunks()` | Embeds query, scores chunks, sorts descending, and returns the top $K$ items. |
| **Prompt Grounding** | `src/rag/generator.js` | `buildGroundedPrompt()` | Formats context chunks into a prompt with anti-hallucination rules. |
| **Grounded Generation** | `src/rag/generator.js` | `generateGroundedAnswer()` | Calls Gemini with the grounded prompt and returns the generated answer. |
| **Threshold Guardrail** | `src/server.js` | `if (bestScore < config.similarityThreshold)` | Rejects irrelevant queries early and prevents unnecessary LLM calls. |
| **Source Mapping** | `src/server.js` | `sources = retrievedChunks.map(...)` | Returns document title, file, and score without exposing raw vectors. |
| **In-Memory Store** | `src/server.js` | `loadEmbeddingsIntoMemory()` | Reads `data/embeddings.json` into RAM on startup for sub-millisecond access. |
| **UI Integration** | `public/app.js` | `form.addEventListener('submit', ...)` | Sends user queries to `/api/chat` and renders the answer and source cards. |
| **System Health** | `src/server.js`, `public/app.js` | `GET /api/health`, `checkHealth()` | Confirms server availability and reports the count of indexed chunks in memory. |
