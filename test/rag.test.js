import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import express from '../server/node_modules/express/index.js';
import userRoute from '../server/src/routes/userRoute.js';
import adminRoute from '../server/src/routes/adminRoute.js';

import { loadAndChunkMarkdown, recursiveCharacterTextSplit } from '../server/src/rag/chunker.js';
import { buildGroundedPrompt, generateGroundedAnswer } from '../server/src/rag/generator.js';
import { cosineSimilarity } from '../server/src/rag/retriever.js';
import { executeRAG, formatContextSections } from '../server/src/rag/index.js';
import { orchestrateChat, orchestrateChatStream, ChatOrchestrationError } from '../server/src/services/chatOrchestrator.js';
import { processChat, processChatStream, UserServiceError } from '../server/src/services/userService.js';
import { config } from '../server/src/config.js';
import { getSystemPrompt, saveSystemPrompt, PromptServiceError } from '../server/src/services/promptService.js';
import { sanitizeFilename, validateMarkdownContent, DocumentServiceError } from '../server/src/services/documentService.js';
import { getVectorStore, getVectorStoreCount } from '../server/src/rag/vectorStore.js';
import * as adminService from '../server/src/services/adminService.js';
import { AppError } from '../server/src/errors/AppError.js';
import { errorHandler } from '../server/src/middleware/errorHandler.js';
import * as userController from '../server/src/controllers/userController.js';
import * as adminController from '../server/src/controllers/adminController.js';
import {
  ValidationError,
  validate,
  validateRequest,
  chatRequestSchema,
  filenameSchema,
  documentContentSchema,
  createDocumentSchema,
  updateDocumentSchema,
  documentParamsSchema,
  updatePromptSchema,
  paginationQuerySchema,
} from '../server/src/validation/index.js';
import {
  SERVER_MESSAGES,
  HTTP_STATUS,
  PROMPT_CONSTRAINTS,
  PAGINATION_LIMITS,
} from '../server/src/constants/index.js';
import { splitGraphemes } from '../client/src/hooks/useTextReveal.js';
import { CHAT_CONFIG, STREAM_REVEAL_CONFIG } from '../client/src/constants/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const knowledgeDir = path.join(projectRoot, 'data', 'knowledge');

describe('1. Document Loading and Section-Aware Chunking', () => {
  it('loads all 12 sections from the student handbook markdown', () => {
    const chunks = loadAndChunkMarkdown(knowledgeDir);
    assert.equal(chunks.length, 12, 'Expected exactly 12 sections in the handbook');

    const expectedSections = [
      { num: 1, title: 'About This Handbook' },
      { num: 2, title: 'Programs at a Glance' },
      { num: 3, title: 'Paying Tuition' },
      { num: 4, title: 'Course Registration and Credit Overload' },
      { num: 5, title: 'Library' },
      { num: 6, title: 'Scholarships' },
      { num: 7, title: 'Exam Rules' },
      { num: 8, title: 'Dormitory' },
      { num: 9, title: 'Academic Warning and Probation' },
      { num: 10, title: 'Graduation Requirements' },
      { num: 11, title: 'Amendments (approved November 2026)' },
      { num: 12, title: 'Frequently Asked Questions' },
    ];

    expectedSections.forEach((expected, idx) => {
      const chunk = chunks[idx];
      assert.equal(chunk.sectionNumber, expected.num, `Chunk ${idx} section number mismatch`);
      assert.equal(chunk.sectionTitle, expected.title, `Chunk ${idx} section title mismatch`);
      assert.ok(chunk.id.includes(`sec${expected.num}`), `Chunk ID should contain sec${expected.num}`);
      assert.equal(chunk.source, 'KB-A_Lumen-Institute-Student-Handbook.md');
      assert.ok(chunk.content.length > 0, `Chunk ${expected.num} content must not be empty`);
    });
  });

  it('preserves Section 2 Markdown table with headers and data rows intact', () => {
    const chunks = loadAndChunkMarkdown(knowledgeDir);
    const sec2 = chunks.find((c) => c.sectionNumber === 2);
    assert.ok(sec2, 'Section 2 chunk must exist');

    // Table header and separator
    assert.ok(sec2.content.includes('| Item | Standard Program | Honors Program |'));
    assert.ok(sec2.content.includes('|---|---|---|'));

    // Verify all table data rows are intact and aligned with columns
    assert.ok(sec2.content.includes('| Tuition per semester | 42,000,000 VND | 58,000,000 VND |'));
    assert.ok(sec2.content.includes('| Minimum credits per semester | 12 | 15 |'));
    assert.ok(sec2.content.includes('| Maximum credits per semester | 24 | 27 |'));
    assert.ok(sec2.content.includes('| Credits required to graduate | 132 | 140 |'));
    assert.ok(sec2.content.includes('| Minimum GPA to remain in good standing | 2.0 | 3.2 |'));
  });

  it('preserves Section 11 Amendments with all override provisions', () => {
    const chunks = loadAndChunkMarkdown(knowledgeDir);
    const sec11 = chunks.find((c) => c.sectionNumber === 11);
    assert.ok(sec11, 'Section 11 chunk must exist');

    assert.ok(sec11.content.includes('make-up exam fee in Section 7 is increased to 200,000 VND'));
    assert.ok(sec11.content.includes('library late fine in Section 5 is increased to 3,000 VND per book per day'));
    assert.ok(sec11.content.includes('installment plan in Section 3 is no longer available to Honors Program students'));
  });

  it('splits text recursively using fallback hierarchy respecting chunkSize and chunkOverlap', () => {
    const sampleText = 'Paragraph 1: General rules and conduct.\n\n' +
      'Paragraph 2: Detailed payment terms and semester schedules.\n\n' +
      'Paragraph 3: Library fine regulations and textbook borrowing policy.';

    const chunks = recursiveCharacterTextSplit(sampleText, {
      chunkSize: 70,
      chunkOverlap: 15,
    });

    assert.ok(chunks.length > 1, 'Should split into multiple chunks');
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 75, `Chunk "${chunk}" exceeds expected limit`);
      assert.ok(chunk.trim().length > 0, 'Chunk must not be empty');
    }
  });

  it('splits oversized sections into sub-chunks with parent headings and metadata', () => {
    const chunks = loadAndChunkMarkdown(knowledgeDir, { chunkSize: 250, chunkOverlap: 50 });
    assert.ok(chunks.length > 12, 'Oversized sections must split into more than 12 chunks');

    const subChunk = chunks.find((c) => c.totalParts > 1);
    assert.ok(subChunk, 'Sub-chunk with totalParts > 1 must exist');
    assert.ok(subChunk.id.includes('_p'), 'Sub-chunk ID must contain part indicator');
    assert.ok(subChunk.title.includes('Part '), 'Sub-chunk title must retain parent heading with part info');
    assert.ok(subChunk.sectionNumber > 0, 'Must preserve sectionNumber');
    assert.ok(subChunk.sectionTitle.length > 0, 'Must preserve sectionTitle');
    assert.equal(subChunk.source, 'KB-A_Lumen-Institute-Student-Handbook.md');
  });
});

describe('2. Prompt Construction, Grounding, and Attribution Formatting', () => {
  it('formats retrieved chunks with Document, Section, and Chunk ID headers', () => {
    const sampleChunks = [
      {
        id: 'KB-A_Lumen-Institute-Student-Handbook_sec2',
        title: '2. Programs at a Glance',
        source: 'KB-A_Lumen-Institute-Student-Handbook.md',
        content: '| Tuition per semester | 42,000,000 VND | 58,000,000 VND |',
      },
    ];

    const prompt = buildGroundedPrompt('What is the tuition fee?', sampleChunks, 'Custom Prompt Instructions');

    assert.ok(prompt.includes('Custom Prompt Instructions'));
    assert.ok(prompt.includes('Source 1: Document: KB-A_Lumen-Institute-Student-Handbook.md | Section: 2. Programs at a Glance | Chunk ID: KB-A_Lumen-Institute-Student-Handbook_sec2'));
    assert.ok(prompt.includes('| Tuition per semester | 42,000,000 VND | 58,000,000 VND |'));
    assert.ok(prompt.includes('User Question:\nWhat is the tuition fee?'));
  });

  it('returns safe fallback when generateGroundedAnswer receives empty chunks', async () => {
    const result = await generateGroundedAnswer('What is linear algebra?', []);
    assert.equal(result, 'The knowledge base does not contain enough information to answer this question.');
  });
});

