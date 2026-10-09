import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { loadAndChunkMarkdown } from '../rag/chunker.js';
import { runIndexer } from '../rag/indexer.js';
import { getVectorStoreCount } from '../rag/vector_store.js';

let isIndexing = false;
let lastIndexedAt = null;

export class AdminServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Validates and sanitizes document filenames.
 */
export function sanitizeFilename(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    throw new AdminServiceError('Filename is required.', 400);
  }
  let name = rawName.trim();
  if (!name.endsWith('.md')) {
    name = `${name}.md`;
  }
  const base = path.basename(name);
  if (!/^[a-zA-Z0-9_\-.]+\.md$/.test(base)) {
    throw new AdminServiceError(
      'Invalid filename. Only alphanumeric characters, hyphens, and underscores are allowed.',
      400
    );
  }
  return base;
}

/**
 * Validates markdown content has at least one ## section header.
 */
function validateMarkdownContent(content) {
  if (content === undefined || content === null || typeof content !== 'string' || !content.trim()) {
    throw new AdminServiceError('Document content cannot be empty.', 400);
  }

  const hasHeader = content.split('\n').some((line) => line.startsWith('## '));
  if (!hasHeader) {
    throw new AdminServiceError(
      'Document must contain at least one section starting with "## " (Level 2 header) to allow chunking.',
      400
    );
  }
}

/**
 * Computes current system status, file count, chunk count, and cloud sync status.
 */
export async function getAdminStatus() {
  const files = fs.existsSync(config.knowledgeDir)
    ? fs.readdirSync(config.knowledgeDir).filter((f) => f.endsWith('.md'))
    : [];

  let totalFileChunks = 0;
  try {
    const chunks = loadAndChunkMarkdown(config.knowledgeDir);
    totalFileChunks = chunks.length;
  } catch {
    totalFileChunks = 0;
  }

  const indexedChunks = await getVectorStoreCount();

  return {
    documentCount: files.length,
    totalFileChunks,
    indexedChunks,
    isIndexing,
    lastIndexedAt,
    isSynced: totalFileChunks === indexedChunks && totalFileChunks > 0,
  };
}

/**
 * Lists all markdown documents with size, section count, and modified timestamp.
 */
export async function listDocuments() {
  if (!fs.existsSync(config.knowledgeDir)) {
    return [];
  }

  const files = fs.readdirSync(config.knowledgeDir).filter((f) => f.endsWith('.md'));
  return files.map((file) => {
    const filePath = path.join(config.knowledgeDir, file);
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const sectionCount = content.split('\n').filter((l) => l.startsWith('## ')).length;

    return {
      filename: file,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      sectionCount,
    };
  });
}

/**
 * Reads the content of a single markdown document.
 */
