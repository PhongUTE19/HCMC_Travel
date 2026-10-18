import { useState, useCallback } from 'react';
import { fetchChunks } from '../services/adminApi';
import { APP_MESSAGES, PAGINATION } from '../constants';

/**
 * Custom hook to manage chunk inspection, pagination, and text searching.
 *
 * @param {Object} options
 * @param {Function} [options.onError] - Callback to report error feedback
 */
export function useChunks({ onError } = {}) {
  const [chunks, setChunks] = useState([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [chunkLimit, setChunkLimit] = useState(PAGINATION.DEFAULT_LIMIT);
  const [chunkOffset, setChunkOffset] = useState(PAGINATION.DEFAULT_OFFSET);
  const [hasMore, setHasMore] = useState(false);
  const [chunkSearch, setChunkSearch] = useState('');
  const [chunksLoading, setChunksLoading] = useState(false);

  const loadChunksData = useCallback(
    async (limit = chunkLimit, offset = chunkOffset, search = chunkSearch) => {
      setChunksLoading(true);
      try {
        const chunksData = await fetchChunks({ limit, offset, search });
        setChunks(chunksData.chunks || []);
        setTotalChunks(chunksData.totalChunks || 0);
        setHasMore(Boolean(chunksData.hasMore));
        return chunksData;
      } catch (err) {
        if (onError) {
          onError(err.message || APP_MESSAGES.ERROR.LOAD_CHUNKS_FAILED);
        }
        throw err;
      } finally {
        setChunksLoading(false);
      }
    },
    [chunkLimit, chunkOffset, chunkSearch, onError]
  );

  const handleSearchChange = useCallback(
    (newQuery) => {
      setChunkSearch(newQuery);
      setChunkOffset(0);
      loadChunksData(chunkLimit, 0, newQuery);
    },
    [chunkLimit, loadChunksData]
  );

  const handleLimitChange = useCallback(
    (newLimit) => {
      setChunkLimit(newLimit);
      setChunkOffset(0);
      loadChunksData(newLimit, 0, chunkSearch);
    },
    [chunkSearch, loadChunksData]
  );

  const handlePrevPage = useCallback(() => {
    const nextOffset = Math.max(0, chunkOffset - chunkLimit);
    setChunkOffset(nextOffset);
    loadChunksData(chunkLimit, nextOffset, chunkSearch);
  }, [chunkLimit, chunkOffset, chunkSearch, loadChunksData]);

  const handleNextPage = useCallback(() => {
    const nextOffset = chunkOffset + chunkLimit;
    setChunkOffset(nextOffset);
    loadChunksData(chunkLimit, nextOffset, chunkSearch);
  }, [chunkLimit, chunkOffset, chunkSearch, loadChunksData]);

  const refreshChunks = useCallback(() => {
    return loadChunksData(chunkLimit, chunkOffset, chunkSearch);
  }, [loadChunksData, chunkLimit, chunkOffset, chunkSearch]);

  return {
    chunks,
    totalChunks,
    chunkLimit,
    chunkOffset,
    hasMore,
    chunkSearch,
    chunksLoading,
    loadChunksData,
    handleSearchChange,
    handleLimitChange,
    handlePrevPage,
    handleNextPage,
    refreshChunks,
  };
}