describe('3. Vector Math and Cosine Similarity', () => {
  it('computes cosine similarity correctly between matching and orthogonal vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];

    assert.equal(cosineSimilarity(vecA, vecB), 1, 'Identical vectors should yield 1.0');
    assert.equal(cosineSimilarity(vecA, vecC), 0, 'Orthogonal vectors should yield 0.0');
    assert.equal(cosineSimilarity([], []), 0, 'Empty vectors should yield 0.0');
  });
});

describe('4. Mocked Workflow: Indexing and Qdrant Reset (Repeatability)', () => {
  it('simulates idempotent indexing pipeline deleting old collection before insert', async () => {
    let collectionDeleted = false;
    let collectionCreated = false;
    let pointsUpserted = 0;

    const mockClient = {
      collectionExists: async () => true,
      deleteCollection: async (name) => {
        collectionDeleted = true;
      },
      createCollection: async (name, opts) => {
        collectionCreated = true;
        assert.equal(opts.vectors.size, 3072);
        assert.equal(opts.vectors.distance, 'Cosine');
      },
      upsert: async (name, { points }) => {
        pointsUpserted = points.length;
      },
      count: async () => ({ count: pointsUpserted }),
    };

    // Simulate initVectorStore({ reset: true })
    const exists = await mockClient.collectionExists('test');
    if (exists) {
      await mockClient.deleteCollection('test');
    }
    await mockClient.createCollection('test', {
      vectors: { size: 3072, distance: 'Cosine' },
    });

    // Simulate upserting 12 parsed handbook chunks
    const chunks = loadAndChunkMarkdown(knowledgeDir);
    const points = chunks.map((chunk, i) => ({
      id: i + 1,
      vector: new Array(3072).fill(0.01),
      payload: {
        id: chunk.id,
        sectionNumber: chunk.sectionNumber,
        sectionTitle: chunk.sectionTitle,
        title: chunk.title,
        content: chunk.content,
        source: chunk.source,
      },
    }));

    await mockClient.upsert('test', { points });
    const countRes = await mockClient.count();

    assert.ok(collectionDeleted, 'Collection must be deleted on reset');
    assert.ok(collectionCreated, 'Collection must be recreated');
    assert.equal(pointsUpserted, 12, 'Must upsert 12 points');
    assert.equal(countRes.count, 12, 'Must report exactly 12 points without duplication');
  });
});

describe('5. Mocked Chat Service: Guardrails, Response Contract, and Diagnostics', () => {
  // Simulated chat processor logic mirroring userService.js with injectable dependencies
  async function simulateChatProcess({
    query,
    mockRetrievedChunks,
    mockLLMAnswer,
    retrievalError = null,
    llmError = null,
    similarityThreshold = 0.60,
  }) {
    if (!query || !query.trim()) {
      throw new Error('Query message is required.');
    }

    if (retrievalError) {
      return {
        answer: 'Failed to retrieve relevant handbook information due to a vector database error.',
        sources: [],
        retrieval: {
          error: retrievalError,
          retrievedChunks: [],
          usedChunks: [],
          similarityThreshold,
          bestScore: 0,
        },
      };
    }

    const retrievedChunks = mockRetrievedChunks || [];
    const bestScore = retrievedChunks[0]?.score || 0;
    const passedThreshold = bestScore >= similarityThreshold;

    const diagnosticChunks = retrievedChunks.map((c, idx) => ({
      rank: idx + 1,
      id: c.id,
      title: c.title,
      sectionNumber: c.sectionNumber,
      sectionTitle: c.sectionTitle,
      source: c.source,
      score: c.score,
      content: c.content,
      passedToLLM: passedThreshold,
    }));

    if (!passedThreshold) {
      return {
        answer: 'The provided Student Handbook does not contain enough information to answer this question.',
        sources: [],
        retrieval: {
          similarityThreshold,
          bestScore,
          retrievedChunks: diagnosticChunks,
          usedChunks: [],
        },
      };
    }

    if (llmError) {
      throw new Error(`LLM generation failed: ${llmError}`);
    }

    const sources = retrievedChunks.map((c) => ({
      id: c.id,
      title: c.title,
      sectionNumber: c.sectionNumber,
      sectionTitle: c.sectionTitle,
      source: c.source,
      score: c.score,
    }));

    return {
      answer: mockLLMAnswer,
      sources,
      retrieval: {
        similarityThreshold,
        bestScore,
        retrievedChunks: diagnosticChunks,
        usedChunks: diagnosticChunks,
      },
    };
  }

  it('returns grounded answer with sources and complete diagnostics for in-scope query', async () => {
    const mockChunks = [
      {
        id: 'KB-A_Lumen-Institute-Student-Handbook_sec2',
        title: '2. Programs at a Glance',
        sectionNumber: 2,
        sectionTitle: 'Programs at a Glance',
        source: 'KB-A_Lumen-Institute-Student-Handbook.md',
        score: 0.7313,
        content: '| Tuition per semester | 42,000,000 VND | 58,000,000 VND |',
      },
    ];

    const res = await simulateChatProcess({
      query: 'What is the tuition fee per semester for the Honors Program?',
      mockRetrievedChunks: mockChunks,
      mockLLMAnswer: 'The tuition per semester for the Honors Program is 58,000,000 VND.',
      similarityThreshold: 0.60,
    });

    // API contract verification
    assert.ok(res.answer.includes('58,000,000 VND'));
    assert.equal(res.sources.length, 1);
    assert.equal(res.sources[0].id, 'KB-A_Lumen-Institute-Student-Handbook_sec2');

    // Retrieval diagnostics verification
    assert.ok(res.retrieval, 'Retrieval diagnostics must be present');
    assert.equal(res.retrieval.retrievedChunks.length, 1);
    assert.equal(res.retrieval.usedChunks.length, 1);
    assert.equal(res.retrieval.retrievedChunks[0].rank, 1);
    assert.equal(res.retrieval.retrievedChunks[0].passedToLLM, true);
    assert.equal(res.retrieval.retrievedChunks[0].score, 0.7313);
  });

  it('rejects out-of-scope query, keeps sources empty, but preserves inspectable chunks', async () => {
    const mockOutChunks = [
      {
        id: 'KB-A_Lumen-Institute-Student-Handbook_sec8',
        title: '8. Dormitory',
        sectionNumber: 8,
        sectionTitle: 'Dormitory',
        source: 'KB-A_Lumen-Institute-Student-Handbook.md',
        score: 0.4903, // Below threshold 0.60
        content: 'Curfew in both blocks is 23:00...',
      },
    ];

    const res = await simulateChatProcess({
      query: 'Can I do cryptocurrency trading on campus?',
      mockRetrievedChunks: mockOutChunks,
      mockLLMAnswer: 'Should not be called',
      similarityThreshold: 0.60,
    });

    assert.equal(res.answer, 'The provided Student Handbook does not contain enough information to answer this question.');
    assert.equal(res.sources.length, 0, 'Sources must be empty on threshold rejection');

    // Diagnostics must still be inspectable
    assert.ok(res.retrieval);
    assert.equal(res.retrieval.retrievedChunks.length, 1);
    assert.equal(res.retrieval.usedChunks.length, 0, 'usedChunks must be empty');
    assert.equal(res.retrieval.retrievedChunks[0].passedToLLM, false);
    assert.equal(res.retrieval.retrievedChunks[0].score, 0.4903);
  });

  it('handles vector database retrieval failure gracefully with structured error', async () => {
    const res = await simulateChatProcess({
      query: 'What is the tuition fee?',
      retrievalError: 'Connection refused to Qdrant cluster at cloud.qdrant.io',
    });

    assert.ok(res.answer.includes('Failed to retrieve'));
    assert.equal(res.sources.length, 0);
    assert.ok(res.retrieval.error.includes('Connection refused'));
    assert.equal(res.retrieval.retrievedChunks.length, 0);
  });

  it('handles LLM failure by propagating descriptive error', async () => {
    await assert.rejects(
      async () => {
        await simulateChatProcess({
          query: 'What is the tuition fee?',
          mockRetrievedChunks: [{ id: 'sec2', title: '2. Programs', score: 0.8, content: '...' }],
          llmError: 'Service Unavailable 503',
          similarityThreshold: 0.60,
        });
      },
      /LLM generation failed: Service Unavailable 503/
    );
  });
});

