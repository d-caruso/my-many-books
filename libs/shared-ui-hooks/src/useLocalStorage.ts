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

type ValueUpdater<T> = T | ((val: T) => T);

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

const handleAsyncStorageOp = (operation: Promise<void> | void): void => {
  void Promise.resolve(operation).catch(() => undefined);
};

const isUpdaterFunction = <T>(value: ValueUpdater<T>): value is (val: T) => T =>
  typeof value === 'function';

export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  options?: StorageAdapter | UseLocalStorageOptions<T>
): [T, (value: ValueUpdater<T>) => void, () => void] => {
  const { storage, serialize, deserialize } = resolveOptions(options);

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = storage.getItem(key);
      if (item && typeof item === 'string') {
        return deserialize(item);
      }
      return initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: ValueUpdater<T>): void => {
    setStoredValue((currentValue) => {
      const valueToStore = isUpdaterFunction(value) ? value(currentValue) : value;

      try {
        const serialized = serialize(valueToStore);
        handleAsyncStorageOp(storage.setItem(key, serialized));
      } catch {
        // Keep in-memory state even if persistence fails.
      }

      return valueToStore;
    });
  }, [key, serialize, storage]);

  const removeValue = useCallback((): void => {
    setStoredValue(initialValue);

    try {
      handleAsyncStorageOp(storage.removeItem(key));
    } catch {
      // Keep in-memory reset even if persistence fails.
    }
  }, [key, initialValue, storage]);

  return [storedValue, setValue, removeValue];
};
