import React from 'react';
import renderer, { act } from 'react-test-renderer';

import type { Author, Category } from '@my-many-books/shared-types';
import { ManageAuthorsDialog } from '@/components/book/ManageAuthorsDialog';
import { ManageCategoriesDialog } from '@/components/book/ManageCategoriesDialog';
import { authorAPI, categoryAPI } from '@/services/api';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';

const mockUseManageAuthors = jest.fn();
const mockUseManageCategories = jest.fn();

jest.mock('@my-many-books/shared-ui-hooks', () => ({
  useManageAuthors: (...args: unknown[]) => mockUseManageAuthors(...args),
  useManageCategories: (...args: unknown[]) => mockUseManageCategories(...args),
}));

jest.mock('@/services/api', () => ({
  authorAPI: {
    getAuthors: jest.fn(),
    createAuthor: jest.fn(),
    updateAuthor: jest.fn(),
    deleteAuthor: jest.fn(),
  },
  categoryAPI: {
    getCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  },
}));

jest.mock('@/services/hooks/mobileHooks', () => {
  const actual = jest.requireActual('@/services/hooks/eventsSchema');
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    MOBILE_EVENTS: actual.MOBILE_EVENTS,
  };
});

const mockAuthorAPI = authorAPI as jest.Mocked<typeof authorAPI>;
const mockCategoryAPI = categoryAPI as jest.Mocked<typeof categoryAPI>;
const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;