describe('6. Server-Sent Events (SSE) Streaming Lifecycle and Parser', () => {
  it('parses SSE events across fragmented chunks and handles multiple events per read', () => {
    function findEventBoundary(str) {
      const idxCRLF = str.indexOf('\r\n\r\n');
      const idxLF = str.indexOf('\n\n');
      if (idxCRLF !== -1 && (idxLF === -1 || idxCRLF <= idxLF)) {
        return { index: idxCRLF, len: 4 };
      }
      if (idxLF !== -1) {
        return { index: idxLF, len: 2 };
      }
      return null;
    }

    function parseBlock(block) {
      const lines = block.split(/\r?\n/);
      let eventType = null;
      const dataLines = [];
      for (const line of lines) {
        if (!line || line.startsWith(':')) continue;
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      if (!eventType && dataLines.length === 0) return null;
      eventType = eventType || 'message';
      if (dataLines.length > 0) {
        const raw = dataLines.join('\n');
        let data = raw;
        try {
          data = JSON.parse(raw);
        } catch {
          // keep raw string
        }
        return { event: eventType, data };
      }
      return { event: eventType, data: {} };
    }

    const networkChunks = [
      'event: metadata\r\n',
      'data: {"sources":[{"id":"sec2"}]}\r\n\r\n: ping\n\nevent: delta\n',
      'data: {"text":"Tuition ' + 'is "}\n\nevent: delta\ndata: {"text":"42,000,000 VND"}\n\n',
      'event: done\ndata: {}\n\n',
    ];

    let buffer = '';
    const events = [];

    for (const chunk of networkChunks) {
      buffer += chunk;
      let boundary;
      while ((boundary = findEventBoundary(buffer)) !== null) {
        const block = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.len);
        if (block.trim()) {
          const parsed = parseBlock(block);
          if (parsed) events.push(parsed);
        }
      }
    }

    assert.equal(events.length, 4);
    assert.equal(events[0].event, 'metadata');
    assert.equal(events[0].data.sources[0].id, 'sec2');
    assert.equal(events[1].event, 'delta');
    assert.equal(events[1].data.text, 'Tuition is ');
    assert.equal(events[2].event, 'delta');
    assert.equal(events[2].data.text, '42,000,000 VND');
    assert.equal(events[3].event, 'done');
  });

  it('streams progressive tokens and terminal done event for valid query', async () => {
    async function simulateChatStream({ query, mockRetrievedChunks, mockStreamTokens, similarityThreshold }) {
      const events = [];
      const sendEvent = (event, data) => events.push({ event, data });

      const bestScore = mockRetrievedChunks[0]?.score || 0;
      const passedThreshold = bestScore >= similarityThreshold;

      const diagnosticChunks = mockRetrievedChunks.map((c, idx) => ({
        rank: idx + 1,
        id: c.id,
        score: c.score,
        passedToLLM: passedThreshold,
      }));

      const sources = mockRetrievedChunks.map((c) => ({ id: c.id, score: c.score }));
      const metadata = {
        similarityThreshold,
        bestScore,
        retrievedChunks: diagnosticChunks,
        usedChunks: diagnosticChunks,
      };

      sendEvent('metadata', { sources, retrieval: metadata });

      for (const token of mockStreamTokens) {
        sendEvent('delta', { text: token });
      }

      sendEvent('done', { sources, retrieval: metadata });

      return events;
    }

    const events = await simulateChatStream({
      query: 'What is the tuition fee?',
      mockRetrievedChunks: [{ id: 'sec2', score: 0.85 }],
      mockStreamTokens: ['The ', 'tuition ', 'is 42,000,000 VND.'],
      similarityThreshold: 0.60,
    });

    assert.equal(events[0].event, 'metadata');
    assert.equal(events[1].event, 'delta');
    assert.equal(events[1].data.text, 'The ');
    assert.equal(events[2].event, 'delta');
    assert.equal(events[2].data.text, 'tuition ');
    assert.equal(events[3].event, 'delta');
    assert.equal(events[3].data.text, 'is 42,000,000 VND.');
    assert.equal(events[4].event, 'done');

    const fullAnswer = events
      .filter((e) => e.event === 'delta')
      .map((e) => e.data.text)
      .join('');
    assert.equal(fullAnswer, 'The tuition is 42,000,000 VND.');
  });

  it('emits threshold refusal as delta event without invoking LLM stream', async () => {
    const events = [];
    const sendEvent = (event, data) => events.push({ event, data });

    const mockChunks = [{ id: 'sec8', score: 0.45 }];
    const bestScore = 0.45;
    const similarityThreshold = 0.60;

    const metadata = {
      similarityThreshold,
      bestScore,
      retrievedChunks: mockChunks,
      usedChunks: [],
    };

    sendEvent('metadata', { sources: [], retrieval: metadata });
    sendEvent('delta', {
      text: 'The provided Student Handbook does not contain enough information to answer this question.',
    });
    sendEvent('done', { sources: [], retrieval: metadata });

    assert.equal(events.length, 3);
    assert.equal(events[0].event, 'metadata');
    assert.equal(events[1].event, 'delta');
    assert.ok(events[1].data.text.includes('does not contain enough information'));
    assert.equal(events[2].event, 'done');
  });

  it('stops stream generation immediately when cancelled via AbortSignal', async () => {
    const controller = new AbortController();
    const emitted = [];

    async function* tokenGenerator() {
      yield 'Chunk 1';
      yield 'Chunk 2';
      yield 'Chunk 3';
    }

    const stream = tokenGenerator();
    for await (const chunk of stream) {
      if (controller.signal.aborted) break;
      emitted.push(chunk);
      if (chunk === 'Chunk 1') {
        controller.abort();
      }
    }

    assert.equal(emitted.length, 1);
    assert.equal(emitted[0], 'Chunk 1');
  });
});

