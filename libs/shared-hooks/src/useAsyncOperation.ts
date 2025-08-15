/**
 * Generic hook for managing async operations - works on web and mobile
 */

import { useState, useCallback } from 'react';

interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface AsyncOperationActions<T, P extends any[]> {
  execute: (...params: P) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

export const useAsyncOperation = <T, P extends any[]>(
  asyncFunction: (...params: P) => Promise<T>
): AsyncOperationState<T> & AsyncOperationActions<T, P> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...params: P): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFunction(...params);
      setData(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);
      console.error('Async operation failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData
  };
};