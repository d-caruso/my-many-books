import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Author,
  ENTITY_MANAGE_ERROR_CODES,
  EntityManageOperationError,
  EntityManageOperationResult,
} from '@my-many-books/shared-types';
import {
  trim,
  validateAuthorName,
  validateAuthorSurname,
  validateNationality,
} from '@my-many-books/shared-validation';
import { mapAuthorManageApiError } from '@my-many-books/shared-utils';

export interface ManageAuthorsApi<TAuthor extends Author = Author> {
  getAuthors: () => Promise<TAuthor[]>;
  createAuthor: (data: { name: string; surname: string; nationality?: string }) => Promise<TAuthor>;
  updateAuthor: (
    id: number,
    data: Partial<{ name: string; surname: string; nationality?: string | null }>
  ) => Promise<TAuthor>;
  deleteAuthor: (id: number) => Promise<void>;
}

export interface ManageAuthorsOptions<TAuthor extends Author = Author> {
  autoLoad?: boolean;
  sortComparator?: (a: TAuthor, b: TAuthor) => number;
}

export interface ManageAuthorsState<TAuthor extends Author = Author> {
  authors: TAuthor[];
  loading: boolean;
  mutating: boolean;
  error: EntityManageOperationError | null;
}

export interface ManageAuthorsActions<TAuthor extends Author = Author> {
  loadAuthors: () => Promise<void>;
  refreshAuthors: () => Promise<void>;
  clearError: () => void;
  createAuthor: (
    data: { name: string; surname: string; nationality?: string | null }
  ) => Promise<EntityManageOperationResult<TAuthor>>;
  updateAuthor: (
    id: number,
    data: Partial<{ name: string; surname: string; nationality?: string | null }>
  ) => Promise<EntityManageOperationResult<TAuthor>>;
  deleteAuthor: (id: number) => Promise<EntityManageOperationResult<{ id: number }>>;
}

const defaultAuthorSort = <TAuthor extends Author>(a: TAuthor, b: TAuthor): number =>
  `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`);

const buildValidationError = (i18nKey: string, message?: string): EntityManageOperationError => ({
  code: ENTITY_MANAGE_ERROR_CODES.VALIDATION,
  i18nKey,
  message,
});

const normalizeCreateInput = (data: { name: string; surname: string; nationality?: string | null }) => ({
  name: trim(data.name),
  surname: trim(data.surname),
  nationality: data.nationality == null ? undefined : trim(data.nationality) || undefined,
});

const normalizeUpdateInput = (
  data: Partial<{ name: string; surname: string; nationality?: string | null }>
): Partial<{ name: string; surname: string; nationality?: string | null }> => {
  const normalized: Partial<{ name: string; surname: string; nationality?: string | null }> = {};
  if (data.name !== undefined) normalized.name = trim(data.name);
  if (data.surname !== undefined) normalized.surname = trim(data.surname);
  if (data.nationality !== undefined) normalized.nationality = trim(data.nationality ?? '') || null;
  return normalized;
};