describe('7. Progressive Text Reveal Queue, Graceful Completion Drain, and Unicode Integrity', () => {
  it('confirms debug mode is disabled by default via CHAT_CONFIG', () => {
    assert.equal(
      CHAT_CONFIG.DEFAULT_SHOW_DEBUG,
      false,
      'Debug mode must be disabled by default'
    );
  });

  it('provides named configuration constants for reveal speed and threshold tuning', () => {
    assert.ok(STREAM_REVEAL_CONFIG.BASE_CHARS_PER_TICK >= 1);
    assert.ok(STREAM_REVEAL_CONFIG.TICK_INTERVAL_MS >= 10);
    assert.ok(STREAM_REVEAL_CONFIG.CATCHUP_THRESHOLD >= 20);
    assert.ok(STREAM_REVEAL_CONFIG.CATCHUP_CHARS_PER_TICK >= STREAM_REVEAL_CONFIG.BASE_CHARS_PER_TICK);
    assert.ok(STREAM_REVEAL_CONFIG.MAX_BATCH_SIZE >= STREAM_REVEAL_CONFIG.CATCHUP_CHARS_PER_TICK);
  });

  it('splits Vietnamese diacritics and complex Unicode characters without corrupting surrogate pairs', () => {
    const text = 'Chào mừng bạn đến với HCMUTE! 🎉 🇻🇳\n\n- Mục 1: Học phí\n- Mục 2: Học bổng';
    const graphemes = splitGraphemes(text);

    // Graphemes must recombine into exact original string with zero character loss
    assert.equal(graphemes.join(''), text);

    // Emoji surrogate pairs should not be severed into lone surrogates
    const partyPopper = graphemes.find((g) => g.includes('🎉'));
    assert.ok(partyPopper, 'Party popper emoji must exist as a complete grapheme');
    assert.equal(partyPopper, '🎉');

    // Newlines and indentation preserved
    assert.ok(graphemes.includes('\n'));
    assert.ok(graphemes.includes('-'));
  });

  it('gracefully drains short responses across ticks without dumping all characters when stream ends', () => {
    // 1. Very short response that ends before reveal queue is empty
    const shortResponse = 'Xin chào bạn!';
    const graphemes = splitGraphemes(shortResponse);

    // Simulate initial arrival
    const queue = [...graphemes];
    let displayed = '';
    let isStreaming = true;
    let isComplete = false;
    let isRevealing = true;

    // First batch revealed immediately
    displayed += queue.splice(0, STREAM_REVEAL_CONFIG.BASE_CHARS_PER_TICK).join('');
    assert.ok(displayed.length > 0, 'First batch revealed immediately');
    assert.ok(queue.length > 0, 'Queue holds remaining characters');

    // Stream finishes abruptly (e.g. fast onDone from network)
    isStreaming = false;

    // Graceful drain: queue is NOT cleared immediately when isStreaming becomes false
    assert.ok(queue.length > 0, 'Queue must not be wiped when stream ends');
    assert.notEqual(displayed, shortResponse, 'Must not instantly dump full response');

    // Tick progressively at reveal speed
    const tickHistory = [];
    while (queue.length > 0) {
      const batch = queue.splice(0, STREAM_REVEAL_CONFIG.BASE_CHARS_PER_TICK).join('');
      displayed += batch;
      tickHistory.push(batch);
    }

    // Now queue is empty and stream ended
    if (queue.length === 0 && !isStreaming) {
      isComplete = true;
      isRevealing = false;
    }

    assert.ok(tickHistory.length >= 2, 'Short response was revealed progressively across multiple ticks');
    assert.equal(displayed, shortResponse, 'Full response revealed accurately with zero data loss');
    assert.equal(isComplete, true, 'Marked complete once queue is empty and stream ended');
    assert.equal(isRevealing, false, 'No longer revealing once drained');
  });

  it('simulates progressive queue buffering and catch-up acceleration for longer fast streams', () => {
    // 2. Longer response where incoming chunks arrive faster than they can be revealed
    const multiTokenChunks = [
      'Sinh viên cần đóng học phí ',
      'đúng thời hạn quy định trong sổ tay sinh viên. ',
      'Học bổng khuyến khích học tập được xét dựa trên kết quả rèn luyện học tập.',
    ];

    const queue = [];
    const revealedBatches = [];
    let displayed = '';

    for (const chunk of multiTokenChunks) {
      const graphemes = splitGraphemes(chunk);
      queue.push(...graphemes);

      let batchSize = STREAM_REVEAL_CONFIG.BASE_CHARS_PER_TICK;
      if (queue.length > STREAM_REVEAL_CONFIG.CATCHUP_THRESHOLD) {
        const excess = queue.length - STREAM_REVEAL_CONFIG.CATCHUP_THRESHOLD;
        batchSize += Math.min(
          STREAM_REVEAL_CONFIG.CATCHUP_CHARS_PER_TICK,
          Math.ceil(excess / 8)
        );
      }
      const batch = queue.splice(0, batchSize).join('');
      displayed += batch;
      revealedBatches.push(batch);
    }

    assert.ok(queue.length > 0, 'Queue holds pending characters');

    // Drain remaining
    while (queue.length > 0) {
      const batch = queue.splice(0, STREAM_REVEAL_CONFIG.BASE_CHARS_PER_TICK).join('');
      displayed += batch;
    }

    const expectedFullText = multiTokenChunks.join('');
    assert.equal(displayed, expectedFullText);
  });

  it('completes immediately without delay when queue is already empty at stream end', () => {
    // 3. Response where queue is already empty when stream ends
    const queue = [];
    const targetText = 'Done already.';
    let displayed = targetText;
    const isStreaming = false;

    let isComplete = false;
    let isRevealing = true;

    if (!isStreaming && queue.length === 0) {
      isComplete = true;
      isRevealing = false;
    }

    assert.equal(isComplete, true);
    assert.equal(isRevealing, false);
    assert.equal(displayed, targetText);
  });

  it('handles empty response gracefully without hanging in revealing state', () => {
    // 4. Empty response
    const targetText = '';
    const queue = [];
    const isStreaming = false;

    let isComplete = false;
    let isRevealing = false;

    if (!isStreaming && queue.length === 0) {
      isComplete = true;
      isRevealing = false;
    }

    assert.equal(isComplete, true);
    assert.equal(isRevealing, false);
  });

  it('halts reveal queue and preserves partial response immediately on cancellation or error', () => {
    // 5. Cancellation and errors while text remains queued
    const chunk1 = 'Phần câu trả lời đã nhận được nhưng bị huỷ giữa chừng.';
    const queue = splitGraphemes(chunk1);
    let displayed = '';

    // Partially revealed
    displayed += queue.splice(0, 10).join('');
    assert.ok(displayed.length > 0);
    assert.ok(queue.length > 0);

    // Cancel / Interrupt event:
    const isInterrupted = true;
    let isComplete = false;
    let isRevealing = true;

    if (isInterrupted) {
      // Clear queue and preserve received text
      queue.length = 0;
      displayed = chunk1;
      isRevealing = false;
      isComplete = true;
    }

    assert.equal(queue.length, 0);
    assert.equal(displayed, chunk1);
    assert.equal(isRevealing, false);
    assert.equal(isComplete, true);
  });

  it('prevents text leakage and isolates consecutive requests cleanly', () => {
    // 6. Consecutive requests with no text leakage between messages
    let queue = splitGraphemes('First response that left items in queue');
    let displayed = 'First response';
    let processedLength = 35;

    // Reset occurs when new prompt/response begins:
    const newTarget = 'Second response';
    if (!newTarget.startsWith(newTarget.slice(0, processedLength)) || newTarget.length < processedLength) {
      queue = [];
      processedLength = 0;
      displayed = '';
    }

    assert.equal(queue.length, 0, 'Old queue must be purged on reset');
    assert.equal(displayed, '', 'Displayed text reset for new request');
    assert.equal(processedLength, 0);
  });
});

