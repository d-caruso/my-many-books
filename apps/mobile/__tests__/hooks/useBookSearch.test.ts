import { renderHook, act } from '@testing-library/react-native';
import { useBookSearch } from '@/hooks/useBookSearch';
import { bookAPI } from '@my-many-books/shared-api';

// Mock bookAPI
const mockBookAPI = bookAPI as jest.Mocked<typeof bookAPI>;

describe('useBookSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchBooks', () => {
    it('should search books successfully', async () => {
      const mockSearchResults = {
        books: [
          { id: 1, title: 'Search Result 1', status: 'reading' },
          { id: 2, title: 'Search Result 2', status: 'completed' },
        ],
        total: 2,
        hasMore: false,
      };
      
      mockBookAPI.searchBooks.mockResolvedValue(mockSearchResults as any);

      const { result } = renderHook(() => useBookSearch());

      await act(async () => {
        await result.current.searchBooks('test query');
      });

      expect(result.current.books).toEqual(mockSearchResults.books);
      expect(result.current.totalCount).toBe(2);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(mockBookAPI.searchBooks).toHaveBeenCalledWith({
        q: 'test query',
        page: 1,
        limit: 20,
      });
    });

    it('should handle search with filters', async () => {
      const mockSearchResults = {
        books: [],
        total: 0,
        hasMore: false,
      };
      
      mockBookAPI.searchBooks.mockResolvedValue(mockSearchResults as any);

      const { result } = renderHook(() => useBookSearch());

      await act(async () => {
        await result.current.searchBooks('test', { categoryId: 1, authorId: 2 });
      });

      expect(mockBookAPI.searchBooks).toHaveBeenCalledWith({
        q: 'test',
        page: 1,
        limit: 20,
        categoryId: 1,
        authorId: 2,
      });
    });

    it('should clear books for empty query', async () => {
      const { result } = renderHook(() => useBookSearch());

      await act(async () => {
        await result.current.searchBooks('');
      });

      expect(result.current.books).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(mockBookAPI.searchBooks).not.toHaveBeenCalled();
    });

    it('should handle search error', async () => {
      const errorMessage = 'Search failed';
      mockBookAPI.searchBooks.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      const { result } = renderHook(() => useBookSearch());

      await act(async () => {
        await result.current.searchBooks('test query');
      });

      expect(result.current.books).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should append results for pagination', async () => {
      const page1Results = {
        books: [{ id: 1, title: 'Book 1', status: 'reading' }],
        total: 3,
        hasMore: true,
      };
      
      const page2Results = {
        books: [{ id: 2, title: 'Book 2', status: 'completed' }],
        total: 3,
        hasMore: false,
      };
      
      mockBookAPI.searchBooks
        .mockResolvedValueOnce(page1Results as any)
        .mockResolvedValueOnce(page2Results as any);

      const { result } = renderHook(() => useBookSearch());

      // First page
      await act(async () => {
        await result.current.searchBooks('test', {}, 1);
      });

      expect(result.current.books).toHaveLength(1);

      // Second page
      await act(async () => {
        await result.current.searchBooks('test', {}, 2);
      });

      expect(result.current.books).toHaveLength(2);
      expect(result.current.books).toEqual([
        page1Results.books[0],
        page2Results.books[0],
      ]);
    });
  });

  describe('searchByISBN', () => {
    it('should search by ISBN successfully', async () => {
      const mockBook = { id: 1, title: 'ISBN Book', isbnCode: '9781234567890' };
      mockBookAPI.searchByIsbn.mockResolvedValue({ book: mockBook } as any);

      const { result } = renderHook(() => useBookSearch());

      let searchResult;
      await act(async () => {
        searchResult = await result.current.searchByISBN('9781234567890');
      });

      expect(searchResult).toEqual(mockBook);
      expect(mockBookAPI.searchByIsbn).toHaveBeenCalledWith('9781234567890');
    });

    it('should handle ISBN search with no results', async () => {
      mockBookAPI.searchByIsbn.mockResolvedValue({ book: null } as any);

      const { result } = renderHook(() => useBookSearch());

      let searchResult;
      await act(async () => {
        searchResult = await result.current.searchByISBN('9781234567890');
      });

      expect(searchResult).toBe(null);
    });

    it('should return null for empty ISBN', async () => {
      const { result } = renderHook(() => useBookSearch());

      let searchResult;
      await act(async () => {
        searchResult = await result.current.searchByISBN('');
      });

      expect(searchResult).toBe(null);
      expect(mockBookAPI.searchByIsbn).not.toHaveBeenCalled();
    });

    it('should handle ISBN search error', async () => {
      const errorMessage = 'Book not found';
      mockBookAPI.searchByIsbn.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      const { result } = renderHook(() => useBookSearch());

      let searchResult;
      await act(async () => {
        searchResult = await result.current.searchByISBN('9781234567890');
      });

      expect(searchResult).toBe(null);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('loadMore', () => {
    it('should load more results', async () => {
      const initialResults = {
        books: [{ id: 1, title: 'Book 1', status: 'reading' }],
        total: 2,
        hasMore: true,
      };
      
      const moreResults = {
        books: [{ id: 2, title: 'Book 2', status: 'completed' }],
        total: 2,
        hasMore: false,
      };
      
      mockBookAPI.searchBooks
        .mockResolvedValueOnce(initialResults as any)
        .mockResolvedValueOnce(moreResults as any);

      const { result } = renderHook(() => useBookSearch());

      // Initial search
      await act(async () => {
        await result.current.searchBooks('test');
      });

      expect(result.current.books).toHaveLength(1);
      expect(result.current.hasMore).toBe(true);

      // Load more
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.books).toHaveLength(2);
      expect(result.current.hasMore).toBe(false);
    });

    it('should not load more when hasMore is false', async () => {
      const { result } = renderHook(() => useBookSearch());

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockBookAPI.searchBooks).not.toHaveBeenCalled();
    });

    it('should not load more when loading', async () => {
      mockBookAPI.searchBooks.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ books: [], total: 0, hasMore: false }), 100))
      );

      const { result } = renderHook(() => useBookSearch());

      // Start a search (which will be loading)
      const searchPromise = act(async () => {
        await result.current.searchBooks('test');
      });

      // Try to load more while loading
      await act(async () => {
        await result.current.loadMore();
      });

      // Wait for the original search to complete
      await searchPromise;

      expect(mockBookAPI.searchBooks).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearSearch', () => {
    it('should clear search results', async () => {
      const mockSearchResults = {
        books: [{ id: 1, title: 'Book 1', status: 'reading' }],
        total: 1,
        hasMore: false,
      };
      
      mockBookAPI.searchBooks.mockResolvedValue(mockSearchResults as any);

      const { result } = renderHook(() => useBookSearch());

      // Search first
      await act(async () => {
        await result.current.searchBooks('test');
      });

      expect(result.current.books).toHaveLength(1);

      // Clear search
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
});