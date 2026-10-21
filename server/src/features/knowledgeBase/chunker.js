import fs from 'fs';
import path from 'path';
import { SERVER_MESSAGES, CHUNKING_CONFIG } from '../../constants/index.js';

/**
 * Splits text into chunks using recursive character splitting.
 * Follows the fallback hierarchy: paragraph ('\n\n'), newline ('\n'), space (' '), and character ('').
 *
 * @param {string} text - Raw input text
 * @param {Object} [options]
 * @param {number} [options.chunkSize] - Maximum character size of each chunk
 * @param {number} [options.chunkOverlap] - Number of characters to overlap between consecutive chunks
 * @param {string[]} [options.separators] - Priority list of split separators
 * @returns {string[]} Array of chunk text strings
 */
export function recursiveCharacterTextSplit(
  text,
  {
    chunkSize = CHUNKING_CONFIG.DEFAULT_CHUNK_SIZE,
    chunkOverlap = CHUNKING_CONFIG.DEFAULT_CHUNK_OVERLAP,
    separators = CHUNKING_CONFIG.SEPARATORS,
  } = {}
) {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (chunkOverlap >= chunkSize) {
    throw new Error(`chunkOverlap (${chunkOverlap}) must be strictly less than chunkSize (${chunkSize}).`);
  }

  if (trimmed.length <= chunkSize) {
    return [trimmed];
  }

  return splitRecursively(trimmed, separators, chunkSize, chunkOverlap);
}

function splitRecursively(text, separators, chunkSize, chunkOverlap) {
  const finalChunks = [];
  let separator = separators[separators.length - 1];
  let newSeparators = [];

  // Identify highest priority separator present in the text
  for (let i = 0; i < separators.length; i++) {
    const s = separators[i];
    if (s === '' || text.includes(s)) {
      separator = s;
      newSeparators = separators.slice(i + 1);
      break;
    }
  }

  const splits = splitWithSeparator(text, separator);
  let goodSplits = [];

  for (const piece of splits) {
    if (piece.length < chunkSize) {
      goodSplits.push(piece);
    } else {
      if (goodSplits.length > 0) {
        const merged = mergeSplits(goodSplits, separator, chunkSize, chunkOverlap);
        finalChunks.push(...merged);
        goodSplits = [];
      }

      if (newSeparators.length === 0) {
        finalChunks.push(...hardSplit(piece, chunkSize, chunkOverlap));
      } else {
        const subChunks = splitRecursively(piece, newSeparators, chunkSize, chunkOverlap);
        finalChunks.push(...subChunks);
      }
    }
  }

  if (goodSplits.length > 0) {
    const merged = mergeSplits(goodSplits, separator, chunkSize, chunkOverlap);
    finalChunks.push(...merged);
  }

  return finalChunks;
}

function splitWithSeparator(text, separator) {
  if (!separator) {
    return text.split('');
  }
  const parts = text.split(separator);
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (i === parts.length - 1) {
      if (parts[i].length > 0) result.push(parts[i]);
    } else {
      result.push(parts[i] + separator);
    }
  }
  return result.length > 0 ? result : [text];
}

function mergeSplits(splits, separator, chunkSize, chunkOverlap) {
  const docs = [];
  let currentDoc = [];
  let totalLength = 0;

  for (const split of splits) {
    const pieceLen = split.length;

    if (totalLength + pieceLen > chunkSize) {
      if (currentDoc.length > 0) {
        const docText = currentDoc.join('').trim();
        if (docText) docs.push(docText);

        // Slide overlap window while ensuring next split fits within chunkSize
        while (
          (totalLength > chunkOverlap || totalLength + pieceLen > chunkSize) &&
          currentDoc.length > 0
        ) {
          const popped = currentDoc.shift();
          totalLength -= popped.length;
        }
      }
    }

    currentDoc.push(split);
    totalLength += pieceLen;
  }

  if (currentDoc.length > 0) {
    const remainingDoc = currentDoc.join('').trim();
    if (remainingDoc) docs.push(remainingDoc);
  }

  return docs;
}

function hardSplit(text, chunkSize, chunkOverlap) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start += (chunkSize - chunkOverlap);
  }
  return chunks.filter((c) => c.length > 0);
}

/**
 * Builds normalized chunk object with complete metadata and parent heading attribution.
 */
function createChunk({
  baseId,
  title,
  content,
  sectionNumber,
  sectionTitle,
  file,
  partIndex = 1,
  totalParts = 1,
}) {
  const id = totalParts > 1
    ? `${baseId}_sec${sectionNumber}_p${partIndex}`
    : `${baseId}_sec${sectionNumber}`;

  const displayTitle = totalParts > 1
    ? `${title} (Part ${partIndex}/${totalParts})`
    : title;

  return {
    id,
    sectionNumber,
    sectionTitle,
    title: displayTitle,
    content,
    source: file,
    partIndex,
    totalParts,
  };
}

/**
 * Parses markdown files in the specified directory into section-based chunks.
 * Sections that exceed configured chunk_size are recursively split with chunk_overlap
 * while maintaining parent headings and metadata.
 * 
 * @param {string} knowledgeDir - Path to knowledge markdown directory
 * @param {Object} [options]
 * @param {number} [options.chunkSize]
 * @param {number} [options.chunkOverlap]
 * @returns {Array<{id: string, title: string, content: string, source: string, sectionNumber: number, sectionTitle: string}>}
 */
export function loadAndChunkMarkdown(knowledgeDir, options = {}) {
  if (!fs.existsSync(knowledgeDir)) {
    throw new Error(SERVER_MESSAGES.ERRORS.KNOWLEDGE_DIR_NOT_FOUND(knowledgeDir));
  }

  const chunkSize = options.chunkSize || CHUNKING_CONFIG.DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap || CHUNKING_CONFIG.DEFAULT_CHUNK_OVERLAP;

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

    const sections = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentTitle && currentLines.length > 0) {
          sections.push({
            title: currentTitle,
            lines: [...currentLines],
            sectionIndex,
          });
          sectionIndex++;
        }
        currentTitle = line.replace('## ', '').trim();
        currentLines = [];
      } else if (currentTitle) {
        currentLines.push(line);
      }
    }

    // Capture the final section in the file
    if (currentTitle && currentLines.length > 0) {
      sections.push({
        title: currentTitle,
        lines: [...currentLines],
        sectionIndex,
      });
    }

    // Process each section through the recursive splitter if it exceeds chunkSize
    for (const sec of sections) {
      const sectionContent = sec.lines.join('\n').trim();
      if (!sectionContent) continue;

      const match = sec.title.match(/^(\d+)\.\s*(.*)$/);
      const sectionNumber = match ? parseInt(match[1], 10) : (sec.sectionIndex + 1);
      const sectionTitle = match ? match[2].trim() : sec.title;

      if (sectionContent.length <= chunkSize) {
        chunks.push(
          createChunk({
            baseId,
            title: sec.title,
            content: sectionContent,
            sectionNumber,
            sectionTitle,
            file,
          })
        );
      } else {
        const subChunks = recursiveCharacterTextSplit(sectionContent, {
          chunkSize,
          chunkOverlap,
        });

        subChunks.forEach((subText, idx) => {
          chunks.push(
            createChunk({
              baseId,
              title: sec.title,
              content: subText,
              sectionNumber,
              sectionTitle,
              file,
              partIndex: idx + 1,
              totalParts: subChunks.length,
            })
          );
        });
      }
    }
  }

  return chunks;
}
