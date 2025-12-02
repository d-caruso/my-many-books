import { useMemo } from 'react';
import { useCategories as useSharedCategories, CategoriesAPI } from '@my-many-books/shared-ui-hooks';
import { useApi } from '../contexts/ApiContext';

/**
 * Web wrapper that wires the shared Categories hook to the ApiContext client
 */
export const useCategories = () => {
  const { categoryAPI } = useApi();

  const api = useMemo<CategoriesAPI>(() => ({
    getCategories: () => categoryAPI.getCategories(),
    createCategory: data => categoryAPI.createCategory(data),
  }), [categoryAPI]);

  return useSharedCategories(api);
};
