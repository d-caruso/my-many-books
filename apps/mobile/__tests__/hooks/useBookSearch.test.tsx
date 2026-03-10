import React from 'react';
import renderer from 'react-test-renderer';
import type { Book } from '@/types';

// Import after mocks
import { useBookSearch } from '@/hooks/useBookSearch';
import { bookAPI } from '@/services/api';
import { Text, View, TouchableOpacity } from 'react-native';

// Unmock the hook so we can test the real implementation
jest.unmock('@/hooks/useBookSearch');

// Create a shared object to hold the mocks
const mockApiMocks = {
  searchBooks: jest.fn(),
  searchByISBN: jest.fn(),
};

const mockDbMocks = {
  searchWithFilters: jest.fn(),
};

jest.mock('@/services/api', () => ({
  bookAPI: {
    searchBooks: (...args: unknown[]) => mockApiMocks.searchBooks(...args),
    searchByISBN: (...args: unknown[]) => mockApiMocks.searchByISBN(...args),
  },
  apiUtils: {
    isOnline: jest.fn(() => Promise.resolve(true)),
    getAuthHeaders: jest.fn(() => ({ 'Content-Type': 'application/json' })),
    handleOfflineError: jest.fn((error: unknown) => Promise.reject(error)),
    isOfflineError: jest.fn((error: unknown) => false),
  },
}));

jest.mock('@/services/database/BookRepository', () => ({
  bookRepository: {
    searchWithFilters: (...args: unknown[]) => mockDbMocks.searchWithFilters(...args),
  },
}));

// Mock useNetworkState with controllable state
let mockIsOnline = true;
jest.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => ({
    isOnline: mockIsOnline,
    isInternetReachable: mockIsOnline,
    connectionType: mockIsOnline ? 'wifi' : 'none',
  }),
}));

// Test component that uses the hook
function BookSearchTestComponent({ testId }: { testId: string }) {
  const hook = useBookSearch();

  return (
    <View testID={testId}>
      <Text testID="books-count">{hook.books.length}</Text>
      <Text testID="loading">{String(hook.loading)}</Text>
      <Text testID="error">{hook.error || 'null'}</Text>
      <Text testID="has-more">{String(hook.hasMore)}</Text>
      <Text testID="total-count">{hook.totalCount}</Text>
      <Text testID="current-page">{hook.currentPage}</Text>
      <Text testID="is-offline">{String(hook.isOffline)}</Text>
      <TouchableOpacity testID="search-button" onPress={() => hook.searchBooks('test')}>
        <Text>Search</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="clear-button" onPress={() => hook.clearSearch()}>
        <Text>Clear</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="loadmore-button" onPress={() => hook.loadMore()}>
        <Text>Load More</Text>
      </TouchableOpacity>
    </View>
  );
}

