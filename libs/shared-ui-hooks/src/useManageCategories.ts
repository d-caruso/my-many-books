import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Category,
  ENTITY_MANAGE_ERROR_CODES,
  EntityManageOperationError,
  EntityManageOperationResult,
} from '@my-many-books/shared-types';
import { trim, validateCategoryName } from '@my-many-books/shared-validation';
import { mapCategoryManageApiError } from '@my-many-books/shared-utils';

export interface ManageCategoriesApi<TCategory extends Category = Category> {
  getCategories: () => Promise<TCategory[]>;
  createCategory: (data: { name: string }) => Promise<TCategory>;
  updateCategory: (id: number, data: Partial<{ name: string }>) => Promise<TCategory>;
  deleteCategory: (id: number) => Promise<void>;
}

export interface ManageCategoriesOptions<TCategory extends Category = Category> {
  autoLoad?: boolean;
  sortComparator?: (a: TCategory, b: TCategory) => number;
}

export interface ManageCategoriesState<TCategory extends Category = Category> {
  categories: TCategory[];
  loading: boolean;
  mutating: boolean;
  error: EntityManageOperationError | null;
}

export interface ManageCategoriesActions<TCategory extends Category = Category> {
  loadCategories: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  clearError: () => void;
  createCategory: (data: { name: string }) => Promise<EntityManageOperationResult<TCategory>>;
  updateCategory: (
    id: number,
    data: Partial<{ name: string }>
  ) => Promise<EntityManageOperationResult<TCategory>>;
  deleteCategory: (id: number) => Promise<EntityManageOperationResult<{ id: number }>>;
}

const defaultCategorySort = <TCategory extends Category>(a: TCategory, b: TCategory): number =>
  a.name.localeCompare(b.name);

const buildValidationError = (i18nKey: string, message?: string): EntityManageOperationError => ({
  code: ENTITY_MANAGE_ERROR_CODES.VALIDATION,
  i18nKey,
  message,
});

export const useManageCategories = <TCategory extends Category = Category>(
  api: ManageCategoriesApi<TCategory>,
  options: ManageCategoriesOptions<TCategory> = {}
): ManageCategoriesState<TCategory> & ManageCategoriesActions<TCategory> => {
  const { autoLoad = true, sortComparator: customComparator } = options;
  const sortComparator = useMemo(
    () => customComparator ?? defaultCategorySort<TCategory>,
    [customComparator]
  );
  const [categories, setCategories] = useState<TCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<EntityManageOperationError | null>(null);
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const loadCategories = useCallback(async (): Promise<void> => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCategories();
      setCategories([...data].sort(sortComparator));
      loadedRef.current = true;
    } catch (err) {
      setError(mapCategoryManageApiError(err, 'load'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [api, sortComparator]);

  const refreshCategories = useCallback(async (): Promise<void> => {
    await loadCategories();
  }, [loadCategories]);

  const createCategory = useCallback(
    async (data: { name: string }): Promise<EntityManageOperationResult<TCategory>> => {
      const normalizedName = trim(data.name);
      const validation = validateCategoryName(normalizedName);
      if (!validation.isValid) {
        const validationError = buildValidationError(
          validation.i18nKey ?? 'dialogs:category.create_failed',
          validation.error
        );
        setError(validationError);
        return { success: false, error: validationError };
      }

      setMutating(true);
      setError(null);
      try {
        const created = await api.createCategory({ name: normalizedName });
        setCategories((prev) => [...prev, created].sort(sortComparator));
        return { success: true, data: created };
      } catch (err) {
        const mapped = mapCategoryManageApiError(err, 'create');
        setError(mapped);
        return { success: false, error: mapped };
      } finally {
        setMutating(false);
      }
    },
    [api, sortComparator]
  );

  const updateCategory = useCallback(
    async (
      id: number,
      data: Partial<{ name: string }>
    ): Promise<EntityManageOperationResult<TCategory>> => {
      const normalized: Partial<{ name: string }> = {};
      if (data.name !== undefined) {
        normalized.name = trim(data.name);
        const validation = validateCategoryName(normalized.name);
        if (!validation.isValid) {
          const validationError = buildValidationError(
            validation.i18nKey ?? 'dialogs:category.update_failed',
            validation.error
          );
          setError(validationError);
          return { success: false, error: validationError };
        }
      }

      setMutating(true);
      setError(null);
      try {
        const updated = await api.updateCategory(id, normalized);
        setCategories((prev) =>
          prev.map((category) => (Number(category.id) === Number(id) ? updated : category)).sort(sortComparator)
        );
        return { success: true, data: updated };
      } catch (err) {
        const mapped = mapCategoryManageApiError(err, 'update');
        setError(mapped);
        return { success: false, error: mapped };
      } finally {
        setMutating(false);
      }
    },
    [api, sortComparator]
  );

  const deleteCategory = useCallback(
    async (id: number): Promise<EntityManageOperationResult<{ id: number }>> => {
      setMutating(true);
      setError(null);
      try {
        await api.deleteCategory(id);
        setCategories((prev) => prev.filter((category) => Number(category.id) !== Number(id)));
        return { success: true, data: { id } };
      } catch (err) {
        const mapped = mapCategoryManageApiError(err, 'delete');
        setError(mapped);
        return { success: false, error: mapped };
      } finally {
        setMutating(false);
      }
    },
    [api]
  );

  useEffect(() => {
    if (autoLoad && !loadedRef.current && !loadingRef.current) {
      void loadCategories();
    }
  }, [autoLoad, loadCategories]);

  return {
    categories,
    loading,
    mutating,
    error,
    loadCategories,
    refreshCategories,
    clearError,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
