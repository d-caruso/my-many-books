import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BooksScreen from '../../app/(tabs)/index';
import { useBooks } from '@/hooks/useBooks';
import { useBookSearch } from '@/hooks/useBookSearch';

// Mock the hooks
jest.mock('@/hooks/useBooks');
jest.mock('@/hooks/useBookSearch');

const mockUseBooks = useBooks as jest.MockedFunction<typeof useBooks>;
const mockUseBookSearch = useBookSearch as jest.MockedFunction<typeof useBookSearch>;

// Mock react-native-paper components with proper testIDs
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  
  return {
    ...jest.requireActual('react-native-paper'),
    FAB: ({ onPress, testID = 'fab' }: any) => 
      React.createElement(TouchableOpacity, { onPress, testID }),
    Searchbar: ({ onChangeText, testID = 'searchbar', placeholder }: any) => 
      React.createElement(TextInput, { 
        onChangeText, 
        testID, 
        placeholder,
        accessibilityLabel: placeholder
      }),
    Chip: ({ children, onPress, testID = 'chip' }: any) => 
      React.createElement(TouchableOpacity, { onPress, testID }, 
        React.createElement(Text, {}, children)
      ),
  };
});

const mockBooks = [
  {
    id: 1,
    title: 'Test Book 1',
    status: 'reading',
    authors: [{ id: 1, name: 'Author 1', books: [] }],
    categories: [],
    isbnCode: '123',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: 2,
    title: 'Test Book 2',
    status: 'completed',
    authors: [{ id: 2, name: 'Author 2', books: [] }],
    categories: [],
    isbnCode: '456',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
];

describe('BooksScreen', () => {
  const mockRefreshBooks = jest.fn();
  const mockUpdateBookStatus = jest.fn();
  const mockDeleteBook = jest.fn();
  const mockSearchBooks = jest.fn();
  const mockClearSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseBooks.mockReturnValue({
      books: mockBooks,
      loading: false,
      error: null,
      refreshing: false,
      loadBooks: jest.fn(),
      refreshBooks: mockRefreshBooks,
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: mockDeleteBook,
      updateBookStatus: mockUpdateBookStatus,
    });

    mockUseBookSearch.mockReturnValue({
      books: [],
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 0,
      currentPage: 1,
      searchBooks: mockSearchBooks,
      searchByISBN: jest.fn(),
      clearSearch: mockClearSearch,
      loadMore: jest.fn(),
    });
  });

  it('should render books list correctly', () => {
    const { getByText } = render(<BooksScreen />);

    expect(getByText('My Books')).toBeTruthy();
    expect(getByText('Test Book 1')).toBeTruthy();
    expect(getByText('Test Book 2')).toBeTruthy();
  });

  it('should show search bar', () => {
    const { getByTestId } = render(<BooksScreen />);

    const searchbar = getByTestId('searchbar');
    expect(searchbar).toBeTruthy();
  });

  it('should show FAB for adding books', () => {
    const { getByTestId } = render(<BooksScreen />);

    const fab = getByTestId('fab');
    expect(fab).toBeTruthy();
  });

  it('should handle search input', () => {
    const { getByTestId } = render(<BooksScreen />);

    const searchbar = getByTestId('searchbar');
    fireEvent.changeText(searchbar, 'test query');

    expect(mockSearchBooks).toHaveBeenCalledWith('test query');
  });

  it('should clear search when search query is empty', () => {
    const { getByTestId } = render(<BooksScreen />);

    const searchbar = getByTestId('searchbar');
    fireEvent.changeText(searchbar, '');

    expect(mockClearSearch).toHaveBeenCalled();
  });

  it('should show search results when searching', () => {
    const searchResults = [
      {
        id: 3,
        title: 'Search Result',
        status: 'want-to-read',
        authors: [{ id: 3, name: 'Search Author', books: [] }],
        categories: [],
        isbnCode: '789',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      },
    ];

    mockUseBookSearch.mockReturnValue({
      books: searchResults,
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 1,
      currentPage: 1,
      searchBooks: mockSearchBooks,
      searchByISBN: jest.fn(),
      clearSearch: mockClearSearch,
      loadMore: jest.fn(),
    });

    const { getByText, getByTestId } = render(<BooksScreen />);

    // Simulate search
    const searchbar = getByTestId('searchbar');
    fireEvent.changeText(searchbar, 'search');

    expect(getByText('Search Result')).toBeTruthy();
  });

  it('should show clear search chip when searching', async () => {
    mockUseBookSearch.mockReturnValue({
      books: [],
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 0,
      currentPage: 1,
      searchBooks: mockSearchBooks,
      searchByISBN: jest.fn(),
      clearSearch: mockClearSearch,
      loadMore: jest.fn(),
    });

    const { getByTestId, getByText } = render(<BooksScreen />);

    // Simulate search
    const searchbar = getByTestId('searchbar');
    fireEvent.changeText(searchbar, 'test');

    await waitFor(() => {
      expect(getByText('Clear search')).toBeTruthy();
    });
  });

  it('should handle clear search chip press', async () => {
    mockUseBookSearch.mockReturnValue({
      books: [],
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 0,
      currentPage: 1,
      searchBooks: mockSearchBooks,
      searchByISBN: jest.fn(),
      clearSearch: mockClearSearch,
      loadMore: jest.fn(),
    });

    const { getByTestId, getByText } = render(<BooksScreen />);

    // Simulate search
    const searchbar = getByTestId('searchbar');
    fireEvent.changeText(searchbar, 'test');

    await waitFor(() => {
      const clearChip = getByText('Clear search');
      fireEvent.press(clearChip);
    });

    expect(mockClearSearch).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    mockUseBooks.mockReturnValue({
      books: [],
      loading: true,
      error: null,
      refreshing: false,
      loadBooks: jest.fn(),
      refreshBooks: mockRefreshBooks,
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: mockDeleteBook,
      updateBookStatus: mockUpdateBookStatus,
    });

    const { getByTestId } = render(<BooksScreen />);

    expect(getByTestId('loading')).toBeTruthy();
  });

  it('should show error message', () => {
    const errorMessage = 'Failed to load books';
    
    mockUseBooks.mockReturnValue({
      books: [],
      loading: false,
      error: errorMessage,
      refreshing: false,
      loadBooks: jest.fn(),
      refreshBooks: mockRefreshBooks,
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: mockDeleteBook,
      updateBookStatus: mockUpdateBookStatus,
    });

    const { getByText } = render(<BooksScreen />);

    expect(getByText(errorMessage)).toBeTruthy();
  });

  it('should show empty state when no books', () => {
    mockUseBooks.mockReturnValue({
      books: [],
      loading: false,
      error: null,
      refreshing: false,
      loadBooks: jest.fn(),
      refreshBooks: mockRefreshBooks,
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: mockDeleteBook,
      updateBookStatus: mockUpdateBookStatus,
    });

    const { getByText } = render(<BooksScreen />);

    expect(getByText('No books yet')).toBeTruthy();
    expect(getByText('Add your first book to get started')).toBeTruthy();
  });

  it('should show search empty state', () => {
    mockUseBookSearch.mockReturnValue({
      books: [],
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 0,
      currentPage: 1,
      searchBooks: mockSearchBooks,
      searchByISBN: jest.fn(),
      clearSearch: mockClearSearch,
      loadMore: jest.fn(),
    });

    const { getByTestId, getByText } = render(<BooksScreen />);

    // Simulate search
    const searchbar = getByTestId('searchbar');
    fireEvent.changeText(searchbar, 'nonexistent');

    expect(getByText('No books found')).toBeTruthy();
    expect(getByText('Try a different search term')).toBeTruthy();
  });
});