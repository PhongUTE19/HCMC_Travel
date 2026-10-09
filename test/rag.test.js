import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadAndChunkMarkdown } from '../server/src/rag/chunker.js';
import { buildGroundedPrompt, generateGroundedAnswer } from '../server/src/rag/generator.js';
import { cosineSimilarity } from '../server/src/rag/retriever.js';
import { config } from '../server/src/config.js';

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
