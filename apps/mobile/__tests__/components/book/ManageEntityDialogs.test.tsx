import React from 'react';
import renderer, { act } from 'react-test-renderer';

import type { Author, Category } from '@my-many-books/shared-types';
import { ManageAuthorsDialog } from '@/components/book/ManageAuthorsDialog';
import { ManageCategoriesDialog } from '@/components/book/ManageCategoriesDialog';

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

describe('mobile manage entity dialogs', () => {
  beforeEach(() => {
    mockUseManageAuthors.mockReset();
    mockUseManageCategories.mockReset();
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
});