describe('useBookSearch Hook', () => {
  beforeAll(() => {
    // Use real timers for this test suite (override global fake timers)
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnline = true;
    // Ensure mocks return promises by default
    mockApiMocks.searchBooks.mockResolvedValue({ books: [], total: 0, hasMore: false });
    mockApiMocks.searchByISBN.mockResolvedValue(null);
    mockDbMocks.searchWithFilters.mockResolvedValue([]);
  });

  afterAll(() => {
    // Restore fake timers
    jest.useFakeTimers();
  });

  it('should import the hook', () => {
    expect(useBookSearch).toBeDefined();
    expect(typeof useBookSearch).toBe('function');
  });

  it('should verify API mock setup', () => {
    // Check what bookAPI actually has
    expect(bookAPI).toBeDefined();

    // Log what's in bookAPI (will fail but show us the structure)
    expect(bookAPI).toEqual({
      searchBooks: expect.any(Function),
      searchByISBN: expect.any(Function),
    });
  });


  it('should initialize with default state', () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<BookSearchTestComponent testId="test" />);
    });

    const instance = tree!.root;
    expect(instance.findByProps({ testID: 'books-count' }).props.children).toBe(0);
    expect(instance.findByProps({ testID: 'loading' }).props.children).toBe('false');
    expect(instance.findByProps({ testID: 'error' }).props.children).toBe('null');
    expect(instance.findByProps({ testID: 'has-more' }).props.children).toBe('false');
    expect(instance.findByProps({ testID: 'total-count' }).props.children).toBe(0);
    expect(instance.findByProps({ testID: 'current-page' }).props.children).toBe(1);
    expect(instance.findByProps({ testID: 'is-offline' }).props.children).toBe('false');
  });

  it('should expose search functions', () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<BookSearchTestComponent testId="test" />);
    });

    const instance = tree!.root;
    const searchButton = instance.findByProps({ testID: 'search-button' });
    const clearButton = instance.findByProps({ testID: 'clear-button' });
    const loadMoreButton = instance.findByProps({ testID: 'loadmore-button' });

    expect(searchButton).toBeDefined();
    expect(clearButton).toBeDefined();
    expect(loadMoreButton).toBeDefined();
  });

  it('should debug button click', async () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<BookSearchTestComponent testId="test" />);
    });

    const instance = tree!.root;
    const isOfflineText = instance.findByProps({ testID: 'is-offline' });
    expect(isOfflineText.props.children).toBe('false'); // Should be online

    const searchButton = instance.findByProps({ testID: 'search-button' });
    expect(searchButton).toBeDefined();
    expect(typeof searchButton.props.onPress).toBe('function');

    // Call onPress
    await renderer.act(async () => {
      await searchButton.props.onPress();
    });

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check which mock was called
    expect(mockApiMocks.searchBooks.mock.calls.length + mockDbMocks.searchWithFilters.mock.calls.length).toBeGreaterThan(0);
  });

  it('should search books when online', async () => {
    const mockResults = {
      books: [
        { id: 1, title: 'Test Book 1', creationDate: '2024-01-01', updateDate: '2024-01-01' },
        { id: 2, title: 'Test Book 2', creationDate: '2024-01-02', updateDate: '2024-01-02' },
      ] as Book[],
      total: 2,
      hasMore: false,
    };

    mockApiMocks.searchBooks.mockResolvedValueOnce(mockResults);

    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<BookSearchTestComponent testId="test" />);
    });

    // Trigger search
    await renderer.act(async () => {
      const searchButton = tree!.root.findByProps({ testID: 'search-button' });
      await searchButton.props.onPress();
    });

    // Wait for state update
    await new Promise(resolve => setTimeout(resolve, 100));

    renderer.act(() => {
      tree!.update(<BookSearchTestComponent testId="test" />);
    });

    expect(mockApiMocks.searchBooks).toHaveBeenCalledWith({
      q: 'test',
      page: 1,
      limit: 20,
    });
  });

  it('should use local repository when offline', async () => {
    mockIsOnline = false;

    const mockLocalResults = [
      { id: 1, title: 'Local Book', creationDate: '2024-01-01', updateDate: '2024-01-01' },
    ] as Book[];

    mockDbMocks.searchWithFilters.mockResolvedValueOnce(mockLocalResults);

    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<BookSearchTestComponent testId="test" />);
    });

    const instance = tree!.root;
    expect(instance.findByProps({ testID: 'is-offline' }).props.children).toBe('true');

    // Trigger search
    await renderer.act(async () => {
      const searchButton = tree!.root.findByProps({ testID: 'search-button' });
      await searchButton.props.onPress();
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockDbMocks.searchWithFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'test',
        sortBy: 'update_date',
        sortOrder: 'desc',
      })
    );
    expect(mockApiMocks.searchBooks).not.toHaveBeenCalled();
  });

  it('should clear search results', async () => {
    const mockResults = {
      books: [{ id: 1, title: 'Book', creationDate: '2024-01-01', updateDate: '2024-01-01' }] as Book[],
      total: 1,
      hasMore: false,
    };

    mockApiMocks.searchBooks.mockResolvedValueOnce(mockResults);

    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<BookSearchTestComponent testId="test" />);
    });

    // Search first
    await renderer.act(async () => {
      const searchButton = tree!.root.findByProps({ testID: 'search-button' });
      await searchButton.props.onPress();
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Then clear
    renderer.act(() => {
      const clearButton = tree!.root.findByProps({ testID: 'clear-button' });
      clearButton.props.onPress();
    });

    renderer.act(() => {
      tree!.update(<BookSearchTestComponent testId="test" />);
    });

    const instance = tree!.root;
    expect(instance.findByProps({ testID: 'books-count' }).props.children).toBe(0);
    expect(instance.findByProps({ testID: 'total-count' }).props.children).toBe(0);
  });

  it('should handle API errors and fallback to local search', async () => {
    const apiError = new Error('Network error');
    mockApiMocks.searchBooks.mockRejectedValueOnce(apiError);

    const mockLocalResults = [
      { id: 1, title: 'Local Book', creationDate: '2024-01-01', updateDate: '2024-01-01' },
    ] as Book[];
    mockDbMocks.searchWithFilters.mockResolvedValueOnce(mockLocalResults);

    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<BookSearchTestComponent testId="test" />);
    });

    await renderer.act(async () => {
      const searchButton = tree!.root.findByProps({ testID: 'search-button' });
      await searchButton.props.onPress();
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockApiMocks.searchBooks).toHaveBeenCalled();
    expect(mockDbMocks.searchWithFilters).toHaveBeenCalled();
  });

  it('should handle empty query', async () => {
    function EmptyQueryComponent() {
      const { searchBooks, books } = useBookSearch();
      React.useEffect(() => {
        searchBooks('');
      }, [searchBooks]);
      return <Text testID="result">{books.length}</Text>;
    }

    let tree: renderer.ReactTestRenderer;
    await renderer.act(async () => {
      tree = renderer.create(<EmptyQueryComponent />);
    });

    expect(mockApiMocks.searchBooks).not.toHaveBeenCalled();
  });

  it('should return null for empty ISBN', async () => {
    function ISBNComponent() {
      const { searchByISBN } = useBookSearch();
      const [result, setResult] = React.useState<Book | null | undefined>(undefined);

      React.useEffect(() => {
        searchByISBN('   ').then(setResult);
      }, [searchByISBN]);

      return <Text testID="result">{result === null ? 'null' : result === undefined ? 'undefined' : 'book'}</Text>;
    }

    let tree: renderer.ReactTestRenderer;
    await renderer.act(async () => {
      tree = renderer.create(<ISBNComponent />);
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    renderer.act(() => {
      tree!.update(<ISBNComponent />);
    });

    expect(mockApiMocks.searchByISBN).not.toHaveBeenCalled();
  });

  it('should search by ISBN', async () => {
    const mockBook = {
      id: 1,
      title: 'ISBN Book',
      isbnCode: '1234567890',
      creationDate: '2024-01-01',
      updateDate: '2024-01-01',
    } as Book;

    mockApiMocks.searchByISBN.mockResolvedValueOnce(mockBook);

    function ISBNSearchComponent() {
      const { searchByISBN } = useBookSearch();
      const [result, setResult] = React.useState<Book | null | undefined>(undefined);

      React.useEffect(() => {
        searchByISBN('1234567890').then(setResult);
      }, [searchByISBN]);

      return <Text testID="result">{result?.title || 'none'}</Text>;
    }

    let tree: renderer.ReactTestRenderer;
    await renderer.act(async () => {
      tree = renderer.create(<ISBNSearchComponent />);
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockApiMocks.searchByISBN).toHaveBeenCalledWith('1234567890');
  });

  it('should handle pagination', async () => {
    const page1Results = {
      books: [{ id: 1, title: 'Book 1', creationDate: '2024-01-01', updateDate: '2024-01-01' }] as Book[],
      total: 10,
      hasMore: true,
    };

    const page2Results = {
      books: [{ id: 2, title: 'Book 2', creationDate: '2024-01-02', updateDate: '2024-01-02' }] as Book[],
      total: 10,
      hasMore: false,
    };

    mockApiMocks.searchBooks
      .mockResolvedValueOnce(page1Results)
      .mockResolvedValueOnce(page2Results);

    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<BookSearchTestComponent testId="test" />);
    });

    // First search
    await renderer.act(async () => {
      const searchButton = tree!.root.findByProps({ testID: 'search-button' });
      await searchButton.props.onPress();
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Load more
    await renderer.act(async () => {
      const loadMoreButton = tree!.root.findByProps({ testID: 'loadmore-button' });
      await loadMoreButton.props.onPress();
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockApiMocks.searchBooks).toHaveBeenCalledTimes(2);
    expect(mockApiMocks.searchBooks).toHaveBeenNthCalledWith(2, {
      q: 'test',
      page: 2,
      limit: 20,
    });
  });
});