describe('mobile manage entity dialogs', () => {
  beforeEach(() => {
    mockUseManageAuthors.mockReset();
    mockUseManageCategories.mockReset();
    jest.clearAllMocks();
  });

  const getButtonByLabel = (tree: renderer.ReactTestRenderer, label: string) =>
    tree.root.findAll((node) => node.type === 'Button').find((node) => {
      const child = node.props.children;
      if (typeof child === 'string') return child === label;
      if (Array.isArray(child)) return child.includes(label);
      return false;
    });

  it('opens author edit UI and emits update/delete callbacks', async () => {
    const loadAuthors = jest.fn().mockResolvedValue(undefined);
    const clearError = jest.fn();
    const updateAuthor = jest.fn().mockResolvedValue({
      success: true,
      data: { id: 1, name: 'Jane', surname: 'AUSTEN', nationality: 'British' },
    });
    const deleteAuthor = jest.fn().mockResolvedValue({ success: true, data: { id: 1 } });

    mockUseManageAuthors.mockReturnValue({
      authors: [{ id: 1, name: 'Jane', surname: 'Austen', nationality: 'British' } as Author],
      loading: false,
      mutating: false,
      error: null,
      clearError,
      loadAuthors,
      refreshAuthors: loadAuthors,
      createAuthor: jest.fn(),
      updateAuthor,
      deleteAuthor,
    });

    const onAuthorUpdated = jest.fn();
    const onAuthorDeleted = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ManageAuthorsDialog visible={true} onClose={jest.fn()} onAuthorUpdated={onAuthorUpdated} onAuthorDeleted={onAuthorDeleted} />
      );
    });

    const allButtons = tree.root.findAll((node) => node.type === 'Button');
    const editButton = allButtons.find((node) => node.props.children === 'common:edit');
    expect(editButton).toBeTruthy();
    await act(async () => {
      editButton!.props.onPress();
    });

    const textInputs = tree.root.findAll((node) => node.type === 'TextInput');
    const surnameInput = textInputs.find((node) => node.props.label === 'dialogs:author.surname_label');
    expect(surnameInput).toBeTruthy();
    await act(async () => {
      surnameInput!.props.onChangeText('AUSTEN');
    });

    const saveAuthorButton = getButtonByLabel(tree, 'dialogs:author.update_button');
    expect(saveAuthorButton).toBeTruthy();
    await act(async () => {
      await saveAuthorButton!.props.onPress();
    });

    expect(updateAuthor).toHaveBeenCalledWith(1, {
      name: 'Jane',
      surname: 'AUSTEN',
      nationality: 'British',
    });
    expect(onAuthorUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, surname: 'AUSTEN' })
    );

    const deleteButton = tree.root.findAll((node) => node.type === 'Button').find((node) => node.props.children === 'common:delete');
    expect(deleteButton).toBeTruthy();
    await act(async () => {
      deleteButton!.props.onPress();
    });

    const confirmDeleteAuthorButton = getButtonByLabel(tree, 'dialogs:author.delete_button');
    expect(confirmDeleteAuthorButton).toBeTruthy();
    await act(async () => {
      await confirmDeleteAuthorButton!.props.onPress();
    });

    expect(deleteAuthor).toHaveBeenCalledWith(1);
    expect(onAuthorDeleted).toHaveBeenCalledWith(1);
  });

  it('renders category delete conflict message from shared hook error mapping', () => {
    mockUseManageCategories.mockReturnValue({
      categories: [{ id: 10, name: 'Fiction' } as Category],
      loading: false,
      mutating: false,
      error: {
        code: 'HAS_BOOKS',
        i18nKey: 'dialogs:category.delete_blocked_has_books',
      },
      clearError: jest.fn(),
      loadCategories: jest.fn(),
      refreshCategories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ManageCategoriesDialog visible={true} onClose={jest.fn()} />);
    });

    const textNodes = tree.root.findAll((node) => node.type === 'Text');
    const allText = textNodes
      .flatMap((node) => {
        const child = node.props.children;
        if (typeof child === 'string') return [child];
        if (Array.isArray(child)) return child.filter((v): v is string => typeof v === 'string');
        return [];
      })
      .join(' | ');

    expect(allText).toContain('dialogs:category.delete_blocked_has_books');
  });

  it('emits author update and delete lifecycle events through the dialog API', async () => {
    let capturedApi!: {
      updateAuthor: (id: number, data: Partial<{ name: string; surname: string }>) => Promise<Author>;
      deleteAuthor: (id: number) => Promise<void>;
    };

    mockUseManageAuthors.mockImplementation((api: typeof capturedApi) => {
      capturedApi = api;
      return {
        authors: [],
        loading: false,
        mutating: false,
        error: null,
        clearError: jest.fn(),
        loadAuthors: jest.fn(),
        refreshAuthors: jest.fn(),
        createAuthor: jest.fn(),
        updateAuthor: jest.fn(),
        deleteAuthor: jest.fn(),
      };
    });

    mockAuthorAPI.updateAuthor.mockResolvedValue({
      id: 3,
      name: 'Mary',
      surname: 'Shelley',
    } as never);
    mockAuthorAPI.deleteAuthor.mockResolvedValue(undefined as never);

    await act(async () => {
      renderer.create(<ManageAuthorsDialog visible={true} onClose={jest.fn()} />);
    });

    await act(async () => {
      await capturedApi.updateAuthor(3, { surname: 'Shelley' });
      await capturedApi.deleteAuthor(3);
    });

    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.AUTHOR.UPDATE.BEFORE,
      expect.objectContaining({
        resourceType: 'author',
        metadata: expect.objectContaining({
          authorId: 3,
          changes: { surname: 'Shelley' },
        }),
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.AUTHOR.UPDATE.AFTER,
      expect.objectContaining({
        resourceType: 'author',
        result: { author: expect.objectContaining({ id: 3, surname: 'Shelley' }) },
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.AUTHOR.DELETE.BEFORE,
      expect.objectContaining({
        resourceType: 'author',
        metadata: { authorId: 3 },
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.AUTHOR.DELETE.AFTER,
      expect.objectContaining({
        resourceType: 'author',
      })
    );
  });

  it('emits category update and delete lifecycle events through the dialog API', async () => {
    let capturedApi!: {
      updateCategory: (id: number, data: Partial<{ name: string }>) => Promise<Category>;
      deleteCategory: (id: number) => Promise<void>;
    };

    mockUseManageCategories.mockImplementation((api: typeof capturedApi) => {
      capturedApi = api;
      return {
        categories: [],
        loading: false,
        sorting: false,
        mutating: false,
        error: null,
        clearError: jest.fn(),
        loadCategories: jest.fn(),
        refreshCategories: jest.fn(),
        createCategory: jest.fn(),
        updateCategory: jest.fn(),
        deleteCategory: jest.fn(),
      };
    });

    mockCategoryAPI.updateCategory.mockResolvedValue({ id: 4, name: 'Sci-Fi' } as never);
    mockCategoryAPI.deleteCategory.mockResolvedValue(undefined as never);

    await act(async () => {
      renderer.create(<ManageCategoriesDialog visible={true} onClose={jest.fn()} />);
    });

    await act(async () => {
      await capturedApi.updateCategory(4, { name: 'Sci-Fi' });
      await capturedApi.deleteCategory(4);
    });

    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.CATEGORY.UPDATE.BEFORE,
      expect.objectContaining({
        resourceType: 'category',
        metadata: expect.objectContaining({
          categoryId: 4,
          changes: { name: 'Sci-Fi' },
        }),
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.CATEGORY.UPDATE.AFTER,
      expect.objectContaining({
        resourceType: 'category',
        result: { category: expect.objectContaining({ id: 4, name: 'Sci-Fi' }) },
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.CATEGORY.DELETE.BEFORE,
      expect.objectContaining({
        resourceType: 'category',
        metadata: { categoryId: 4 },
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.CATEGORY.DELETE.AFTER,
      expect.objectContaining({
        resourceType: 'category',
      })
    );
  });
});