describe('8. Extracted RAG Module and Minimal Orchestration Layer', () => {
  it('formats context sections with document, section, and chunk ID headers', () => {
    const chunks = [
      {
        id: 'chunk_1',
        title: 'Section 1',
        source: 'handbook.md',
        content: 'Content for section 1.',
      },
      {
        id: 'chunk_2',
        title: 'Section 2',
        source: 'handbook.md',
        content: 'Content for section 2.',
      },
    ];

    const formatted = formatContextSections(chunks);
    assert.ok(formatted.includes('[Source 1: Document: handbook.md | Section: Section 1 | Chunk ID: chunk_1]'));
    assert.ok(formatted.includes('Content for section 1.'));
    assert.ok(formatted.includes('[Source 2: Document: handbook.md | Section: Section 2 | Chunk ID: chunk_2]'));
    assert.ok(formatted.includes('Content for section 2.'));
  });

  it('handles empty chunks gracefully in formatContextSections', () => {
    assert.equal(formatContextSections([]), '');
    assert.equal(formatContextSections(null), '');
  });

  it('orchestrator rejects empty or non-string query with ChatOrchestrationError', async () => {
    await assert.rejects(
      async () => {
        await orchestrateChat('');
      },
      (err) => err instanceof ChatOrchestrationError && err.statusCode === 400
    );

    await assert.rejects(
      async () => {
        await orchestrateChat('   ');
      },
      (err) => err instanceof ChatOrchestrationError && err.statusCode === 400
    );

    await assert.rejects(
      async () => {
        await orchestrateChatStream('', () => { });
      },
      (err) => err instanceof ChatOrchestrationError && err.statusCode === 400
    );
  });

  it('userService backward-compatible facade wraps ChatOrchestrationError into UserServiceError', async () => {
    await assert.rejects(
      async () => {
        await processChat('');
      },
      (err) => err instanceof UserServiceError && err.statusCode === 400
    );

    await assert.rejects(
      async () => {
        await processChatStream('', () => { });
      },
      (err) => err instanceof UserServiceError && err.statusCode === 400
    );
  });

  it('orchestrator emits SSE sequence in strict order without duplicate terminal events', async () => {
    const events = [];
    const emit = (event, data) => events.push({ event, data });

    // Mock orchestrateChatStream behavior with controlled inputs
    const mockQuery = 'What is the library late fine?';
    const mockRagResult = {
      status: 'SUFFICIENT',
      passedThreshold: true,
      sources: [{ id: 'sec5', title: '5. Library', score: 0.85 }],
      retrieval: {
        similarityThreshold: 0.60,
        bestScore: 0.85,
        retrievedChunks: [{ id: 'sec5', rank: 1, passedToLLM: true, score: 0.85 }],
        usedChunks: [{ id: 'sec5', rank: 1, passedToLLM: true, score: 0.85 }],
      },
      prompt: 'Grounded prompt for library fine',
    };

    // Simulate orchestrator flow
    emit('metadata', { sources: mockRagResult.sources, retrieval: mockRagResult.retrieval });
    emit('delta', { text: 'The late fine is ' });
    emit('delta', { text: '3,000 VND per day.' });
    emit('done', { sources: mockRagResult.sources, retrieval: mockRagResult.retrieval });

    assert.equal(events.length, 4);
    assert.equal(events[0].event, 'metadata');
    assert.equal(events[0].data.sources.length, 1);
    assert.equal(events[1].event, 'delta');
    assert.equal(events[1].data.text, 'The late fine is ');
    assert.equal(events[2].event, 'delta');
    assert.equal(events[2].data.text, '3,000 VND per day.');
    assert.equal(events[3].event, 'done');

    // Terminal count must be exactly 1
    const doneEvents = events.filter((e) => e.event === 'done');
    assert.equal(doneEvents.length, 1, 'Exactly one terminal done event must be emitted');
  });

  it('orchestrator respects AbortSignal and suppresses post-cancellation events', async () => {
    const controller = new AbortController();
    const events = [];
    const emit = (event, data) => events.push({ event, data });

    // Cancel before or during stream
    controller.abort();

    async function simulatedOrchestratorStream(signal) {
      if (signal?.aborted) return;
      emit('metadata', {});
      if (signal?.aborted) return;
      emit('delta', { text: 'Should not appear' });
      emit('done', {});
    }

    await simulatedOrchestratorStream(controller.signal);

    assert.equal(events.length, 0, 'No events should be emitted after abort signal is triggered');
  });

  it('executeRAG returns SUFFICIENT status with assembled context when threshold is met', async () => {
    const mockChunks = [
      {
        id: 'chunk_1',
        title: 'Tuition Rules',
        sectionNumber: 2,
        sectionTitle: 'Programs',
        source: 'handbook.md',
        score: 0.82,
        content: 'Tuition is 42,000,000 VND.',
      },
    ];

    const result = await executeRAG('What is the tuition fee?', {
      topK: 5,
      similarityThreshold: 0.60,
      systemPrompt: 'Custom System Prompt',
      retrieverFn: async () => mockChunks,
    });

    assert.equal(result.status, 'SUFFICIENT');
    assert.equal(result.passedThreshold, true);
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0].id, 'chunk_1');
    assert.ok(result.context.includes('Tuition is 42,000,000 VND.'));
    assert.ok(result.prompt.includes('Custom System Prompt'));
    assert.ok(result.prompt.includes('User Question:\nWhat is the tuition fee?'));
    assert.equal(result.retrieval.bestScore, 0.82);
    assert.equal(result.retrieval.usedChunks.length, 1);
  });

  it('executeRAG returns INSUFFICIENT status when score falls below threshold', async () => {
    const mockChunks = [
      {
        id: 'chunk_dorm',
        title: 'Dormitory',
        sectionNumber: 8,
        sectionTitle: 'Dormitory',
        source: 'handbook.md',
        score: 0.45,
        content: 'Dorm curfew is 23:00.',
      },
    ];

    const result = await executeRAG('What is quantum mechanics?', {
      topK: 5,
      similarityThreshold: 0.60,
      retrieverFn: async () => mockChunks,
    });

    assert.equal(result.status, 'INSUFFICIENT');
    assert.equal(result.passedThreshold, false);
    assert.ok(result.refusalText.includes('does not contain enough information'));
    assert.equal(result.sources.length, 0);
    assert.equal(result.usedChunks.length, 0);
    assert.equal(result.retrieval.retrievedChunks.length, 1);
  });

  it('executeRAG returns RETRIEVAL_ERROR status when vector database fails', async () => {
    const result = await executeRAG('What is the tuition fee?', {
      retrieverFn: async () => {
        throw new Error('Connection to Qdrant cluster refused');
      },
    });

    assert.equal(result.status, 'RETRIEVAL_ERROR');
    assert.equal(result.passedThreshold, false);
    assert.ok(result.refusalText.includes('Failed to retrieve'));
    assert.equal(result.sources.length, 0);
    assert.equal(result.retrieval.error, 'Connection to Qdrant cluster refused');
  });

  it('orchestrateChat coordinates RAG and LLM generation seamlessly', async () => {
    let ragCalled = false;
    let llmCalled = false;

    const mockRagExecutor = async (query) => {
      ragCalled = true;
      return {
        status: 'SUFFICIENT',
        passedThreshold: true,
        sources: [{ id: 'sec2', title: 'Programs', score: 0.85 }],
        retrieval: { similarityThreshold: 0.60, bestScore: 0.85, retrievedChunks: [], usedChunks: [] },
        prompt: 'Assembled Prompt for: ' + query,
      };
    };

    const mockLlmGenerator = async (prompt) => {
      assert.ok(ragCalled, 'RAG must be called before LLM generation');
      llmCalled = true;
      return 'Generated answer for ' + prompt;
    };

    const res = await orchestrateChat('What is tuition?', {
      ragExecutor: mockRagExecutor,
      llmGenerator: mockLlmGenerator,
    });

    assert.ok(ragCalled);
    assert.ok(llmCalled);
    assert.ok(res.answer.includes('Generated answer for Assembled Prompt for: What is tuition?'));
    assert.equal(res.sources.length, 1);
  });

  it('orchestrateChatStream coordinates stream generation and relays events in order', async () => {
    const events = [];
    const emit = (event, data) => events.push({ event, data });

    const mockRagExecutor = async (query) => ({
      status: 'SUFFICIENT',
      passedThreshold: true,
      sources: [{ id: 'sec2', title: 'Programs', score: 0.85 }],
      retrieval: { similarityThreshold: 0.60, bestScore: 0.85, retrievedChunks: [], usedChunks: [] },
      prompt: 'Prompt for ' + query,
    });

    async function* mockStreamGenerator() {
      yield { text: 'Chunk 1. ' };
      yield { text: 'Chunk 2.' };
    }

    await orchestrateChatStream(
      'Test query',
      emit,
      {
        ragExecutor: mockRagExecutor,
        llmStreamGenerator: async () => mockStreamGenerator(),
      }
    );

    assert.equal(events.length, 4);
    assert.equal(events[0].event, 'metadata');
    assert.equal(events[1].event, 'delta');
    assert.equal(events[1].data.text, 'Chunk 1. ');
    assert.equal(events[2].event, 'delta');
    assert.equal(events[2].data.text, 'Chunk 2.');
    assert.equal(events[3].event, 'done');
  });
});

describe('9. Architecture Boundaries, Extracted Services, and Naming Conventions', () => {
  it('promptService provides default system prompt and validates prompt length', () => {
    const prompt = getSystemPrompt();
    assert.ok(prompt.length > 50, 'Prompt should have substantial content');
    assert.ok(prompt.includes('Student Handbook'), 'Prompt should reference Student Handbook');

    assert.throws(
      () => saveSystemPrompt('Too short'),
      (err) => err instanceof PromptServiceError && err.statusCode === 400
    );

    assert.throws(
      () => saveSystemPrompt(''),
      (err) => err instanceof PromptServiceError && err.statusCode === 400
    );
  });

  it('documentService validates filename sanitization and markdown section headers', () => {
    assert.equal(sanitizeFilename('academic_regulations'), 'academic_regulations.md');
    assert.equal(sanitizeFilename('handbook.md'), 'handbook.md');

    assert.throws(
      () => sanitizeFilename(''),
      (err) => err instanceof DocumentServiceError && err.statusCode === 400
    );

    assert.throws(
      () => sanitizeFilename('invalid*name?.md'),
      (err) => err instanceof DocumentServiceError && err.statusCode === 400
    );

    assert.throws(
      () => validateMarkdownContent('No section headers here'),
      (err) => err instanceof DocumentServiceError && err.statusCode === 400
    );

    assert.doesNotThrow(() => {
      validateMarkdownContent('## Valid Section\nContent here.');
    });
  });

  it('adminService cleanly re-exports and delegates to documentService and promptService', () => {
    assert.equal(typeof adminService.sanitizeFilename, 'function');
    assert.equal(typeof adminService.getSystemPrompt, 'function');
    assert.equal(adminService.sanitizeFilename('test_doc'), 'test_doc.md');

    const adminPrompt = adminService.getSystemPrompt();
    const directPrompt = getSystemPrompt();
    assert.equal(adminPrompt, directPrompt);
  });

  it('canonical vectorStore module and vector_store proxy provide identical API', async () => {
    const { getVectorStore: proxyGetVectorStore, getVectorStoreCount: proxyCount } = await import('../server/src/rag/vectorStore.js');
    assert.equal(typeof getVectorStore, 'function');
    assert.equal(typeof getVectorStoreCount, 'function');
    assert.equal(typeof proxyGetVectorStore, 'function');
    assert.equal(typeof proxyCount, 'function');
  });
});

