import { renderHook, act } from '@testing-library/react';
import { useBookSearch } from '../../hooks/useBookSearch';
import { Book, SearchFilters } from '../../hooks/../types';
import { ApiProvider } from '../../contexts/ApiContext';
import React from 'react';

// Create mock API service
const mockBookAPI = {
  searchBooks: vi.fn(),
  searchByISBN: vi.fn(),
};

const mockApiService = {
  searchBooks: mockBookAPI.searchBooks,
  searchByISBN: mockBookAPI.searchByISBN,
  // Add other methods that might be accessed
  getBooks: vi.fn(),
  getBook: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
  getCategories: vi.fn(),
  getCategory: vi.fn(),
  createCategory: vi.fn(),
  getAuthors: vi.fn(),
  searchAuthors: vi.fn(),
  getAuthor: vi.fn(),
  createAuthor: vi.fn(),
  getCurrentUser: vi.fn(),
  updateProfile: vi.fn(),
} as any;

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
    vi.clearAllMocks();
  });

  test('initializes with empty state', () => {
    const { result } = renderHook(() => useBookSearch(), {
      wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
    });

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
        total: 2,
        page: 1,
        hasMore: false,
      };

      mockBookAPI.searchBooks.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await result.current.searchBooks('test query');
      });

      expect(mockBookAPI.searchBooks).toHaveBeenCalledWith({
        q: 'test query',
        page: 1,
        limit: parseInt(process.env.VITE_BOOKS_PAGINATION_DEFAULT),
      });
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
      };

      const mockResponse = {
        books: mockBooks,
        total: 2,
        page: 1,
        hasMore: false,
      };

      mockBookAPI.searchBooks.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await result.current.searchBooks('query', filters);
      });

      expect(mockBookAPI.searchBooks).toHaveBeenCalledWith({
        q: 'query',
        page: 1,
        limit: parseInt(process.env.VITE_BOOKS_PAGINATION_DEFAULT),
        categoryId: 1,
        authorId: 2,
      });
      expect(result.current.books).toEqual(mockBooks);
    });

    test('clears books on empty query without filters', async () => {
      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      mockBookAPI.searchBooks.mockResolvedValue({
        books: [],
        total: 0,
        hasMore: false,
        page: 1,
      });

      await act(async () => {
        await result.current.searchBooks('');
      });

      expect(mockBookAPI.searchBooks).toHaveBeenCalledWith({
        q: '',
        page: 1,
        limit: parseInt(process.env.VITE_BOOKS_PAGINATION_DEFAULT),
      });
      expect(result.current.books).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    test('searches with empty query when filters are provided', async () => {
      const mockResponse = {
        books: mockBooks,
        total: 2,
        page: 1,
        hasMore: false,
      };

      mockBookAPI.searchBooks.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await result.current.searchBooks('', { categoryId: 1 });
      });

      expect(mockBookAPI.searchBooks).toHaveBeenCalledWith({
        q: '',
        page: 1,
        limit: parseInt(process.env.VITE_BOOKS_PAGINATION_DEFAULT),
        categoryId: 1,
      });
      expect(result.current.books).toEqual(mockBooks);
    });

    test('handles search errors', async () => {
      const error = {
        response: {
          data: {
            message: 'Search failed',
          },
        },
      };

      mockBookAPI.searchBooks.mockRejectedValue(error);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await result.current.searchBooks('query');
      });

      expect(result.current.error).toBe('Search failed');
      expect(result.current.books).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    test('replaces books on new search (page 1)', async () => {
      const firstResponse = {
        books: mockBooks,
        total: 2,
        page: 1,
        hasMore: false,
      };

      const secondResponse = {
        books: [{ id: 3, title: 'New Book', authors: [] }],
        total: 1,
        page: 1,
        hasMore: false,
      };

      mockBookAPI.searchBooks
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await result.current.searchBooks('first query');
      });

      expect(result.current.books).toHaveLength(2);

      await act(async () => {
        await result.current.searchBooks('second query');
      });

      expect(result.current.books).toHaveLength(1);
      expect(result.current.books[0].id).toBe(3);
    });

    test('appends books on pagination (page > 1)', async () => {
      const page1Response = {
        books: mockBooks,
        total: 4,
        page: 1,
        hasMore: true,
      };

      const page2Response = {
        books: [{ id: 3, title: 'Book 3', authors: [] }],
        total: 4,
        page: 2,
        hasMore: false,
      };

      mockBookAPI.searchBooks
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await result.current.searchBooks('query', {}, 1);
      });

      expect(result.current.books).toHaveLength(2);

      await act(async () => {
        await result.current.searchBooks('query', {}, 2);
      });

      expect(result.current.books).toHaveLength(3);
      expect(result.current.books[2].id).toBe(3);
    });
  });

  describe('searchByISBN', () => {
    test('searches book by ISBN', async () => {
      const mockBook: Book = {
        id: 1,
        title: 'ISBN Book',
        isbnCode: '1234567890',
        authors: [],
      };

      const mockResponse = {
        book: mockBook,
      };

      mockBookAPI.searchByISBN.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      let book: Book | null = null;
      await act(async () => {
        book = await result.current.searchByISBN('1234567890');
      });

      expect(mockBookAPI.searchByISBN).toHaveBeenCalledWith('1234567890');
      expect(book).toEqual(mockBook);
    });

    test('returns null for empty ISBN', async () => {
      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      let book: Book | null = null;
      await act(async () => {
        book = await result.current.searchByISBN('');
      });

      expect(mockBookAPI.searchByISBN).not.toHaveBeenCalled();
      expect(book).toBe(null);
    });

    test('handles ISBN search errors', async () => {
      const error = {
        response: {
          data: {
            message: 'Book not found',
          },
        },
      };

      mockBookAPI.searchByISBN.mockRejectedValue(error);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      let book: Book | null = null;
      await act(async () => {
        book = await result.current.searchByISBN('invalid');
      });

      expect(book).toBe(null);
      expect(result.current.error).toBe('Book not found');
    });
  });

  describe('clearSearch', () => {
    test('clears search results and state', async () => {
      const mockResponse = {
        books: mockBooks,
        total: 2,
        page: 1,
        hasMore: false,
      };

      mockBookAPI.searchBooks.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      // First, do a search
      await act(async () => {
        await result.current.searchBooks('query');
      });

      expect(result.current.books).toHaveLength(2);
      expect(result.current.totalCount).toBe(2);

      // Then clear
      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.books).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('loadMore', () => {
    test('loads next page when hasMore is true', async () => {
      const page1Response = {
        books: mockBooks,
        total: 4,
        page: 1,
        hasMore: true,
      };

      const page2Response = {
        books: [{ id: 3, title: 'Book 3', authors: [] }],
        total: 4,
        page: 2,
        hasMore: false,
      };

      mockBookAPI.searchBooks
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      // Initial search
      await act(async () => {
        await result.current.searchBooks('query');
      });

      expect(result.current.books).toHaveLength(2);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.currentPage).toBe(1);

      // Load more
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.books).toHaveLength(3);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.currentPage).toBe(2);
    });

    test('does not load more when hasMore is false', async () => {
      const mockResponse = {
        books: mockBooks,
        total: 2,
        page: 1,
        hasMore: false,
      };

      mockBookAPI.searchBooks.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await result.current.searchBooks('query');
      });

      const callCount = mockBookAPI.searchBooks.mock.calls.length;

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockBookAPI.searchBooks).toHaveBeenCalledTimes(callCount);
    });

    test('does not load more when already loading', async () => {
      let resolveSearch: (value: any) => void;
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve;
      });

      mockBookAPI.searchBooks.mockReturnValue(searchPromise);

      const { result } = renderHook(() => useBookSearch(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      // Start initial search
      act(() => {
        result.current.searchBooks('query');
      });

      // Try to load more while loading
      await act(async () => {
        await result.current.loadMore();
      });

      // Should only have been called once
      expect(mockBookAPI.searchBooks).toHaveBeenCalledTimes(1);

      // Resolve the promise to clean up
      await act(async () => {
        resolveSearch!({
          books: mockBooks,
          total: 2,
          page: 1,
          hasMore: false,
        });
        await searchPromise;
      });
    });
  });
});
