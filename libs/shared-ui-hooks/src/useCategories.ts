/**
 * Shared categories hook - works on web and mobile
 */

import { useState, useEffect, useCallback } from 'react';
import { Category } from '@my-many-books/shared-types';

interface CategoriesState {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

interface CategoriesActions {
  loadCategories: () => Promise<void>;
  createCategory: (name: string) => Promise<Category | null>;
  refreshCategories: () => Promise<void>;
}

export interface CategoriesAPI {
  getCategories: () => Promise<Category[]>;
  createCategory: (data: { name: string }) => Promise<Category>;
}

export const useCategories = (api: CategoriesAPI, autoLoad = true): CategoriesState & CategoriesActions => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const categoriesData = await api.getCategories();
      setCategories(categoriesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createCategory = useCallback(async (name: string): Promise<Category | null> => {
    if (!name.trim()) {
      return null;
    }

    try {
      const newCategory = await api.createCategory({ name: name.trim() });
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return newCategory;
    } catch (err: any) {
      console.error('Failed to create category:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create category');
      return null;
    }
  }, [api]);

  const refreshCategories = useCallback(async (): Promise<void> => {
    await loadCategories();
  }, [loadCategories]);

  // Load categories on mount if autoLoad is enabled
  useEffect(() => {
    if (autoLoad) {
      loadCategories();
    }
  }, [loadCategories, autoLoad]);

  return {
    categories,
    loading,
    error,
    loadCategories,
    createCategory,
    refreshCategories
  };
};