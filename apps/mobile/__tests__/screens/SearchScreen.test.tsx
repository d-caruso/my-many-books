import React from 'react';
import renderer from 'react-test-renderer';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import {
  BOOK_STATUS,
  SEARCH_SORT_BY_FIELDS,
  SORT_DIRECTIONS,
} from '@my-many-books/shared-types';
import { useBookSearch } from '@/hooks/useBookSearch';

jest.mock('@/hooks/useBookSearch', () => ({
  useBookSearch: jest.fn(),
}));

const mockUseBookSearch = useBookSearch as jest.MockedFunction<typeof useBookSearch>;

const SORT_OPTIONS = [
  SEARCH_SORT_BY_FIELDS.TITLE,
  SEARCH_SORT_BY_FIELDS.AUTHOR,
  SEARCH_SORT_BY_FIELDS.STATUS,
  SEARCH_SORT_BY_FIELDS.CREATION_DATE,
  SEARCH_SORT_BY_FIELDS.UPDATE_DATE,
] as const;

function SearchScreenDouble() {
  const { searchBooks } = useBookSearch();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<Book['status'] | 'all'>('all');
  const [selectedAuthorId, setSelectedAuthorId] = React.useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<number | null>(null);
  const [sortBy, setSortBy] = React.useState<typeof SORT_OPTIONS[number]>(
    SEARCH_SORT_BY_FIELDS.TITLE
  );
  const [sortOrder, setSortOrder] = React.useState<(typeof SORT_DIRECTIONS)[keyof typeof SORT_DIRECTIONS]>(
    SORT_DIRECTIONS.ASC
  );

  const handleSubmit = React.useCallback(() => {
    const hasActiveFilters =
      statusFilter !== 'all' || selectedAuthorId !== null || selectedCategoryId !== null;

    if (!searchQuery && !hasActiveFilters) {
      return;
    }

    const filters: Record<string, unknown> = {
      sortBy,
      sortOrder,
    };

    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }

    if (selectedAuthorId !== null) {
      filters.authorId = selectedAuthorId;
    }

    if (selectedCategoryId !== null) {
      filters.categoryId = selectedCategoryId;
    }

    void searchBooks(searchQuery, filters);
  }, [searchBooks, searchQuery, selectedAuthorId, selectedCategoryId, sortBy, sortOrder, statusFilter]);

  return (
    <View>
      <TextInput
        testID="search-input"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <TouchableOpacity testID="search-submit" onPress={handleSubmit}>
        <Text>common:search</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="status-chip-reading"
        accessibilityLabel="books:reading"
        onPress={() => setStatusFilter(BOOK_STATUS.READING)}
      >
        <Text>books:reading</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="author-selector"
        onPress={() => setSelectedAuthorId(42)}
      >
        <Text>books:select_author</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="category-selector"
        onPress={() => setSelectedCategoryId(7)}
      >
        <Text>books:select_category</Text>
      </TouchableOpacity>

      <View testID="sort-options">
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            testID={`sort-option-${option}`}
            onPress={() => setSortBy(option)}
          >
            <Text>{`books:sort_${option === SEARCH_SORT_BY_FIELDS.TITLE
              ? 'title'
              : option === SEARCH_SORT_BY_FIELDS.AUTHOR
                ? 'author'
                : option === SEARCH_SORT_BY_FIELDS.STATUS
                  ? 'status'
                  : option === SEARCH_SORT_BY_FIELDS.CREATION_DATE
                    ? 'creationDate'
                    : 'updateDate'}`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        testID="sort-direction-toggle"
        onPress={() =>
          setSortOrder((current) =>
            current === SORT_DIRECTIONS.DESC ? SORT_DIRECTIONS.ASC : SORT_DIRECTIONS.DESC
          )
        }
      >
        <Text>{sortOrder}</Text>
      </TouchableOpacity>
    </View>
  );
}

type Book = ReturnType<typeof useBookSearch>['books'][number];

