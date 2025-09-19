import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBooks } from '@/hooks/useBooks';
import { bookAPI } from '@/services/api';
import { Book } from '@/types';

// Mock dependencies
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockBookAPI = bookAPI as jest.Mocked<typeof bookAPI>;

// Test component for book management
const TestBookComponent = () => {
  const {
    books,
    loading,
    error,
    createBook,
    updateBook,
    deleteBook,
    updateBookStatus,
    refreshBooks
  } = useBooks();

  const handleCreateBook = () => {
    createBook({
      title: 'New Book',
      isbnCode: '1234567890',
      status: 'want-to-read'
    });
  };

  const handleUpdateBook = () => {
    if (books.length > 0) {
      updateBook(books[0].id, { title: 'Updated Book' });
    }
  };

  const handleDeleteBook = () => {
    if (books.length > 0) {
      deleteBook(books[0].id);
    }
  };

  const handleUpdateStatus = () => {
    if (books.length > 0) {
      updateBookStatus(books[0].id, 'completed');
    }
  };

  return (
    <>
      {loading && <text testID="loading">Loading...</text>}
      {error && <text testID="error">{error}</text>}
      <text testID="book-count">{books.length}</text>
      {books.map(book => (
        <text key={book.id} testID={`book-${book.id}`}>
          {book.title} - {book.status}
        </text>
      ))}
      <text testID="create-book" onPress={handleCreateBook}>Create Book</text>
      <text testID="update-book" onPress={handleUpdateBook}>Update Book</text>
      <text testID="delete-book" onPress={handleDeleteBook}>Delete Book</text>
      <text testID="update-status" onPress={handleUpdateStatus}>Update Status</text>
      <text testID="refresh-books" onPress={refreshBooks}>Refresh</text>
    </>
  );
};

describe('Book Management Integration', () => {
  const mockBooks: Book[] = [
    {
      id: 1,
      title: 'Test Book 1',
      isbnCode: '1111111111',
      status: 'reading',
      authors: [],
      categories: [],
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      title: 'Test Book 2',
      isbnCode: '2222222222',
      status: 'completed',
      authors: [],
      categories: [],
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  it('should manage complete book lifecycle', async () => {
    // Initial load
    mockBookAPI.getBooks.mockResolvedValue({ books: mockBooks } as any);

    const { getByTestId } = render(<TestBookComponent />);

    // Should load books on mount
    await waitFor(() => {
      expect(getByTestId('book-count')).toHaveTextContent('2');
    });

    expect(getByTestId('book-1')).toHaveTextContent('Test Book 1 - reading');
    expect(getByTestId('book-2')).toHaveTextContent('Test Book 2 - completed');

    // Create new book
    const newBook = {
      id: 3,
      title: 'New Book',
      isbnCode: '1234567890',
      status: 'want-to-read' as const,
      authors: [],
      categories: [],
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };

    mockBookAPI.createBook.mockResolvedValue(newBook as any);

    fireEvent.press(getByTestId('create-book'));

    await waitFor(() => {
      expect(getByTestId('book-count')).toHaveTextContent('3');
    });

    expect(mockBookAPI.createBook).toHaveBeenCalledWith({
      title: 'New Book',
      isbnCode: '1234567890',
      status: 'want-to-read'
    });

    // Update book
    const updatedBook = { ...mockBooks[0], title: 'Updated Book' };
    mockBookAPI.updateBook.mockResolvedValue(updatedBook as any);

    fireEvent.press(getByTestId('update-book'));

    await waitFor(() => {
      expect(getByTestId('book-1')).toHaveTextContent('Updated Book - reading');
    });

    expect(mockBookAPI.updateBook).toHaveBeenCalledWith(1, { title: 'Updated Book' });

    // Update book status
    mockBookAPI.updateBook.mockResolvedValue(undefined);

    fireEvent.press(getByTestId('update-status'));

    await waitFor(() => {
      expect(getByTestId('book-1')).toHaveTextContent('Updated Book - completed');
    });

    expect(mockBookAPI.updateBook).toHaveBeenCalledWith(1, { status: 'completed' });

    // Delete book
    mockBookAPI.deleteBook.mockResolvedValue(undefined);

    fireEvent.press(getByTestId('delete-book'));

    await waitFor(() => {
      expect(getByTestId('book-count')).toHaveTextContent('2');
    });

    expect(mockBookAPI.deleteBook).toHaveBeenCalledWith(1);
  });

  it('should handle offline caching', async () => {
    // Setup cached books
    const cachedBooks = JSON.stringify(mockBooks);
    mockAsyncStorage.getItem.mockResolvedValue(cachedBooks);

    const { getByTestId } = render(<TestBookComponent />);

    // Should load cached books immediately
    await waitFor(() => {
      expect(getByTestId('book-count')).toHaveTextContent('2');
    });

    // Should also fetch fresh data
    mockBookAPI.getBooks.mockResolvedValue({ books: mockBooks } as any);

    await waitFor(() => {
      expect(mockBookAPI.getBooks).toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockBookAPI.getBooks.mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(<TestBookComponent />);

    await waitFor(() => {
      expect(getByTestId('error')).toHaveTextContent('Network error');
    });
  });

  it('should refresh books on demand', async () => {
    mockBookAPI.getBooks
      .mockResolvedValueOnce({ books: mockBooks } as any)
      .mockResolvedValueOnce({ books: [...mockBooks, { 
        id: 3, 
        title: 'Refreshed Book',
        isbnCode: '3333333333',
        status: 'want-to-read' as const,
        authors: [],
        categories: [],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      }] } as any);

    const { getByTestId } = render(<TestBookComponent />);

    // Initial load
    await waitFor(() => {
      expect(getByTestId('book-count')).toHaveTextContent('2');
    });

    // Refresh
    fireEvent.press(getByTestId('refresh-books'));

    await waitFor(() => {
      expect(getByTestId('book-count')).toHaveTextContent('3');
    });

    expect(mockBookAPI.getBooks).toHaveBeenCalledTimes(2);
  });
});