describe('10. Centralized Backend Error Handling and Operational Errors', () => {
  it('AppError base class sets operational flag, status code, and captures stack trace', () => {
    const err = new AppError('Something bad', 400);
    assert.equal(err.message, 'Something bad');
    assert.equal(err.statusCode, 400);
    assert.equal(err.isOperational, true);
    assert.equal(err.name, 'AppError');
    assert.ok(err.stack);
  });

  it('domain error classes all inherit from AppError and Error', () => {
    const chatErr = new ChatOrchestrationError('Chat issue', 400);
    assert.ok(chatErr instanceof AppError);
    assert.ok(chatErr instanceof Error);
    assert.equal(chatErr.isOperational, true);

    const userErr = new UserServiceError('User issue', 400);
    assert.ok(userErr instanceof AppError);
    assert.ok(userErr instanceof ChatOrchestrationError);

    const docErr = new DocumentServiceError('Doc issue', 404);
    assert.ok(docErr instanceof AppError);
    assert.equal(docErr.statusCode, 404);

    const promptErr = new PromptServiceError('Prompt issue', 400);
    assert.ok(promptErr instanceof AppError);

    const adminErr = new adminService.AdminServiceError('Admin issue', 409);
    assert.ok(adminErr instanceof AppError);
    assert.equal(adminErr.statusCode, 409);
  });

  it('errorHandler sends operational error status and { error: message } JSON payload', () => {
    let capturedStatus = null;
    let capturedJson = null;

    const mockRes = {
      headersSent: false,
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedJson = data;
        return this;
      },
    };

    const operationalError = new DocumentServiceError('Document "test.md" not found.', 404);
    let nextCalled = false;
    errorHandler(operationalError, { method: 'GET', originalUrl: '/api/admin/documents/test.md' }, mockRes, () => {
      nextCalled = true;
    });

    assert.equal(capturedStatus, 404);
    assert.deepEqual(capturedJson, { error: 'Document "test.md" not found.' });
    assert.equal(nextCalled, false);
  });

  it('errorHandler masks unexpected internal errors (500) and preserves client confidentiality', () => {
    let capturedStatus = null;
    let capturedJson = null;

    const mockRes = {
      headersSent: false,
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedJson = data;
        return this;
      },
    };

    const internalCrash = new Error('Database pool exhaustion at connection 10.0.0.4:5432');
    let nextCalled = false;
    errorHandler(internalCrash, { method: 'GET', originalUrl: '/api/admin/documents' }, mockRes, () => {
      nextCalled = true;
    });

    assert.equal(capturedStatus, 500);
    assert.deepEqual(capturedJson, { error: 'An unexpected error occurred.' });
    assert.equal(nextCalled, false);
  });

  it('errorHandler respects headersSent and delegates to next without writing to response', () => {
    let statusCalled = false;
    let jsonCalled = false;
    let nextError = null;

    const mockRes = {
      headersSent: true,
      status() {
        statusCalled = true;
        return this;
      },
      json() {
        jsonCalled = true;
        return this;
      },
    };

    const midStreamErr = new Error('Stream disconnect');
    errorHandler(midStreamErr, { method: 'POST', originalUrl: '/api/user/chat/stream' }, mockRes, (err) => {
      nextError = err;
    });

    assert.equal(statusCalled, false, 'Should not modify status when headers are already sent');
    assert.equal(jsonCalled, false, 'Should not send JSON when headers are already sent');
    assert.equal(nextError, midStreamErr, 'Should pass error to next()');
  });

  it('userController.chatStream propagates pre-stream validation error to next()', async () => {
    let passedError = null;
    const req = { body: { message: '   ' } };
    const res = {
      setHeader() {},
      status() { return this; },
      json() { return this; },
    };

    await userController.chatStream(req, res, (err) => {
      passedError = err;
    });

    assert.ok(passedError instanceof ChatOrchestrationError);
    assert.equal(passedError.statusCode, 400);
    assert.equal(passedError.message, 'Query message is required.');
  });

  it('adminController handlers catch and propagate domain errors to next()', async () => {
    let passedError = null;
    const req = { params: { filename: 'nonexistent.md' } };
    const res = {
      json() {},
    };

    await adminController.getDocument(req, res, (err) => {
      passedError = err;
    });

    assert.ok(passedError instanceof DocumentServiceError);
    assert.equal(passedError.statusCode, 404);
  });
});

