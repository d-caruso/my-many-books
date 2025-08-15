import { useState, useEffect, useCallback } from 'react';
import { Category } from '../types';
import { categoryAPI } from '../services/api';

interface CategoriesState {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

interface CategoriesActions {
  loadCategories: () => Promise<void>;
  createCategory: (name: string) => Promise<Category | null>;
}

export const useCategories = (): CategoriesState & CategoriesActions => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const categoriesData = await categoryAPI.getCategories();
      setCategories(categoriesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      setError(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (name: string): Promise<Category | null> => {
    if (!name.trim()) {
      return null;
    }

    try {
      const newCategory = await categoryAPI.createCategory({ name: name.trim() });
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return newCategory;
    } catch (err: any) {
      console.error('Failed to create category:', err);
      setError(err.response?.data?.message || 'Failed to create category');
      return null;
    }
  }, []);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categories,
    loading,
    error,
    loadCategories,
    createCategory
  };
};