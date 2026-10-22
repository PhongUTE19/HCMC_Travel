import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadAndChunkMarkdown, recursiveCharacterTextSplit } from '../../server/src/features/knowledgeBase/chunker.js';
import { buildGroundedPrompt, formatContextSections } from '../../server/src/features/knowledgeBase/promptBuilder.js';
import { executeRAG } from '../../server/src/features/knowledgeBase/ragService.js';
import { SERVER_MESSAGES } from '../../server/src/constants/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const knowledgeDir = path.join(projectRoot, 'data', 'knowledge');

describe('Knowledge Base Chunking and Prompt Construction Suite', () => {
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

    it('returns safe fallback when executeRAG receives empty chunks', async () => {
      const result = await executeRAG('What is linear algebra?', {
        retrieverFn: async () => [],
      });
      assert.equal(result.status, 'INSUFFICIENT');
      assert.equal(result.passedThreshold, false);
      assert.equal(result.refusalText, SERVER_MESSAGES.ERRORS.INSUFFICIENT_INFORMATION);
      assert.deepEqual(result.sources, []);
    });
  });
});
