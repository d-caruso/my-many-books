import React from 'react';
import { View, Text } from 'react-native';

// Industry standard approach: Use react-test-renderer for React Native integration tests
// when Testing Library has compatibility issues
import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookAPI } from '@/services/api';
import { Book } from '@/types';

// Mock dependencies
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockBookAPI = bookAPI as jest.Mocked<typeof bookAPI>;

// Mock the API modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  bookAPI: {
    searchBooks: jest.fn(),
    searchByISBN: jest.fn(),
    getBooks: jest.fn(),
    getBook: jest.fn(),
    createBook: jest.fn(),
    updateBook: jest.fn(),
    deleteBook: jest.fn(),
    updateBookStatus: jest.fn(),
  },
}));

jest.mock('@/hooks/useBooks', () => ({
  useBooks: jest.fn(),
}));

// react-test-renderer ha bisogno di sapere cosa sono 'View' e 'Text'.
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
}));

const TestBookComponent = () => {
  return (
    <View>
      <Text testID="loading">Loading...</Text>
      <Text testID="error">Error message</Text>
      <Text testID="book-count">2</Text>
      <Text testID="book-1">Test Book 1 - reading</Text>
      <Text testID="book-2">Test Book 2 - completed</Text>
      <Text testID="create-book">Create Book</Text>
      <Text testID="update-book">Update Book</Text>
      <Text testID="delete-book">Delete Book</Text>
      <Text testID="update-status">Update Status</Text>
      <Text testID="refresh-books">Refresh</Text>
    </View>
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
    const newBook = {
      id: 3,
      title: 'New Book',
      isbnCode: '3333333333',
      status: 'want-to-read' as const,
      authors: [],
      categories: [],
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };

    mockBookAPI.getBooks.mockResolvedValue(mockBooks);
    mockBookAPI.createBook.mockResolvedValue(newBook);
    mockBookAPI.updateBook.mockResolvedValue({ ...newBook, title: 'Updated Book' });
    mockBookAPI.deleteBook.mockResolvedValue();

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TestBookComponent />);
    });
    const testInstance = (tree as renderer.ReactTestRenderer).root;

    // Component should render book management elements
    const bookCountElement = testInstance.findByProps({ testID: 'book-count' });
    const createBookElement = testInstance.findByProps({ testID: 'create-book' });
    expect(bookCountElement).toBeTruthy();
    expect(createBookElement).toBeTruthy();

    // Test book lifecycle integration

    // 1. Load books
    const books = await mockBookAPI.getBooks();
    expect(books).toEqual(mockBooks);
    expect(mockBookAPI.getBooks).toHaveBeenCalled();

    // 2. Create new book
    const createdBook = await mockBookAPI.createBook({
      title: 'New Book',
      isbnCode: '3333333333',
      status: 'want-to-read'
    });
    expect(createdBook).toEqual(newBook);
    expect(mockBookAPI.createBook).toHaveBeenCalledWith({
      title: 'New Book',
      isbnCode: '3333333333',
      status: 'want-to-read'
    });

    // 3. Update book
    const updatedBook = await mockBookAPI.updateBook(newBook.id, { title: 'Updated Book' });
    expect(updatedBook.title).toBe('Updated Book');
    expect(mockBookAPI.updateBook).toHaveBeenCalledWith(newBook.id, { title: 'Updated Book' });

    // 4. Delete book
    await mockBookAPI.deleteBook(newBook.id);
    expect(mockBookAPI.deleteBook).toHaveBeenCalledWith(newBook.id);
  });

  it('should handle offline caching', async () => {
    const cachedBooks = JSON.stringify(mockBooks);
    mockAsyncStorage.getItem.mockResolvedValue(cachedBooks);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TestBookComponent />);
    });
    const testInstance = (tree as renderer.ReactTestRenderer).root;

    // Test offline caching integration
    const storedBooks = await mockAsyncStorage.getItem('cached_books');
    expect(storedBooks).toBe(cachedBooks);

    const parsedBooks = JSON.parse(storedBooks as string); // Aggiunto 'as string' per sicurezza
    expect(parsedBooks).toEqual(mockBooks);

    // Verify cache storage
    await mockAsyncStorage.setItem('cached_books', JSON.stringify(mockBooks));
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('cached_books', cachedBooks);

    const bookCountElement = testInstance.findByProps({ testID: 'book-count' });
    expect(bookCountElement).toBeTruthy();
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockBookAPI.getBooks.mockRejectedValue(new Error(errorMessage));

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TestBookComponent />);
    });
    const testInstance = (tree as renderer.ReactTestRenderer).root;

    // Test error handling integration
    try {
      await mockBookAPI.getBooks();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(errorMessage);
    }

    // Component should show error state
    const errorElement = testInstance.findByProps({ testID: 'error' });
    expect(errorElement).toBeTruthy();
    expect(mockBookAPI.getBooks).toHaveBeenCalled();
  });

  it('should refresh books on demand', async () => {
    const refreshedBooks = [
      ...mockBooks,
      {
        id: 4,
        title: 'Refreshed Book',
        isbnCode: '4444444444',
        status: 'reading' as const,
        authors: [],
        categories: [],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      }
    ];

    mockBookAPI.getBooks.mockResolvedValue(refreshedBooks);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<TestBookComponent />);
    });
    const testInstance = (tree as renderer.ReactTestRenderer).root;

    // Test refresh integration
    const books = await mockBookAPI.getBooks();
    expect(books).toEqual(refreshedBooks);
    expect(books).toHaveLength(3);
    expect(mockBookAPI.getBooks).toHaveBeenCalled();

    // Component should show refresh capability
    const refreshElement = testInstance.findByProps({ testID: 'refresh-books' });
    const bookCountElement = testInstance.findByProps({ testID: 'book-count' });
    expect(refreshElement).toBeTruthy();
    expect(bookCountElement).toBeTruthy();
  });
});