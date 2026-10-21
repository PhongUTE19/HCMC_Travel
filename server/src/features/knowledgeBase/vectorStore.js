import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../../config.js';
import { SERVER_MESSAGES } from '../../constants/index.js';

let qdrantClientInstance = null;

/**
 * Returns the singleton QdrantClient instance.
 * 
 * @returns {QdrantClient}
 */
export function getVectorStore() {
  if (!qdrantClientInstance) {
    if (!config.qdrantUrl) {
      throw new Error(SERVER_MESSAGES.ERRORS.QDRANT_URL_NOT_CONFIGURED);
    }
    qdrantClientInstance = new QdrantClient({
      url: config.qdrantUrl,
      apiKey: config.qdrantApiKey || undefined,
      checkCompatibility: false,
    });
  }
  return qdrantClientInstance;
}

/**
 * Ensures the Qdrant collection exists.
 * If reset is true, existing collection is deleted and recreated.
 * 
 * @param {{ reset?: boolean }} options
 * @returns {Promise<QdrantClient>}
 */
export async function initVectorStore({ reset = false } = {}) {
  const client = getVectorStore();
  const collectionName = config.qdrantCollection;

  try {
    const exists = await client.collectionExists(collectionName);

    if (reset && exists) {
      await client.deleteCollection(collectionName);
    }

    if (reset || !exists) {
      await client.createCollection(collectionName, {
        vectors: {
          size: config.vectorSize,
          distance: config.vectorDistance,
        },
      });
    }
  } catch (error) {
    console.error(`[VectorStore] Error initializing collection "${collectionName}":`, error.message);
    throw error;
  }

  return client;
}

/**
 * Returns the number of points stored in the Qdrant collection.
 * 
 * @returns {Promise<number>}
 */
export async function getVectorStoreCount() {
  try {
    const client = getVectorStore();
    const exists = await client.collectionExists(config.qdrantCollection);
    if (!exists) {
      return 0;
    }
    const result = await client.count(config.qdrantCollection, { exact: true });
    return result?.count || 0;
  } catch (error) {
    console.warn(`[VectorStore] Warning getting count for "${config.qdrantCollection}":`, error.message);
    return 0;
  }
}
