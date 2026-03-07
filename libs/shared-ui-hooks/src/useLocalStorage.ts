/**
 * Local storage hook - with platform adapter pattern
 */

import { useState, useCallback } from 'react';

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

export interface UseLocalStorageOptions<T> {
  storage?: StorageAdapter;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

const defaultSerialize = <T>(value: T): string => JSON.stringify(value);
const defaultDeserialize = <T>(value: string): T => JSON.parse(value) as T;

type LocalStorageArg<T> = StorageAdapter | UseLocalStorageOptions<T> | undefined;

const resolveOptions = <T>(arg: LocalStorageArg<T>): {
  storage: StorageAdapter;
  serialize: (value: T) => string;
  deserialize: (value: string) => T;
} => {
  if (!arg) {
    return {
      storage: defaultWebStorage,
      serialize: defaultSerialize,
      deserialize: defaultDeserialize,
    };
  }

  if ('getItem' in arg) {
    return {
      storage: arg,
      serialize: defaultSerialize,
      deserialize: defaultDeserialize,
    };
  }

  return {
    storage: arg.storage ?? defaultWebStorage,
    serialize: arg.serialize ?? defaultSerialize,
    deserialize: arg.deserialize ?? defaultDeserialize,
  };
};

export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  options?: StorageAdapter | UseLocalStorageOptions<T>
): [T, (value: T | ((val: T) => T)) => void, () => void] => {
  const { storage, serialize, deserialize } = resolveOptions(options);

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = storage.getItem(key);
      if (item && typeof item === 'string') {
        return deserialize(item);
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
      storage.setItem(key, serialize(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, serialize, storage, storedValue]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      storage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, storage]);

  return [storedValue, setValue, removeValue];
};