export async function readDocument(rawFilename) {
  const filename = sanitizeFilename(rawFilename);
  const filePath = path.join(config.knowledgeDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new AdminServiceError(`Document "${filename}" not found.`, 404);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return { filename, content };
}

/**
 * Saves a new document or writes an uploaded file.
 */
export async function saveDocument({ filename: rawFilename, content, overwrite = false }) {
  const filename = sanitizeFilename(rawFilename);
  validateMarkdownContent(content);

  if (!fs.existsSync(config.knowledgeDir)) {
    fs.mkdirSync(config.knowledgeDir, { recursive: true });
  }

  const filePath = path.join(config.knowledgeDir, filename);
  if (fs.existsSync(filePath) && !overwrite) {
    throw new AdminServiceError(
      `Document "${filename}" already exists. Set overwrite to true or choose a different name.`,
      409
    );
  }

  fs.writeFileSync(filePath, content.trim(), 'utf-8');
  return {
    filename,
    message: `Document "${filename}" saved successfully.`,
  };
}

/**
 * Updates an existing document's content.
 */
export async function updateDocument(rawFilename, content) {
  const filename = sanitizeFilename(rawFilename);
  validateMarkdownContent(content);

  const filePath = path.join(config.knowledgeDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new AdminServiceError(`Document "${filename}" does not exist.`, 404);
  }

  fs.writeFileSync(filePath, content.trim(), 'utf-8');
  return {
    filename,
    message: `Document "${filename}" updated successfully.`,
  };
}

/**
 * Deletes a document from the knowledge base directory.
 */
export async function removeDocument(rawFilename) {
  const filename = sanitizeFilename(rawFilename);
  const filePath = path.join(config.knowledgeDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new AdminServiceError(`Document "${filename}" not found.`, 404);
  }

  fs.unlinkSync(filePath);
  return {
    filename,
    message: `Document "${filename}" deleted successfully.`,
  };
}

/**
 * Returns parsed chunks with pagination and keyword filtering.
 */
export async function getPaginatedChunks({ limit = 10, offset = 0, search = '' }) {
  const rawChunks = loadAndChunkMarkdown(config.knowledgeDir);

  let parsedLimit = parseInt(limit, 10);
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    parsedLimit = 10;
  } else if (parsedLimit > 50) {
    parsedLimit = 50;
  }

  let parsedOffset = parseInt(offset, 10);
  if (isNaN(parsedOffset) || parsedOffset < 0) {
    parsedOffset = 0;
  }

  const query = (search || '').trim().toLowerCase();
  let filteredChunks = rawChunks;
  if (query) {
    filteredChunks = rawChunks.filter((chunk) => {
      return (
        chunk.id.toLowerCase().includes(query) ||
        chunk.title.toLowerCase().includes(query) ||
        (chunk.sectionTitle && chunk.sectionTitle.toLowerCase().includes(query)) ||
        chunk.source.toLowerCase().includes(query) ||
        chunk.content.toLowerCase().includes(query)
      );
    });
  }

  const totalChunks = filteredChunks.length;
  const paginatedChunks = filteredChunks.slice(parsedOffset, parsedOffset + parsedLimit);
  const hasMore = parsedOffset + paginatedChunks.length < totalChunks;

  return {
    totalChunks,
    chunks: paginatedChunks,
    limit: parsedLimit,
    offset: parsedOffset,
    hasMore,
  };
}

/**
 * Executes re-indexing of knowledge chunks to Qdrant Cloud.
 */
export async function executeIndexing() {
  if (isIndexing) {
    throw new AdminServiceError('Indexing is already in progress. Please wait.', 409);
  }

  isIndexing = true;
  try {
    console.log('[Admin] Re-indexing triggered from Admin interface...');
    const result = await runIndexer();
    lastIndexedAt = new Date().toISOString();
    return {
      message: `Indexing completed successfully. Indexed ${result.indexedChunks} chunks.`,
      indexedChunks: result.indexedChunks,
    };
  } finally {
    isIndexing = false;
  }
}

export const DEFAULT_SYSTEM_PROMPT = `You are the Student Handbook Assistant.
Answer the user's question using ONLY the provided context below.

Strict rules:
1. Rely ONLY on the facts explicitly stated in the context.
2. Do NOT invent, assume, or extrapolate facts outside the context.
3. If the context does not contain enough information to answer the question, state: "The knowledge base does not contain enough information to answer this question."
4. Keep the answer concise, direct, and factual.
5. Whenever you state a fact, cite the corresponding source in brackets, e.g. [Source Title].`;

/**
 * Gets the current system prompt from persistent storage.
 * If file does not exist, seeds it with default and returns default.
 */
export function getSystemPrompt() {
  try {
    if (fs.existsSync(config.promptFile)) {
      const content = fs.readFileSync(config.promptFile, 'utf-8');
      if (content && content.trim()) {
        return content.trim();
      }
    }
    const dir = path.dirname(config.promptFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(config.promptFile, DEFAULT_SYSTEM_PROMPT, 'utf-8');
    return DEFAULT_SYSTEM_PROMPT;
  } catch (err) {
    console.warn('[Prompt] Failed to read prompt file, fallback to default:', err.message);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

/**
 * Validates and saves a new system prompt to persistent storage.
 */
export function saveSystemPrompt(rawPrompt) {
  if (rawPrompt === undefined || rawPrompt === null || typeof rawPrompt !== 'string' || !rawPrompt.trim()) {
    throw new AdminServiceError('System prompt cannot be empty.', 400);
  }

  const trimmed = rawPrompt.trim();
  if (trimmed.length < 20) {
    throw new AdminServiceError('System prompt must be at least 20 characters long.', 400);
  }
  if (trimmed.length > 10000) {
    throw new AdminServiceError('System prompt exceeds maximum length of 10,000 characters.', 400);
  }

  const dir = path.dirname(config.promptFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(config.promptFile, trimmed, 'utf-8');
  return {
    prompt: trimmed,
    message: 'System prompt updated successfully.',
  };
}
