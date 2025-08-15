/**
 * Local storage hook - with platform adapter pattern
 */

import { useState, useEffect, useCallback } from 'react';

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

// Default web implementation
const defaultWebStorage: StorageAdapter = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Handle quota exceeded or other errors
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Handle errors
    }
  }
};

export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  storageAdapter: StorageAdapter = defaultWebStorage
): [T, (value: T | ((val: T) => T)) => void, () => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = storageAdapter.getItem(key);
      if (item && typeof item === 'string') {
        return JSON.parse(item);
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storageAdapter.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, storageAdapter]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      storageAdapter.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, storageAdapter]);

  return [storedValue, setValue, removeValue];
};