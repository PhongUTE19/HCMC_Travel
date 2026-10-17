import fs from 'fs';
import path from 'path';
import { SERVER_MESSAGES } from '../constants/index.js';

/**
 * Helper to build a normalized section chunk from parsed lines.
 */
function createChunk(baseId, title, lines, sectionIndex, file) {
  if (!title || lines.length === 0) return null;
  const sectionContent = lines.join('\n').trim();
  if (!sectionContent) return null;

  const match = title.match(/^(\d+)\.\s*(.*)$/);
  const sectionNumber = match ? parseInt(match[1], 10) : (sectionIndex + 1);
  const sectionTitle = match ? match[2].trim() : title;

  return {
    id: `${baseId}_sec${sectionNumber}`,
    sectionNumber,
    sectionTitle,
    title,
    content: sectionContent,
    source: file,
  };
}

/**
 * Parses markdown files in the specified directory into section-based chunks.
 * Each section starting with '## ' becomes an independent chunk.
 * 
 * @param {string} knowledgeDir - Path to knowledge markdown directory
 * @returns {Array<{id: string, title: string, content: string, source: string}>}
 */
export function loadAndChunkMarkdown(knowledgeDir) {
  if (!fs.existsSync(knowledgeDir)) {
    throw new Error(SERVER_MESSAGES.ERRORS.KNOWLEDGE_DIR_NOT_FOUND(knowledgeDir));
  }

  const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith('.md'));
  const chunks = [];

  for (const file of files) {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const baseId = path.basename(file, '.md');

    // Split content by markdown level-2 header '## '
    const lines = content.split('\n');
    let currentTitle = '';
    let currentLines = [];
    let sectionIndex = 0;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        const chunk = createChunk(baseId, currentTitle, currentLines, sectionIndex, file);
        if (chunk) {
          chunks.push(chunk);
          sectionIndex++;
        }
        currentTitle = line.replace('## ', '').trim();
        currentLines = [];
      } else if (currentTitle) {
        currentLines.push(line);
      }
    }

    // Push the final section in the file
    const finalChunk = createChunk(baseId, currentTitle, currentLines, sectionIndex, file);
    if (finalChunk) {
      chunks.push(finalChunk);
    }
  }

  return chunks;
}
