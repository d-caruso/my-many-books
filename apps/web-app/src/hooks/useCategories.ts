import { useMemo } from 'react';
import {
  useCategories as useSharedCategories,
  CategoriesAPI,
  UseCategoriesOptions,
} from '@my-many-books/shared-ui-hooks';
import { Category } from '@my-many-books/shared-types';
import { useApi } from '../contexts/ApiContext';

/**
 * Web wrapper that wires the shared Categories hook to the ApiContext client
 */
export const useCategories = (options?: UseCategoriesOptions<Category>) => {
  const { categoryAPI } = useApi();

  const api = useMemo<CategoriesAPI>(() => ({
    getCategories: () => categoryAPI.getCategories(),
    createCategory: data => categoryAPI.createCategory(data),
  }), [categoryAPI]);

  return useSharedCategories(api, options);
};
