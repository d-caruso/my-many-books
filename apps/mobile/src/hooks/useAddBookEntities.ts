import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import type { Author, Category } from '@my-many-books/shared-types';
import { authorAPI, categoryAPI } from '@/services/api';
import { mobileHooks, MOBILE_EVENTS, RESOURCE_TYPES } from '@/services/hooks/mobileHooks';
import { useTranslation } from 'react-i18next';
import { createCategoryDisplayNameComparator } from '@my-many-books/shared-utils';
import { getErrorMessage } from '@/utils/helpers';

const sortAuthors = (authors: Author[]): Author[] =>
  [...authors].sort((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`));

export function useAddBookEntities() {
  const { t, i18n } = useTranslation();
  const [availableAuthors, setAvailableAuthors] = useState<Author[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<Author[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesSorting, startCategorySortingTransition] = useTransition();
  const categoryComparator = useMemo(
    () => createCategoryDisplayNameComparator<Category>(t, i18n.language),
    [t, i18n.language]
  );

  const loadAuthors = useCallback(async () => {
    setAuthorsLoading(true);
    try {
      const authors = await authorAPI.getAuthors();
      setAvailableAuthors(sortAuthors(authors));
    } catch (err: unknown) {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: 'load_authors_for_add_book',
        resource: String(RESOURCE_TYPES.AUTHOR),
        error: getErrorMessage(err),
        source: 'book_add_load_authors',
      });
    } finally {
      setAuthorsLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const categories = await categoryAPI.getCategories();
      startCategorySortingTransition(() => {
        setAvailableCategories([...categories].sort(categoryComparator));
      });
    } catch (err: unknown) {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: 'load_categories_for_add_book',
        resource: String(RESOURCE_TYPES.CATEGORY),
        error: getErrorMessage(err),
        source: 'book_add_load_categories',
      });
    } finally {
      setCategoriesLoading(false);
    }
  }, [categoryComparator]);

  useEffect(() => {
    startCategorySortingTransition(() => {
      setAvailableCategories((prev) => [...prev].sort(categoryComparator));
    });
  }, [categoryComparator]);

  useEffect(() => {
    void loadAuthors();
    void loadCategories();
  }, [loadAuthors, loadCategories]);

  const selectAuthor = useCallback((author: Author) => {
    setSelectedAuthors((prev) =>
      prev.some((existing) => Number(existing.id) === Number(author.id)) ? prev : [...prev, author]
    );
  }, []);

  const removeAuthor = useCallback((authorId: number) => {
    setSelectedAuthors((prev) => prev.filter((author) => Number(author.id) !== authorId));
  }, []);

  const toggleCategory = useCallback((categoryId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  }, []);

  const createAuthorAndSelect = useCallback(
    async (input: { name: string; surname: string; nationality?: string }) => {
      const created = await authorAPI.createAuthor(input);
      await loadAuthors();
      setSelectedAuthors((prev) =>
        prev.some((author) => Number(author.id) === Number(created.id)) ? prev : [...prev, created]
      );
      return created;
    },
    [loadAuthors]
  );

  const createCategoryAndSelect = useCallback(
    async (input: { name: string }) => {
      const created = await categoryAPI.createCategory(input);
      await loadCategories();
      setSelectedCategoryIds((prev) =>
        prev.includes(Number(created.id)) ? prev : [...prev, Number(created.id)]
      );
      return created;
    },
    [loadCategories]
  );

  const handleAuthorUpdated = useCallback(
    async (updatedAuthor: Author) => {
      setSelectedAuthors((prev) =>
        prev.map((author) =>
          Number(author.id) === Number(updatedAuthor.id) ? updatedAuthor : author
        )
      );
      await loadAuthors();
    },
    [loadAuthors]
  );

  const handleAuthorDeleted = useCallback(
    async (deletedAuthorId: number) => {
      setSelectedAuthors((prev) =>
        prev.filter((author) => Number(author.id) !== Number(deletedAuthorId))
      );
      await loadAuthors();
    },
    [loadAuthors]
  );

  const handleCategoryUpdated = useCallback(async (_updatedCategory: Category) => {
    await loadCategories();
  }, [loadCategories]);

  const handleCategoryDeleted = useCallback(
    async (deletedCategoryId: number) => {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== Number(deletedCategoryId)));
      await loadCategories();
    },
    [loadCategories]
  );

  return {
    availableAuthors,
    availableCategories,
    selectedAuthors,
    selectedCategoryIds,
    authorsLoading,
    categoriesLoading,
    categoriesSorting,
    setSelectedAuthors,
    setSelectedCategoryIds,
    loadAuthors,
    loadCategories,
    selectAuthor,
    removeAuthor,
    toggleCategory,
    createAuthorAndSelect,
    createCategoryAndSelect,
    handleAuthorUpdated,
    handleAuthorDeleted,
    handleCategoryUpdated,
    handleCategoryDeleted,
  };
}