export const useManageAuthors = <TAuthor extends Author = Author>(
  api: ManageAuthorsApi<TAuthor>,
  options: ManageAuthorsOptions<TAuthor> = {}
): ManageAuthorsState<TAuthor> & ManageAuthorsActions<TAuthor> => {
  const { autoLoad = true, sortComparator: customComparator } = options;
  const sortComparator = useMemo(
    () => customComparator ?? defaultAuthorSort<TAuthor>,
    [customComparator]
  );

  const [authors, setAuthors] = useState<TAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<EntityManageOperationError | null>(null);
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const loadAuthors = useCallback(async (): Promise<void> => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAuthors();
      setAuthors([...data].sort(sortComparator));
      loadedRef.current = true;
    } catch (err) {
      setError(mapAuthorManageApiError(err, 'load'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [api, sortComparator]);

  const refreshAuthors = useCallback(async (): Promise<void> => {
    await loadAuthors();
  }, [loadAuthors]);

  const createAuthor = useCallback(
    async (
      data: { name: string; surname: string; nationality?: string | null }
    ): Promise<EntityManageOperationResult<TAuthor>> => {
      const normalized = normalizeCreateInput(data);

      const nameValidation = validateAuthorName(normalized.name);
      if (!nameValidation.isValid) {
        const validationError = buildValidationError(nameValidation.i18nKey ?? 'dialogs:author.create_failed', nameValidation.error);
        setError(validationError);
        return { success: false, error: validationError };
      }
      const surnameValidation = validateAuthorSurname(normalized.surname);
      if (!surnameValidation.isValid) {
        const validationError = buildValidationError(
          surnameValidation.i18nKey ?? 'dialogs:author.create_failed',
          surnameValidation.error
        );
        setError(validationError);
        return { success: false, error: validationError };
      }
      const nationalityValidation = validateNationality(normalized.nationality);
      if (!nationalityValidation.isValid) {
        const validationError = buildValidationError(
          nationalityValidation.i18nKey ?? 'dialogs:author.create_failed',
          nationalityValidation.error
        );
        setError(validationError);
        return { success: false, error: validationError };
      }

      setMutating(true);
      setError(null);
      try {
        const created = await api.createAuthor(normalized);
        setAuthors((prev) => [...prev, created].sort(sortComparator));
        return { success: true, data: created };
      } catch (err) {
        const mapped = mapAuthorManageApiError(err, 'create');
        setError(mapped);
        return { success: false, error: mapped };
      } finally {
        setMutating(false);
      }
    },
    [api, sortComparator]
  );

  const updateAuthor = useCallback(
    async (
      id: number,
      data: Partial<{ name: string; surname: string; nationality?: string | null }>
    ): Promise<EntityManageOperationResult<TAuthor>> => {
      const normalized = normalizeUpdateInput(data);

      if (normalized.name !== undefined) {
        const result = validateAuthorName(normalized.name);
        if (!result.isValid) {
          const validationError = buildValidationError(result.i18nKey ?? 'dialogs:author.update_failed', result.error);
          setError(validationError);
          return { success: false, error: validationError };
        }
      }
      if (normalized.surname !== undefined) {
        const result = validateAuthorSurname(normalized.surname);
        if (!result.isValid) {
          const validationError = buildValidationError(result.i18nKey ?? 'dialogs:author.update_failed', result.error);
          setError(validationError);
          return { success: false, error: validationError };
        }
      }
      if (normalized.nationality !== undefined) {
        const result = validateNationality(normalized.nationality);
        if (!result.isValid) {
          const validationError = buildValidationError(result.i18nKey ?? 'dialogs:author.update_failed', result.error);
          setError(validationError);
          return { success: false, error: validationError };
        }
      }

      setMutating(true);
      setError(null);
      try {
        const updated = await api.updateAuthor(id, normalized);
        setAuthors((prev) =>
          prev.map((author) => (Number(author.id) === Number(id) ? updated : author)).sort(sortComparator)
        );
        return { success: true, data: updated };
      } catch (err) {
        const mapped = mapAuthorManageApiError(err, 'update');
        setError(mapped);
        return { success: false, error: mapped };
      } finally {
        setMutating(false);
      }
    },
    [api, sortComparator]
  );

  const deleteAuthor = useCallback(
    async (id: number): Promise<EntityManageOperationResult<{ id: number }>> => {
      setMutating(true);
      setError(null);
      try {
        await api.deleteAuthor(id);
        setAuthors((prev) => prev.filter((author) => Number(author.id) !== Number(id)));
        return { success: true, data: { id } };
      } catch (err) {
        const mapped = mapAuthorManageApiError(err, 'delete');
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
      void loadAuthors();
    }
  }, [autoLoad, loadAuthors]);

  return {
    authors,
    loading,
    mutating,
    error,
    loadAuthors,
    refreshAuthors,
    clearError,
    createAuthor,
    updateAuthor,
    deleteAuthor,
  };
};
