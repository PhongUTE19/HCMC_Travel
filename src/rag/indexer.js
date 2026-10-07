import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { loadAndChunkMarkdown } from './chunker.js';
import { embedText } from './gemini.js';

/**
 * Indexes all markdown knowledge files by generating embeddings and writing to data/embeddings.json.
 */
export async function runIndexer() {
  console.log(`[Indexer] Reading knowledge documents from: ${config.knowledgeDir}`);
  const chunks = loadAndChunkMarkdown(config.knowledgeDir);
  console.log(`[Indexer] Found ${chunks.length} sections to index.`);

  if (chunks.length === 0) {
    console.warn('[Indexer] Warning: No chunks found to index.');
    return;
  }

  const indexedChunks = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[Indexer] (${i + 1}/${chunks.length}) Embedding: [${chunk.source}] ${chunk.title}`);
    const textToEmbed = `${chunk.title}\n${chunk.content}`;
    const embedding = await embedText(textToEmbed);

    indexedChunks.push({
      ...chunk,
      embedding,
    });
  }

  // Ensure output directory exists
  const outputDir = path.dirname(config.embeddingsFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(config.embeddingsFile, JSON.stringify(indexedChunks, null, 2), 'utf-8');
  console.log(`[Indexer] Successfully saved ${indexedChunks.length} indexed chunks to: ${config.embeddingsFile}`);
}

// Allow running directly via CLI (e.g., `npm run index` or `node src/rag/indexer.js`)
if (process.argv[1] && process.argv[1].endsWith('indexer.js')) {
  runIndexer().catch((err) => {
    console.error('[Indexer] Fatal error during indexing:', err.message);
    process.exit(1);
  });
}