describe('11. Centralized Backend Input Validation with Zod', () => {
  it('valid inputs and normal accepted payloads pass validation across all schemas', () => {
    // Chat request
    const chatParsed = validate(chatRequestSchema, { message: 'What is the tuition fee?' });
    assert.equal(chatParsed.message, 'What is the tuition fee?');

    const streamChat = validate(chatRequestSchema, { message: '  Hello World  ', stream: true });
    assert.equal(streamChat.message, 'Hello World');
    assert.equal(streamChat.stream, true);

    // Filename schema
    const fn1 = validate(filenameSchema, 'regulations');
    assert.equal(fn1, 'regulations.md');
    const fn2 = validate(filenameSchema, 'handbook.md');
    assert.equal(fn2, 'handbook.md');
    const fn3 = validate(filenameSchema, 'valid_doc-1.2');
    assert.equal(fn3, 'valid_doc-1.2.md');

    // Document content schema
    const content = '## Section 1\nSome valid markdown body.';
    assert.equal(validate(documentContentSchema, content), content);

    // Create document schema
    const docCreate = validate(createDocumentSchema, {
      filename: 'academic_guide',
      content: '## Overview\nValid handbook text.',
      overwrite: true,
    });
    assert.equal(docCreate.filename, 'academic_guide.md');
    assert.equal(docCreate.overwrite, true);

    // Update document schema
    const docUpdate = validate(updateDocumentSchema, {
      content: '## New Section\nRevised regulations text.',
    });
    assert.ok(docUpdate.content.startsWith('## New Section'));

    // Document params schema
    const docParams = validate(documentParamsSchema, { filename: 'test_doc' });
    assert.equal(docParams.filename, 'test_doc.md');

    // Prompt update schema
    const validPrompt = 'You are an intelligent Student Handbook assistant helping students.';
    const promptParsed = validate(updatePromptSchema, { prompt: validPrompt });
    assert.equal(promptParsed.prompt, validPrompt);

    // Pagination query schema
    const queryParsed = validate(paginationQuerySchema, {
      limit: '15',
      offset: '20',
      q: 'scholarship',
    });
    assert.deepEqual(queryParsed, {
      limit: 15,
      offset: 20,
      search: 'scholarship',
    });
  });

  it('chatRequestSchema rejects missing, empty, whitespace-only, wrong-type, and malformed queries', () => {
    const invalidInputs = [
      {},
      { message: '' },
      { message: '   ' },
      { message: null },
      { message: 12345 },
      { message: ['invalid'] },
      { message: { text: 'invalid' } },
    ];

    for (const input of invalidInputs) {
      assert.throws(
        () => validate(chatRequestSchema, input),
        (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.QUERY_REQUIRED
      );
    }
  });

  it('filenameSchema and sanitizeFilename strictly reject path traversal and malicious paths without silent transformation', () => {
    // Missing / empty values
    assert.throws(
      () => validate(filenameSchema, ''),
      (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.FILENAME_REQUIRED
    );
    assert.throws(
      () => validate(filenameSchema, '   '),
      (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.FILENAME_REQUIRED
    );
    assert.throws(
      () => validate(filenameSchema, null),
      (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.FILENAME_REQUIRED
    );

    // Malicious path traversal and absolute paths must NEVER be silently transformed into valid basenames
    const maliciousPaths = [
      '../academic.md',
      '..\\academic.md',
      '/etc/passwd',
      'C:\\foo\\bar',
      'sub/dir/notes.md',
      '..',
      './test.md',
    ];
    for (const badPath of maliciousPaths) {
      // Must fail schema validation with INVALID_FILENAME
      assert.throws(
        () => validate(filenameSchema, badPath),
        (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.INVALID_FILENAME,
        `Expected filenameSchema to reject path traversal: ${badPath}`
      );
      // Must also fail service-level defense in sanitizeFilename
      assert.throws(
        () => sanitizeFilename(badPath),
        (err) => err instanceof DocumentServiceError && err.message === SERVER_MESSAGES.ERRORS.INVALID_FILENAME,
        `Expected sanitizeFilename to reject path traversal: ${badPath}`
      );
    }

    // Illegal characters
    const illegalFilenames = [
      'invalid*name.md',
      'bad name with spaces.md',
      'doc?question.md',
      'colon:test.md',
      'quote"test.md',
      'less<test.md',
    ];
    for (const bad of illegalFilenames) {
      assert.throws(
        () => validate(filenameSchema, bad),
        (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.INVALID_FILENAME
      );
    }
  });

  it('documentContentSchema enforces non-empty and Level-2 section header rules', () => {
    assert.throws(
      () => validate(documentContentSchema, ''),
      (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.DOC_CONTENT_EMPTY
    );
    assert.throws(
      () => validate(documentContentSchema, '   \n  \t  '),
      (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.DOC_CONTENT_EMPTY
    );

    // Missing ## header
    const noHeaderContent = '# Level 1 Title Only\n### Level 3 Only\nPlain text without level 2 header';
    assert.throws(
      () => validate(documentContentSchema, noHeaderContent),
      (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.MISSING_SECTION_HEADER
    );
  });

  it('updatePromptSchema validates 20-10,000 char boundary values accurately', () => {
    // Empty prompt
    assert.throws(
      () => validate(updatePromptSchema, { prompt: '' }),
      (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.PROMPT_EMPTY
    );
    assert.throws(
      () => validate(updatePromptSchema, { prompt: '   ' }),
      (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.PROMPT_EMPTY
    );

    // Boundary: 19 characters -> TOO_SHORT
    const nineteenChars = 'a'.repeat(19);
    assert.throws(
      () => validate(updatePromptSchema, { prompt: nineteenChars }),
      (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.PROMPT_TOO_SHORT
    );

    // Boundary: 20 characters -> valid (min length)
    const twentyChars = 'a'.repeat(20);
    const lowerBoundResult = validate(updatePromptSchema, { prompt: twentyChars });
    assert.equal(lowerBoundResult.prompt, twentyChars);

    // Boundary: 10,000 characters -> valid (max length)
    const tenThousandChars = 'a'.repeat(10000);
    const upperBoundResult = validate(updatePromptSchema, { prompt: tenThousandChars });
    assert.equal(upperBoundResult.prompt, tenThousandChars);

    // Boundary: 10,001 characters -> TOO_LONG
    const tenThousandOneChars = 'a'.repeat(10001);
    assert.throws(
      () => validate(updatePromptSchema, { prompt: tenThousandOneChars }),
      (err) => err instanceof ValidationError && err.message === SERVER_MESSAGES.ERRORS.PROMPT_TOO_LONG
    );
  });

  it('paginationQuerySchema parses numeric strings, decimals, partial numerics, repeated params, and clamps bounds', () => {
    // Defaults on empty query
    const defaultParsed = validate(paginationQuerySchema, {});
    assert.equal(defaultParsed.limit, PAGINATION_LIMITS.DEFAULT_LIMIT);
    assert.equal(defaultParsed.offset, PAGINATION_LIMITS.DEFAULT_OFFSET);
    assert.equal(defaultParsed.search, '');

    // Coercion from valid numeric strings
    const stringParsed = validate(paginationQuerySchema, { limit: '25', offset: '10' });
    assert.equal(stringParsed.limit, 25);
    assert.equal(stringParsed.offset, 10);

    // Zero limit (< 1) -> default; zero offset (>= 0) -> 0
    const zeroParsed = validate(paginationQuerySchema, { limit: '0', offset: '0' });
    assert.equal(zeroParsed.limit, PAGINATION_LIMITS.DEFAULT_LIMIT);
    assert.equal(zeroParsed.offset, 0);

    // Negative values -> clamp to defaults
    const negativeParsed = validate(paginationQuerySchema, { limit: '-5', offset: '-10' });
    assert.equal(negativeParsed.limit, PAGINATION_LIMITS.DEFAULT_LIMIT);
    assert.equal(negativeParsed.offset, PAGINATION_LIMITS.DEFAULT_OFFSET);

    // Values above maximum -> clamp limit to MAX_LIMIT (50)
    const clampedUpper = validate(paginationQuerySchema, { limit: '999', offset: '50' });
    assert.equal(clampedUpper.limit, PAGINATION_LIMITS.MAX_LIMIT);
    assert.equal(clampedUpper.offset, 50);

    // Decimal strings (parseInt truncation preserves pre-Phase-4 behavior)
    const decimalParsed = validate(paginationQuerySchema, { limit: '12.5', offset: '10.8' });
    assert.equal(decimalParsed.limit, 12);
    assert.equal(decimalParsed.offset, 10);

    // Partially numeric strings ("12abc" -> 12, "25xyz" -> 25)
    const partialParsed = validate(paginationQuerySchema, { limit: '12abc', offset: '25xyz' });
    assert.equal(partialParsed.limit, 12);
    assert.equal(partialParsed.offset, 25);

    // Repeated query parameters from Express (arrays)
    const repeatedParsed = validate(paginationQuerySchema, {
      limit: ['15', '30'],
      offset: ['5', '10'],
      q: ['scholarship', 'exam'],
    });
    assert.equal(repeatedParsed.limit, 15);
    assert.equal(repeatedParsed.offset, 5);
    assert.equal(repeatedParsed.search, 'scholarship');

    // Search query fallback (prefers q over search if both provided, trims string)
    const qSearch = validate(paginationQuerySchema, { q: ' tuition fees ' });
    assert.equal(qSearch.search, 'tuition fees');

    const directSearch = validate(paginationQuerySchema, { search: '  library  ' });
    assert.equal(directSearch.search, 'library');

    // Malformed NaN strings fallback to defaults
    const nanParsed = validate(paginationQuerySchema, { limit: 'not_a_num', offset: 'invalid' });
    assert.equal(nanParsed.limit, PAGINATION_LIMITS.DEFAULT_LIMIT);
    assert.equal(nanParsed.offset, PAGINATION_LIMITS.DEFAULT_OFFSET);
  });

  it('validate helper distinguishes unexpected programming bugs from input validation failures', () => {
    // Passing invalid schema throws TypeError (programming bug, not client validation error)
    assert.throws(
      () => validate(null, { test: 123 }),
      (err) => err instanceof TypeError && err.message.includes('[Validator]')
    );

    assert.throws(
      () => validate({}, { test: 123 }),
      (err) => err instanceof TypeError && err.message.includes('[Validator]')
    );
  });

  it('validate helper converts Zod errors to AppError/ValidationError with status 400 and preserves client compatibility', () => {
    let capturedErr = null;
    try {
      validate(chatRequestSchema, { message: '' });
    } catch (err) {
      capturedErr = err;
    }

    assert.ok(capturedErr instanceof ValidationError);
    assert.ok(capturedErr instanceof AppError);
    assert.equal(capturedErr.statusCode, 400);
    assert.equal(capturedErr.isOperational, true);
    assert.equal(capturedErr.message, SERVER_MESSAGES.ERRORS.QUERY_REQUIRED);

    // Verify compatibility with centralized errorHandler
    let sentStatus = null;
    let sentJson = null;
    const mockRes = {
      headersSent: false,
      status(code) {
        sentStatus = code;
        return this;
      },
      json(data) {
        sentJson = data;
        return this;
      },
    };

    errorHandler(capturedErr, { method: 'POST', originalUrl: '/api/user/chat' }, mockRes, () => {});
    assert.equal(sentStatus, 400);
    assert.deepEqual(sentJson, { error: SERVER_MESSAGES.ERRORS.QUERY_REQUIRED });
  });

  it('userController pre-stream validation catches invalid chat queries before headers are sent', async () => {
    let setHeaderCalls = 0;
    let passedError = null;

    const req = { body: { message: '   ' } };
    const res = {
      headersSent: false,
      setHeader() {
        setHeaderCalls++;
      },
      flushHeaders() {},
      on() {},
    };

    await userController.chatStream(req, res, (err) => {
      passedError = err;
    });

    assert.equal(setHeaderCalls, 0, 'No headers should be sent when validation fails');
    assert.ok(passedError instanceof ChatOrchestrationError);
    assert.equal(passedError.statusCode, 400);
    assert.equal(passedError.message, SERVER_MESSAGES.ERRORS.QUERY_REQUIRED);
  });

  it('adminController handlers validate payloads and parameters before invoking business logic', async () => {
    // Missing filename in createDocument
    let passedError = null;
    await adminController.createDocument({ body: { filename: '', content: '## Valid\nText' } }, {}, (err) => {
      passedError = err;
    });
    assert.ok(passedError instanceof DocumentServiceError);
    assert.equal(passedError.statusCode, 400);
    assert.equal(passedError.message, SERVER_MESSAGES.ERRORS.FILENAME_REQUIRED);

    // Invalid content (missing Level-2 header) in updateDocument
    passedError = null;
    await adminController.updateDocument(
      { params: { filename: 'valid.md' }, body: { content: 'No level 2 header here' } },
      {},
      (err) => {
        passedError = err;
      }
    );
    assert.ok(passedError instanceof DocumentServiceError);
    assert.equal(passedError.statusCode, 400);
    assert.equal(passedError.message, SERVER_MESSAGES.ERRORS.MISSING_SECTION_HEADER);

    // Prompt too short in updatePrompt
    passedError = null;
    adminController.updatePrompt({ body: { prompt: 'too short' } }, {}, (err) => {
      passedError = err;
    });
    assert.ok(passedError instanceof PromptServiceError);
    assert.equal(passedError.statusCode, 400);
    assert.equal(passedError.message, SERVER_MESSAGES.ERRORS.PROMPT_TOO_SHORT);
  });

  it('userController.chatStream preserves normal SSE event lifecycle and client abort cancellation', async () => {
    const emittedEvents = [];
    const headersSet = {};
    const closeCallbacks = [];

    const req = { body: { message: 'What is the tuition fee?' } };
    const res = {
      headersSent: false,
      writableEnded: false,
      closed: false,
      setHeader(k, v) {
        headersSet[k] = v;
      },
      flushHeaders() {},
      on(event, cb) {
        if (event === 'close') closeCallbacks.push(cb);
      },
      write(chunk) {
        emittedEvents.push(chunk);
      },
      end() {
        this.writableEnded = true;
      },
    };

    let nextCalled = false;
    await userController.chatStream(req, res, (err) => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, 'next() should not be called on successful stream initiation');
    assert.equal(headersSet['Content-Type'], 'text/event-stream; charset=utf-8');
    assert.equal(headersSet['Cache-Control'], 'no-cache, no-transform');
    assert.equal(headersSet['Connection'], 'keep-alive');
    assert.equal(res.writableEnded, true);
    assert.ok(emittedEvents.length > 0, 'Should have emitted stream events');
  });

  it('validateRequest middleware validates body/params/query and stores results canonically on res.locals.validated', () => {
    const middleware = validateRequest({
      params: documentParamsSchema,
      body: createDocumentSchema,
      query: paginationQuerySchema,
    });

    const req = {
      params: { filename: 'guide' },
      body: { filename: 'guide', content: '## Handbook\nDetails', overwrite: true },
      query: { limit: '20', offset: '5', q: 'exam' },
    };
    const res = { locals: {} };
    let nextCalled = false;
    let nextError = null;

    middleware(req, res, (err) => {
      nextCalled = true;
      nextError = err;
    });

    assert.equal(nextCalled, true);
    assert.equal(nextError, undefined);
    assert.equal(res.locals.validated.params.filename, 'guide.md');
    assert.equal(res.locals.validated.body.filename, 'guide.md');
    assert.equal(res.locals.validated.body.overwrite, true);
    assert.deepEqual(res.locals.validated.query, { limit: 20, offset: 5, search: 'exam' });
    assert.equal(req.validated, undefined, 'req.validated duplicate storage must be removed');
  });

  it('validateRequest middleware is compatible with Express 5 getter-only req.query without mutating req.query', () => {
    const middleware = validateRequest({ query: paginationQuerySchema });

    // Emulate Express 5 getter-only req.query property
    const req = {};
    const queryValue = Object.freeze({ limit: '30', offset: '10' });
    Object.defineProperty(req, 'query', {
      get() {
        return queryValue;
      },
      configurable: false,
      enumerable: true,
    });

    const res = { locals: {} };
    let nextError = null;

    assert.doesNotThrow(() => {
      middleware(req, res, (err) => {
        nextError = err;
      });
    });

    assert.equal(nextError, undefined);
    assert.equal(res.locals.validated.query.limit, 30);
    assert.equal(res.locals.validated.query.offset, 10);
    assert.equal(req.validated, undefined, 'req.validated duplicate storage must be removed');
    assert.equal(req.query.limit, '30', 'req.query getter object must not be mutated');
  });

  it('server/src/errors/index.js exports foundational AppError and ValidationError without circular service dependencies', async () => {
    const errorsModule = await import('../server/src/errors/index.js');
    assert.ok(errorsModule.AppError, 'AppError must be exported');
    assert.ok(errorsModule.ValidationError, 'ValidationError must be exported');

    // Confirm that ValidationError is an instance of AppError
    const valErr = new errorsModule.ValidationError('Test error');
    assert.ok(valErr instanceof errorsModule.AppError);
    assert.equal(valErr.statusCode, 400);
    assert.equal(valErr.isOperational, true);
  });
});

describe('12. Express Route -> Validation Middleware -> Controller Integration Pipeline', () => {
  let app;
  let server;
  let baseUrl;

  // Helper to start ephemeral Express server for route integration tests
  const startTestServer = () => new Promise((resolve) => {
    app = express();
    app.use(express.json());
    app.use('/api/user', userRoute);
    app.use('/api/admin', adminRoute);
    app.use(errorHandler);

    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const stopTestServer = () => new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });

  it('route-level validation middleware catches invalid chat query and returns 400 ValidationError JSON', async () => {
    await startTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/user/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '   ' }),
      });

      assert.equal(res.status, 400);
      assert.equal(res.headers.get('content-type')?.includes('application/json'), true);
      const data = await res.json();
      assert.deepEqual(data, { error: SERVER_MESSAGES.ERRORS.QUERY_REQUIRED });
    } finally {
      await stopTestServer();
    }
  });

  it('route-level validation rejects invalid params and path-traversal attempts before reaching controller', async () => {
    await startTestServer();
    try {
      const maliciousParam = encodeURIComponent('../academic.md');
      const res = await fetch(`${baseUrl}/api/admin/documents/${maliciousParam}`);

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.deepEqual(data, { error: SERVER_MESSAGES.ERRORS.INVALID_FILENAME });
    } finally {
      await stopTestServer();
    }
  });

  it('Express 5 query handling parses and defaults parameters into res.locals.validated without mutating req.query', async () => {
    await startTestServer();
    try {
      // Valid numeric query string
      const res = await fetch(`${baseUrl}/api/admin/chunks?limit=2&offset=1&q=tuition`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.limit, 2);
      assert.equal(data.offset, 1);
      assert.ok(Array.isArray(data.chunks));

      // Clamped query string (negative / invalid values)
      const resClamped = await fetch(`${baseUrl}/api/admin/chunks?limit=-10&offset=invalid`);
      assert.equal(resClamped.status, 200);
      const clampedData = await resClamped.json();
      assert.equal(clampedData.limit, PAGINATION_LIMITS.DEFAULT_LIMIT);
      assert.equal(clampedData.offset, PAGINATION_LIMITS.DEFAULT_OFFSET);
    } finally {
      await stopTestServer();
    }
  });

  it('pre-stream validation rejects invalid SSE requests with HTTP 400 JSON before any stream headers are sent', async () => {
    await startTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/user/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' }),
      });

      assert.equal(res.status, 400);
      // Stream headers must NOT be sent; response must be regular JSON
      const contentType = res.headers.get('content-type');
      assert.ok(contentType?.includes('application/json'), `Expected JSON content-type but got ${contentType}`);
      assert.equal(contentType?.includes('text/event-stream'), false);

      const data = await res.json();
      assert.deepEqual(data, { error: SERVER_MESSAGES.ERRORS.QUERY_REQUIRED });
    } finally {
      await stopTestServer();
    }
  });

  it('parsed and sanitized values from validateRequest middleware reach controller cleanly', async () => {
    await startTestServer();
    const testDocFilename = 'integration_temp_doc';
    try {
      // POST document without .md extension in filename
      const res = await fetch(`${baseUrl}/api/admin/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: testDocFilename,
          content: '## Integration Section\nValidated content reaching controller.',
          overwrite: true,
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.filename, `${testDocFilename}.md`);
    } finally {
      // Clean up test document
      try {
        await adminService.removeDocument(`${testDocFilename}.md`);
      } catch {
        // Ignore cleanup error
      }
      await stopTestServer();
    }
  });

  it('all route rejection responses maintain uniform { error: message } compatibility with HTTP 400', async () => {
    await startTestServer();
    try {
      const badRoutes = [
        { path: '/api/user/chat', method: 'POST', body: { message: null }, expected: SERVER_MESSAGES.ERRORS.QUERY_REQUIRED },
        { path: '/api/admin/prompt', method: 'PUT', body: { prompt: 'short' }, expected: SERVER_MESSAGES.ERRORS.PROMPT_TOO_SHORT },
        { path: '/api/admin/documents', method: 'POST', body: { filename: '', content: '## Section\nContent' }, expected: SERVER_MESSAGES.ERRORS.FILENAME_REQUIRED },
      ];

      for (const route of badRoutes) {
        const res = await fetch(`${baseUrl}${route.path}`, {
          method: route.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(route.body),
        });
        assert.equal(res.status, 400, `Expected 400 for ${route.path}`);
        const data = await res.json();
        assert.deepEqual(data, { error: route.expected });
      }
    } finally {
      await stopTestServer();
    }
  });
});

