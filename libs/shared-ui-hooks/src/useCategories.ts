/**
 * Shared categories hook - works on web and mobile
 */

import { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react';
import { Category } from '@my-many-books/shared-types';
import { extractErrorMessage } from '@my-many-books/shared-utils';

export interface CategoriesState<TCategory extends Category = Category> {
  categories: TCategory[];
  loading: boolean;
  sorting: boolean;
  error: string | null;
}

export interface CategoriesActions<TCategory extends Category = Category> {
  loadCategories: () => Promise<void>;
  createCategory: (name: string) => Promise<TCategory | null>;
  refreshCategories: () => Promise<void>;
}

export interface CategoriesAPI<TCategory extends Category = Category> {
  getCategories: () => Promise<TCategory[]>;
  createCategory: (data: { name: string }) => Promise<TCategory>;
}

export interface UseCategoriesOptions<TCategory extends Category = Category> {
  autoLoad?: boolean;
  sortComparator?: (a: TCategory, b: TCategory) => number;
}

export const useCategories = <TCategory extends Category = Category>(
  api: CategoriesAPI<TCategory>,
  options: UseCategoriesOptions<TCategory> = {}
): CategoriesState<TCategory> & CategoriesActions<TCategory> => {
  const { autoLoad = true, sortComparator: customComparator } = options;
  const sortComparator = useMemo(
    () => customComparator ?? ((a: TCategory, b: TCategory) => a.name.localeCompare(b.name)),
    [customComparator]
  );

  const [categories, setCategories] = useState<TCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, startSortingTransition] = useTransition();
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);
  const pendingReloadRef = useRef(false);

  const loadCategories = useCallback(async (): Promise<void> => {
    // If a load is already in progress, mark a pending reload instead of dropping the request.
    // This prevents a race condition where a category created during initial load is never shown.
    if (loadingRef.current) {
      pendingReloadRef.current = true;
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const categoriesData = await api.getCategories();
      startSortingTransition(() => {
        setCategories([...categoriesData].sort(sortComparator));
      });
      loadedRef.current = true;
    } catch (err: unknown) {
      setError(extractErrorMessage(err) || 'Failed to load categories');
    } finally {
      setLoading(false);
      loadingRef.current = false;
      if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        void loadCategories();
      }
    }
  }, [api, sortComparator]);

  const createCategory = useCallback(async (name: string): Promise<TCategory | null> => {
    if (!name.trim()) {
      return null;
    }

    try {
      const newCategory = await api.createCategory({ name: name.trim() });
      startSortingTransition(() => {
        setCategories((prev) => [...prev, newCategory].sort(sortComparator));
      });
      return newCategory;
    } catch (err: unknown) {
      setError(extractErrorMessage(err) || 'Failed to create category');
      return null;
    }
  }, [api, sortComparator]);

  useEffect(() => {
    if (!loadedRef.current) return;

    startSortingTransition(() => {
      setCategories((prev) => [...prev].sort(sortComparator));
    });
  }, [sortComparator]);

  const refreshCategories = useCallback(async (): Promise<void> => {
    await loadCategories();
  }, [loadCategories]);

  // Load categories on mount if autoLoad is enabled (only once)
  useEffect(() => {
    if (autoLoad && !loadedRef.current && !loadingRef.current) {
      void loadCategories();
    }
  }, [autoLoad, loadCategories]);

  return {
    categories,
    loading,
    sorting,
    error,
    loadCategories,
    createCategory,
    refreshCategories
  };
};
