import { useState, useCallback, useEffect } from 'react';
import { fetchHealth } from '../services/userApi';
import { STATUS_KEYS } from '../constants';

/**
 * Custom hook managing backend health polling, indexed chunks count,
 * and connection error state.
 *
 * @param {string} [dependencyKey] - Value whose change triggers a health re-check (e.g. active role)
 * @returns {{ health: object, checkHealth: Function }}
 */
export function useHealth(dependencyKey) {
  const [health, setHealth] = useState({
    status: '',
    indexedChunks: 0,
    loading: true,
    error: null,
  });

  const checkHealth = useCallback(() => {
    fetchHealth()
      .then((data) => {
        setHealth({
          status: data.status,
          indexedChunks: data.indexedChunks,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        setHealth({
          status: STATUS_KEYS.ERROR,
          indexedChunks: 0,
          loading: false,
          error: err.message,
        });
      });
  }, []);

  useEffect(() => {
    checkHealth();
  }, [dependencyKey, checkHealth]);

  return { health, checkHealth };
}
