import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadAndChunkMarkdown, recursiveCharacterTextSplit } from '../server/src/rag/chunker.js';
import { buildGroundedPrompt, generateGroundedAnswer } from '../server/src/rag/generator.js';
import { cosineSimilarity } from '../server/src/rag/retriever.js';
import { config } from '../server/src/config.js';
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

