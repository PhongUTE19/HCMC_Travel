import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { DEFAULT_SYSTEM_PROMPT } from '../config/promptConfig.js';
import { loadAndChunkMarkdown } from '../rag/chunker.js';
import { runIndexer } from '../rag/indexer.js';
import { getVectorStoreCount } from '../rag/vector_store.js';
import {
  SERVER_MESSAGES,
  HTTP_STATUS,
  PAGINATION_LIMITS,
  PROMPT_CONSTRAINTS,
} from '../constants/index.js';

let isIndexing = false;
let lastIndexedAt = null;

export class AdminServiceError extends Error {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Validates and sanitizes document filenames.
 */
export function sanitizeFilename(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    throw new AdminServiceError(SERVER_MESSAGES.ERRORS.FILENAME_REQUIRED, HTTP_STATUS.BAD_REQUEST);
  }
  let name = rawName.trim();
  if (!name.endsWith('.md')) {
    name = `${name}.md`;
  }
  const base = path.basename(name);
  if (!/^[a-zA-Z0-9_\-.]+\.md$/.test(base)) {
    throw new AdminServiceError(
      SERVER_MESSAGES.ERRORS.INVALID_FILENAME,
      HTTP_STATUS.BAD_REQUEST
    );
  }
  return base;
}

/**
 * Validates markdown content has at least one ## section header.
 */
function validateMarkdownContent(content) {
  if (content === undefined || content === null || typeof content !== 'string' || !content.trim()) {
    throw new AdminServiceError(SERVER_MESSAGES.ERRORS.DOC_CONTENT_EMPTY, HTTP_STATUS.BAD_REQUEST);
  }

  const hasHeader = content.split('\n').some((line) => line.startsWith('## '));
  if (!hasHeader) {
    throw new AdminServiceError(
      SERVER_MESSAGES.ERRORS.MISSING_SECTION_HEADER,
      HTTP_STATUS.BAD_REQUEST
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
    throw new AdminServiceError(SERVER_MESSAGES.ERRORS.DOC_NOT_FOUND(filename), HTTP_STATUS.NOT_FOUND);
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
      SERVER_MESSAGES.ERRORS.DOC_ALREADY_EXISTS(filename),
      HTTP_STATUS.CONFLICT
    );
  }

  fs.writeFileSync(filePath, content.trim(), 'utf-8');
  return {
    filename,
    message: SERVER_MESSAGES.SUCCESS.DOC_SAVED(filename),
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
    throw new AdminServiceError(SERVER_MESSAGES.ERRORS.DOC_DOES_NOT_EXIST(filename), HTTP_STATUS.NOT_FOUND);
  }

  fs.writeFileSync(filePath, content.trim(), 'utf-8');
  return {
    filename,
    message: SERVER_MESSAGES.SUCCESS.DOC_UPDATED(filename),
  };
}

/**
 * Deletes a document from the knowledge base directory.
 */
export async function removeDocument(rawFilename) {
  const filename = sanitizeFilename(rawFilename);
  const filePath = path.join(config.knowledgeDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new AdminServiceError(SERVER_MESSAGES.ERRORS.DOC_NOT_FOUND(filename), HTTP_STATUS.NOT_FOUND);
  }

  fs.unlinkSync(filePath);
  return {
    filename,
    message: SERVER_MESSAGES.SUCCESS.DOC_DELETED(filename),
  };
}

/**
 * Returns parsed chunks with pagination and keyword filtering.
 */
export async function getPaginatedChunks({
  limit = PAGINATION_LIMITS.DEFAULT_LIMIT,
  offset = PAGINATION_LIMITS.DEFAULT_OFFSET,
  search = '',
}) {
  const rawChunks = loadAndChunkMarkdown(config.knowledgeDir);

  let parsedLimit = parseInt(limit, 10);
  if (isNaN(parsedLimit) || parsedLimit < PAGINATION_LIMITS.MIN_LIMIT) {
    parsedLimit = PAGINATION_LIMITS.DEFAULT_LIMIT;
  } else if (parsedLimit > PAGINATION_LIMITS.MAX_LIMIT) {
    parsedLimit = PAGINATION_LIMITS.MAX_LIMIT;
  }

  let parsedOffset = parseInt(offset, 10);
  if (isNaN(parsedOffset) || parsedOffset < PAGINATION_LIMITS.DEFAULT_OFFSET) {
    parsedOffset = PAGINATION_LIMITS.DEFAULT_OFFSET;
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
    throw new AdminServiceError(SERVER_MESSAGES.ERRORS.INDEXING_IN_PROGRESS, HTTP_STATUS.CONFLICT);
  }

  isIndexing = true;
  try {
    console.log('[Admin] Re-indexing triggered from Admin interface...');
    const result = await runIndexer();
    lastIndexedAt = new Date().toISOString();
    return {
      message: SERVER_MESSAGES.SUCCESS.INDEXING_COMPLETED(result.indexedChunks),
      indexedChunks: result.indexedChunks,
    };
  } finally {
    isIndexing = false;
  }
}

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
    throw new AdminServiceError(SERVER_MESSAGES.ERRORS.PROMPT_EMPTY, HTTP_STATUS.BAD_REQUEST);
  }

  const trimmed = rawPrompt.trim();
  if (trimmed.length < PROMPT_CONSTRAINTS.MIN_LENGTH) {
    throw new AdminServiceError(SERVER_MESSAGES.ERRORS.PROMPT_TOO_SHORT, HTTP_STATUS.BAD_REQUEST);
  }
  if (trimmed.length > PROMPT_CONSTRAINTS.MAX_LENGTH) {
    throw new AdminServiceError(SERVER_MESSAGES.ERRORS.PROMPT_TOO_LONG, HTTP_STATUS.BAD_REQUEST);
  }

  const dir = path.dirname(config.promptFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(config.promptFile, trimmed, 'utf-8');
  return {
    prompt: trimmed,
    message: SERVER_MESSAGES.SUCCESS.PROMPT_UPDATED,
  };
}

/**
 * Resets the active system prompt file back to the default configuration template.
 * @returns {{ prompt: string, message: string }}
 */
export function resetSystemPrompt() {
  const dir = path.dirname(config.promptFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(config.promptFile, DEFAULT_SYSTEM_PROMPT, 'utf-8');
  return {
    prompt: DEFAULT_SYSTEM_PROMPT,
    message: SERVER_MESSAGES.SUCCESS.PROMPT_RESET,
  };
}