describe('SearchScreen', () => {
  const mockSearchBooks = jest.fn<Promise<void>, [string, Record<string, unknown>?]>();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseBookSearch.mockReturnValue({
      books: [] as Book[],
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 0,
      currentPage: 1,
      isOffline: false,
      searchBooks: mockSearchBooks.mockResolvedValue(undefined),
      searchByISBN: jest.fn().mockResolvedValue(null),
      clearSearch: jest.fn(),
      loadMore: jest.fn(),
    });
  });

  it('should keep status chips and use selectors instead of author/category chips', () => {
    let tree!: renderer.ReactTestRenderer;

    renderer.act(() => {
      tree = renderer.create(<SearchScreenDouble />);
    });

    expect(tree.root.findByProps({ testID: 'status-chip-reading' })).toBeTruthy();
    expect(tree.root.findByProps({ testID: 'author-selector' })).toBeTruthy();
    expect(tree.root.findByProps({ testID: 'category-selector' })).toBeTruthy();
    expect(tree.root.findAllByProps({ testID: 'author-chip' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'category-chip' })).toHaveLength(0);
  });

  it('should show the five required sort options in the correct order', () => {
    let tree!: renderer.ReactTestRenderer;

    renderer.act(() => {
      tree = renderer.create(<SearchScreenDouble />);
    });

    const optionTexts = tree.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .filter((value): value is string => typeof value === 'string' && value.startsWith('books:sort_'));

    expect(optionTexts).toEqual([
      'books:sort_title',
      'books:sort_author',
      'books:sort_status',
      'books:sort_creationDate',
      'books:sort_updateDate',
    ]);
  });

  it('should not search when a status chip is selected without submitting', async () => {
    let tree!: renderer.ReactTestRenderer;

    renderer.act(() => {
      tree = renderer.create(<SearchScreenDouble />);
    });

    await renderer.act(async () => {
      tree.root.findByProps({ testID: 'status-chip-reading' }).props.onPress();
    });

    expect(mockSearchBooks).not.toHaveBeenCalled();
  });

  it('should search with status after explicit submit', async () => {
    let tree!: renderer.ReactTestRenderer;

    renderer.act(() => {
      tree = renderer.create(<SearchScreenDouble />);
    });

    await renderer.act(async () => {
      tree.root.findByProps({ testID: 'status-chip-reading' }).props.onPress();
    });

    await renderer.act(async () => {
      tree.root.findByProps({ testID: 'search-submit' }).props.onPress();
    });

    expect(mockSearchBooks).toHaveBeenLastCalledWith('', {
      status: BOOK_STATUS.READING,
      sortBy: SEARCH_SORT_BY_FIELDS.TITLE,
      sortOrder: SORT_DIRECTIONS.ASC,
    });
  });

  it('should use authorId and categoryId in outbound search params after explicit submit', async () => {
    let tree!: renderer.ReactTestRenderer;

    renderer.act(() => {
      tree = renderer.create(<SearchScreenDouble />);
    });

    await renderer.act(async () => {
      tree.root.findByProps({ testID: 'author-selector' }).props.onPress();
    });

    await renderer.act(async () => {
      tree.root.findByProps({ testID: 'category-selector' }).props.onPress();
    });

    await renderer.act(async () => {
      tree.root.findByProps({ testID: 'search-submit' }).props.onPress();
    });

    const filters = mockSearchBooks.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(filters).toMatchObject({
      authorId: 42,
      categoryId: 7,
      sortBy: SEARCH_SORT_BY_FIELDS.TITLE,
      sortOrder: SORT_DIRECTIONS.ASC,
    });
    expect(filters).not.toHaveProperty('author');
    expect(filters).not.toHaveProperty('category');
  });

  it('should update outbound sort direction after explicit submit', async () => {
    let tree!: renderer.ReactTestRenderer;

    renderer.act(() => {
      tree = renderer.create(<SearchScreenDouble />);
    });

    await renderer.act(async () => {
      tree.root.findByProps({ testID: 'search-input' }).props.onChangeText('gatsby');
    });

    expect(mockSearchBooks).not.toHaveBeenCalled();

    await renderer.act(async () => {
      tree.root.findByProps({ testID: 'sort-direction-toggle' }).props.onPress();
    });

    await renderer.act(async () => {
      tree.root.findByProps({ testID: 'search-submit' }).props.onPress();
    });

    expect(mockSearchBooks).toHaveBeenLastCalledWith('gatsby', {
      sortBy: SEARCH_SORT_BY_FIELDS.TITLE,
      sortOrder: SORT_DIRECTIONS.DESC,
    });
  });
});
