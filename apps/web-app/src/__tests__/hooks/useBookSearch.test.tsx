import { renderHook, act } from '@testing-library/react';
import { useBookSearch } from '../../hooks/useBookSearch';
import { Book, SearchFilters } from '../../hooks/../types';

// Mock the API service
jest.mock('../../services/api', () => ({
  bookAPI: {
    searchBooks: jest.fn(),
    searchByISBN: jest.fn(),
  },
}));

import { bookAPI } from '../../hooks/../services/api';

const mockBookAPI = bookAPI as jest.Mocked<typeof bookAPI>;

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'Test Book 1',
    authors: [{ id: 1, name: 'Author', surname: 'One' }],
  },
  {
    id: 2,
    title: 'Test Book 2',
    authors: [{ id: 2, name: 'Author', surname: 'Two' }],
  },
];

describe('useBookSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with empty state', () => {
    const { result } = renderHook(() => useBookSearch());

    expect(result.current.books).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.currentPage).toBe(1);
    expect(typeof result.current.searchBooks).toBe('function');
    expect(typeof result.current.searchByISBN).toBe('function');
    expect(typeof result.current.clearSearch).toBe('function');
    expect(typeof result.current.loadMore).toBe('function');
  });

  describe('searchBooks', () => {
    test('searches books with query', async () => {
      const mockResponse = {
        books: mockBooks,
        totalCount: 2,
        page: 1,
        limit: 10,
        hasMore: false,
      };

      mockBookAPI.searchBooks.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch());

      await act(async () => {
        await result.current.searchBooks('test query');
      });

      expect(mockBookAPI.searchBooks).toHaveBeenCalledWith('test query', {}, 1);
      expect(result.current.books).toEqual(mockBooks);
      expect(result.current.totalCount).toBe(2);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    test('searches books with filters', async () => {
      const filters: SearchFilters = {
        categoryId: 1,
        authorId: 2,
        status: 'finished',
      };

      const mockResponse = {
        books: mockBooks,
        totalCount: 2,
        page: 1,
        limit: 10,
        hasMore: false,
      };

      mockBookAPI.searchBooks.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch());

      await act(async () => {
        await result.current.searchBooks('test', filters);
      });

      expect(mockBookAPI.searchBooks).toHaveBeenCalledWith('test', filters, 1);
      expect(result.current.books).toEqual(mockBooks);
    });

    test('clears search when query is empty and no filters', async () => {
      const { result } = renderHook(() => useBookSearch());

      // First set some state
      await act(async () => {
        result.current.searchBooks('initial search');
      });

      // Then clear with empty query
      await act(async () => {
        await result.current.searchBooks('');
      });

      expect(result.current.books).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
    });

    test('handles search errors', async () => {
      const error = new Error('Search failed');
      mockBookAPI.searchBooks.mockRejectedValue(error);

      const { result } = renderHook(() => useBookSearch());

      await act(async () => {
        await result.current.searchBooks('test query');
      });

      expect(result.current.error).toBe('Search failed');
      expect(result.current.loading).toBe(false);
      expect(result.current.books).toEqual([]);
    });

    test('sets loading state during search', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockBookAPI.searchBooks.mockReturnValue(promise);

      const { result } = renderHook(() => useBookSearch());

      act(() => {
        result.current.searchBooks('test query');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({
          books: mockBooks,
          totalCount: 2,
          page: 1,
          limit: 10,
          hasMore: false,
        });
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });

    test('handles pagination correctly', async () => {
      const mockResponse = {
        books: mockBooks,
        totalCount: 20,
        page: 1,
        limit: 10,
        hasMore: true,
      };

      mockBookAPI.searchBooks.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch());

      await act(async () => {
        await result.current.searchBooks('test query');
      });

      expect(result.current.hasMore).toBe(true);
      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('searchByISBN', () => {
    test('searches book by ISBN successfully', async () => {
      const mockBook = mockBooks[0];
      mockBookAPI.searchByISBN.mockResolvedValue(mockBook);

      const { result } = renderHook(() => useBookSearch());

      let searchResult: Book | null = null;
      await act(async () => {
        searchResult = await result.current.searchByISBN('9781234567890');
      });

      expect(mockBookAPI.searchByISBN).toHaveBeenCalledWith('9781234567890');
      expect(searchResult).toBe(mockBook);
      expect(result.current.error).toBe(null);
    });

    test('handles ISBN search errors', async () => {
      const error = new Error('ISBN search failed');
      mockBookAPI.searchByISBN.mockRejectedValue(error);

      const { result } = renderHook(() => useBookSearch());

      let searchResult: Book | null = null;
      await act(async () => {
        searchResult = await result.current.searchByISBN('9781234567890');
      });

      expect(result.current.error).toBe('ISBN search failed');
      expect(searchResult).toBe(null);
    });

    test('returns null when no book found by ISBN', async () => {
      mockBookAPI.searchByISBN.mockResolvedValue(null);

      const { result } = renderHook(() => useBookSearch());

      let searchResult: Book | null = null;
      await act(async () => {
        searchResult = await result.current.searchByISBN('9781234567890');
      });

      expect(searchResult).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  describe('clearSearch', () => {
    test('clears all search state', async () => {
      const mockResponse = {
        books: mockBooks,
        totalCount: 2,
        page: 1,
        limit: 10,
        hasMore: false,
      };

      mockBookAPI.searchBooks.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch());

      // First populate the state
      await act(async () => {
        await result.current.searchBooks('test query');
      });

      expect(result.current.books).toEqual(mockBooks);

      // Then clear it
      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.books).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.error).toBe(null);
    });
  });

  describe('loadMore', () => {
    test('loads more results', async () => {
      // Initial search response
      const firstResponse = {
        books: [mockBooks[0]],
        totalCount: 20,
        page: 1,
        limit: 10,
        hasMore: true,
      };

      // Load more response
      const secondResponse = {
        books: [mockBooks[1]],
        totalCount: 20,
        page: 2,
        limit: 10,
        hasMore: false,
      };

      mockBookAPI.searchBooks
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const { result } = renderHook(() => useBookSearch());

      // Initial search
      await act(async () => {
        await result.current.searchBooks('test query');
      });

      expect(result.current.books).toHaveLength(1);
      expect(result.current.hasMore).toBe(true);

      // Load more
      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockBookAPI.searchBooks).toHaveBeenCalledTimes(2);
      expect(mockBookAPI.searchBooks).toHaveBeenLastCalledWith('test query', {}, 2);
      expect(result.current.books).toHaveLength(2);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.currentPage).toBe(2);
    });

    test('does not load more when hasMore is false', async () => {
      const mockResponse = {
        books: mockBooks,
        totalCount: 2,
        page: 1,
        limit: 10,
        hasMore: false,
      };

      mockBookAPI.searchBooks.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch());

      // Initial search
      await act(async () => {
        await result.current.searchBooks('test query');
      });

      expect(result.current.hasMore).toBe(false);

      // Try to load more
      await act(async () => {
        await result.current.loadMore();
      });

      // Should only be called once (for initial search)
      expect(mockBookAPI.searchBooks).toHaveBeenCalledTimes(1);
    });

    test('handles load more errors', async () => {
      const firstResponse = {
        books: [mockBooks[0]],
        totalCount: 20,
        page: 1,
        limit: 10,
        hasMore: true,
      };

      mockBookAPI.searchBooks
        .mockResolvedValueOnce(firstResponse)
        .mockRejectedValueOnce(new Error('Load more failed'));

      const { result } = renderHook(() => useBookSearch());

      // Initial search
      await act(async () => {
        await result.current.searchBooks('test query');
      });

      // Load more (fails)
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.error).toBe('Load more failed');
      expect(result.current.books).toHaveLength(1); // Original books should remain
    });
  });

  describe('edge cases', () => {
    test('handles whitespace-only queries', async () => {
      const { result } = renderHook(() => useBookSearch());

      await act(async () => {
        await result.current.searchBooks('   ');
      });

      expect(mockBookAPI.searchBooks).not.toHaveBeenCalled();
      expect(result.current.books).toEqual([]);
    });

    test('handles concurrent searches', async () => {
      const firstResponse = {
        books: [mockBooks[0]],
        totalCount: 1,
        page: 1,
        limit: 10,
        hasMore: false,
      };

      const secondResponse = {
        books: mockBooks,
        totalCount: 2,
        page: 1,
        limit: 10,
        hasMore: false,
      };

      mockBookAPI.searchBooks
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const { result } = renderHook(() => useBookSearch());

      // Start two searches concurrently
      await act(async () => {
        const promise1 = result.current.searchBooks('first query');
        const promise2 = result.current.searchBooks('second query');
        await Promise.all([promise1, promise2]);
      });

      // Should have results from the last search
      expect(result.current.books).toEqual(mockBooks);
    });
  });
});