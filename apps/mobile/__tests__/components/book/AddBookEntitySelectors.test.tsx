import React from 'react';
import renderer, { act } from 'react-test-renderer';

import type { Author, Category } from '@my-many-books/shared-types';
import { AuthorsSection } from '@/components/book/AuthorsSection';
import { CategoriesSection } from '@/components/book/CategoriesSection';
import { AuthorSelectorModal } from '@/components/book/AuthorSelectorModal';
import { CategorySelectorModal } from '@/components/book/CategorySelectorModal';

const sampleAuthors: Author[] = [
  { id: 1, name: 'Jane', surname: 'Austen' } as Author,
  { id: 2, name: 'Virginia', surname: 'Woolf' } as Author,
];

const sampleCategories: Category[] = [
  { id: 10, name: 'Fiction' } as Category,
  { id: 11, name: 'Classics' } as Category,
];

describe('mobile Add Book author/category UI', () => {
  const collectText = (node: renderer.ReactTestRendererJSON | renderer.ReactTestRendererJSON[] | null): string[] => {
    if (!node) return [];
    if (Array.isArray(node)) return node.flatMap(collectText);
    const own = typeof node.children?.[0] === 'string' ? (node.children as string[]) : [];
    const nested = (node.children || [])
      .filter((child): child is renderer.ReactTestRendererJSON => typeof child === 'object' && child !== null)
      .flatMap(collectText);
    return [...own, ...nested];
  };

  it('renders selected authors and invokes section actions', () => {
    const onOpenSelector = jest.fn();
    const onOpenAdd = jest.fn();
    const onRemoveAuthor = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AuthorsSection
          selectedAuthors={sampleAuthors}
          authorsLoading={false}
          onOpenSelector={onOpenSelector}
          onOpenManage={jest.fn()}
          onOpenAdd={onOpenAdd}
          onRemoveAuthor={onRemoveAuthor}
        />
      );
    });

    const textValues = collectText(tree.toJSON()).join(' | ');
    expect(textValues).toContain('books:authors');
    expect(textValues).toContain('books:select_author');
    expect(textValues).toContain('common:manage');
    expect(textValues).toContain('books:add_author');
    expect(textValues).toContain('Jane');
    expect(textValues).toContain('Austen');
    expect(textValues).toContain('Virginia');
    expect(textValues).toContain('Woolf');

    const buttonNodes = tree.root.findAll((node) => node.type === 'Button');
    act(() => {
      buttonNodes[0].props.onPress();
      buttonNodes[2].props.onPress();
    });

    expect(onOpenSelector).toHaveBeenCalledTimes(1);
    expect(onOpenAdd).toHaveBeenCalledTimes(1);
  });

  it('renders selected category names from available categories', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <CategoriesSection
          categoriesLoading={false}
          availableCategories={sampleCategories}
          selectedCategoryIds={[10, 11]}
          onOpenSelector={jest.fn()}
          onOpenManage={jest.fn()}
          onOpenAdd={jest.fn()}
          onToggleCategory={jest.fn()}
        />
      );
    });

    const textValues = collectText(tree.toJSON()).join(' | ');

    expect(textValues).toContain('books:categories');
    expect(textValues).toContain('common:manage');
    expect(textValues).toContain('Fiction');
    expect(textValues).toContain('Classics');
  });

  it('filters authors locally and selects a matching author', () => {
    const onSelectAuthor = jest.fn();
    const onClose = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AuthorSelectorModal
          visible={true}
          authors={sampleAuthors}
          selectedAuthorIds={[]}
          onClose={onClose}
          onSelectAuthor={onSelectAuthor}
          onAddAuthorPress={jest.fn()}
        />
      );
    });

    const textInput = tree.root.find((node) => node.type === 'TextInput');
    act(() => {
      textInput.props.onChangeText('Wool');
    });

    const listItems = tree.root.findAll((node) => node.type === 'ListItem');
    expect(listItems).toHaveLength(1);

    act(() => {
      listItems[0].props.onPress();
    });

    expect(onSelectAuthor).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles a category from the selector list', () => {
    const onToggleCategory = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <CategorySelectorModal
          visible={true}
          categories={sampleCategories}
          selectedCategoryIds={[11]}
          onClose={jest.fn()}
          onToggleCategory={onToggleCategory}
          onAddCategoryPress={jest.fn()}
        />
      );
    });

    const listItems = tree.root.findAll((node) => node.type === 'ListItem');
    act(() => {
      listItems[0].props.onPress();
    });

    expect(onToggleCategory).toHaveBeenCalledWith(10);
  });
});
