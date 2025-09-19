import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBooks } from '@/hooks/useBooks';
import { bookAPI } from '@my-many-books/shared-api';

// Mock AsyncStorage
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock bookAPI
const mockBookAPI = bookAPI as jest.Mocked<typeof bookAPI>;

describe('useBooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  describe('loadBooks', () => {
    it('should load books successfully', async () => {
      const mockBooks = [
        { id: 1, title: 'Test Book 1', status: 'reading' },
        { id: 2, title: 'Test Book 2', status: 'completed' },
      ];
      
      mockBookAPI.getBooks.mockResolvedValue({ books: mockBooks } as any);

      const { result } = renderHook(() => useBooks());

      expect(result.current.loading).toBe(false);
      
      await act(async () => {
        await result.current.loadBooks();
      });

      expect(result.current.books).toEqual(mockBooks);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_books', 
        JSON.stringify(mockBooks)
      );
    });

    it('should handle load books error', async () => {
      const errorMessage = 'Failed to load books';
      mockBookAPI.getBooks.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      const { result } = renderHook(() => useBooks());

      await act(async () => {
        await result.current.loadBooks();
      });

      expect(result.current.books).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('createBook', () => {
    it('should create book successfully', async () => {
      const newBook = { id: 3, title: 'New Book', status: 'want-to-read' };
      const bookData = { title: 'New Book', status: 'want-to-read' };
      
      mockBookAPI.createBook.mockResolvedValue(newBook as any);

      const { result } = renderHook(() => useBooks());

      let createdBook;
      await act(async () => {
        createdBook = await result.current.createBook(bookData);
      });

      expect(createdBook).toEqual(newBook);
      expect(result.current.books).toContain(newBook);
      expect(mockBookAPI.createBook).toHaveBeenCalledWith(bookData);
    });

    it('should handle create book error', async () => {
      const errorMessage = 'Failed to create book';
      mockBookAPI.createBook.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      const { result } = renderHook(() => useBooks());

      await act(async () => {
        try {
          await result.current.createBook({ title: 'Test' });
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });
    });
  });

  describe('updateBook', () => {
    it('should update book successfully', async () => {
      const existingBooks = [
        { id: 1, title: 'Book 1', status: 'reading' },
        { id: 2, title: 'Book 2', status: 'completed' },
      ];
      
      const updatedBook = { id: 1, title: 'Updated Book 1', status: 'completed' };
      
      mockBookAPI.getBooks.mockResolvedValue({ books: existingBooks } as any);
      mockBookAPI.updateBook.mockResolvedValue(updatedBook as any);

      const { result } = renderHook(() => useBooks());

      // Load initial books
      await act(async () => {
        await result.current.loadBooks();
      });

      // Update book
      await act(async () => {
        await result.current.updateBook(1, { title: 'Updated Book 1', status: 'completed' });
      });

      expect(result.current.books).toContainEqual(updatedBook);
      expect(result.current.books.find(b => b.id === 1)).toEqual(updatedBook);
    });
  });

  describe('deleteBook', () => {
    it('should delete book successfully', async () => {
      const existingBooks = [
        { id: 1, title: 'Book 1', status: 'reading' },
        { id: 2, title: 'Book 2', status: 'completed' },
      ];
      
      mockBookAPI.getBooks.mockResolvedValue({ books: existingBooks } as any);
      mockBookAPI.deleteBook.mockResolvedValue();

      const { result } = renderHook(() => useBooks());

      // Load initial books
      await act(async () => {
        await result.current.loadBooks();
      });

      // Delete book
      await act(async () => {
        await result.current.deleteBook(1);
      });

      expect(result.current.books).toHaveLength(1);
      expect(result.current.books.find(b => b.id === 1)).toBeUndefined();
      expect(mockBookAPI.deleteBook).toHaveBeenCalledWith(1);
    });
  });

  describe('updateBookStatus', () => {
    it('should update book status successfully', async () => {
      const existingBooks = [
        { id: 1, title: 'Book 1', status: 'reading' },
      ];
      
      mockBookAPI.getBooks.mockResolvedValue({ books: existingBooks } as any);
      mockBookAPI.updateBook.mockResolvedValue();

      const { result } = renderHook(() => useBooks());

      // Load initial books
      await act(async () => {
        await result.current.loadBooks();
      });

      // Update book status
      await act(async () => {
        await result.current.updateBookStatus(1, 'completed');
      });

      const updatedBook = result.current.books.find(b => b.id === 1);
      expect(updatedBook?.status).toBe('completed');
      expect(mockBookAPI.updateBook).toHaveBeenCalledWith(1, { status: 'completed' });
    });
  });

  describe('cached books', () => {
    it('should load cached books on initialization', async () => {
      const cachedBooks = [
        { id: 1, title: 'Cached Book', status: 'reading' },
      ];
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedBooks));

      const { result } = renderHook(() => useBooks());

      // Wait for effect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.books).toEqual(cachedBooks);
    });

    it('should handle cached books parsing error', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');

      const { result } = renderHook(() => useBooks());

      // Wait for effect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.books).toEqual([]);
    });
  });
});