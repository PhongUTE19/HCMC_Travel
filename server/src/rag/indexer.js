import { config } from '../config.js';
import { loadAndChunkMarkdown } from './chunker.js';
import { embedText } from './gemini.js';
import { initVectorStore } from './vector_store.js';

/**
 * Indexes all markdown knowledge files by generating embeddings and inserting them into Qdrant.
 */
export async function runIndexer() {
  console.log(`[Indexer] Reading knowledge documents from: ${config.knowledgeDir}`);
  const chunks = loadAndChunkMarkdown(config.knowledgeDir);
  console.log(`[Indexer] Found ${chunks.length} sections to index.`);

  if (chunks.length === 0) {
    console.warn('[Indexer] Warning: No chunks found to index.');
    return { indexedChunks: 0 };
  }

  // Initialize/reset Qdrant collection
  console.log(`[Indexer] Connecting to Qdrant at: ${config.qdrantUrl} (collection: "${config.qdrantCollection}")`);
  const client = await initVectorStore({ reset: true });

  const points = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[Indexer] (${i + 1}/${chunks.length}) Embedding & Indexing: [${chunk.source}] ${chunk.title}`);
    const textToEmbed = `${chunk.title}\n${chunk.content}`;
    const embedding = await embedText(textToEmbed);

    points.push({
      id: i + 1,
      vector: embedding,
      payload: {
        id: chunk.id,
        title: chunk.title,
        content: chunk.content,
        source: chunk.source,
      },
    });
  }

  console.log(`[Indexer] Upserting ${points.length} points into Qdrant collection "${config.qdrantCollection}"...`);
  await client.upsert(config.qdrantCollection, {
    wait: true,
    points,
  });

  const countResult = await client.count(config.qdrantCollection, { exact: true });
  console.log(`[Indexer] Successfully indexed ${countResult.count} chunks into Qdrant collection "${config.qdrantCollection}".`);
  return { indexedChunks: countResult.count };
}

// Allow running directly via CLI (e.g., `npm run index` or `node src/rag/indexer.js`)
if (process.argv[1] && process.argv[1].endsWith('indexer.js')) {
  runIndexer().catch((err) => {
    console.error('[Indexer] Fatal error during indexing:', err.message);
    process.exit(1);
  });
}
