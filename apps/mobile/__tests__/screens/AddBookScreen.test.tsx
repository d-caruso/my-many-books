import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import AddBookScreen from '../../app/book/add';
import { useBooks } from '@/hooks/useBooks';
import { useBookSearch } from '@/hooks/useBookSearch';

// Mock dependencies
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('@/hooks/useBooks');
jest.mock('@/hooks/useBookSearch');

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  Text: ({ children, ...props }: any) => 
    React.createElement('text', props, children),
  TextInput: ({ onChangeText, testID, label, ...props }: any) => 
    React.createElement('textInput', { 
      onChangeText, 
      testID: testID || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`,
      placeholder: label,
      ...props 
    }),
  Button: ({ children, onPress, testID, mode, loading }: any) => 
    React.createElement('text', { 
      onPress, 
      testID: testID || `button-${children?.toLowerCase().replace(/\s+/g, '-')}`,
      disabled: loading
    }, children),
  Card: {
    Content: ({ children }: any) => React.createElement('view', {}, children),
  },
  SegmentedButtons: ({ value, onValueChange, buttons, testID }: any) => 
    React.createElement('view', { testID: testID || 'segmented-buttons' }, 
      buttons.map((button: any, index: number) => 
        React.createElement('text', {
          key: button.value,
          onPress: () => onValueChange(button.value),
          testID: `segment-${button.value}`,
          'data-selected': value === button.value
        }, button.label)
      )
    ),
}));

const mockUseBooks = useBooks as jest.MockedFunction<typeof useBooks>;
const mockUseBookSearch = useBookSearch as jest.MockedFunction<typeof useBookSearch>;

describe('AddBookScreen', () => {
  const mockCreateBook = jest.fn();
  const mockSearchByISBN = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseBooks.mockReturnValue({
      books: [],
      loading: false,
      error: null,
      refreshing: false,
      loadBooks: jest.fn(),
      refreshBooks: jest.fn(),
      createBook: mockCreateBook,
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
    });

    mockUseBookSearch.mockReturnValue({
      searchBooks: jest.fn(),
      searchByISBN: mockSearchByISBN,
      loading: false,
      error: null,
      results: [],
    });
  });

  it('should render add book form', () => {
    const { getByTestId } = render(<AddBookScreen />);

    expect(getByTestId('input-title-*')).toBeTruthy();
    expect(getByTestId('input-author')).toBeTruthy();
    expect(getByTestId('input-isbn-(optional)')).toBeTruthy();
    expect(getByTestId('segmented-buttons')).toBeTruthy();
    expect(getByTestId('button-add-book')).toBeTruthy();
    expect(getByTestId('button-cancel')).toBeTruthy();
  });

  it('should validate required fields', async () => {
    const { getByTestId, getByText } = render(<AddBookScreen />);

    // Try to submit without title
    fireEvent.press(getByTestId('button-add-book'));

    await waitFor(() => {
      expect(getByText('Title is required')).toBeTruthy();
    });

    expect(mockCreateBook).not.toHaveBeenCalled();
  });

  it('should create book with valid data', async () => {
    const mockBook = {
      id: 1,
      title: 'Test Book',
      isbnCode: '1234567890',
      status: 'want-to-read',
      authors: [],
      categories: [],
    };

    mockCreateBook.mockResolvedValue(mockBook as any);

    const { getByTestId } = render(<AddBookScreen />);

    // Fill in the form
    fireEvent.changeText(getByTestId('input-title-*'), 'Test Book');
    fireEvent.changeText(getByTestId('input-author'), 'Test Author');
    fireEvent.changeText(getByTestId('input-isbn-(optional)'), '1234567890');
    fireEvent.press(getByTestId('segment-reading'));

    // Submit
    fireEvent.press(getByTestId('button-add-book'));

    await waitFor(() => {
      expect(mockCreateBook).toHaveBeenCalledWith({
        title: 'Test Book',
        isbnCode: '1234567890',
        status: 'reading',
        notes: '',
      });
    });

    expect(router.back).toHaveBeenCalled();
  });

  it('should handle ISBN lookup', async () => {
    const mockBookData = {
      title: 'Found Book',
      authors: [{ name: 'Found Author' }],
      isbnCode: '1234567890',
    };

    mockSearchByISBN.mockResolvedValue(mockBookData as any);

    const { getByTestId } = render(<AddBookScreen />);

    // Enter ISBN and lookup
    fireEvent.changeText(getByTestId('input-isbn-(optional)'), '1234567890');
    fireEvent.press(getByTestId('button-lookup'));

    await waitFor(() => {
      expect(mockSearchByISBN).toHaveBeenCalledWith('1234567890');
    });

    // Check if form was populated
    expect(getByTestId('input-title-*').props.value).toBe('Found Book');
    expect(getByTestId('input-author').props.value).toBe('Found Author');
  });

  it('should handle ISBN lookup error', async () => {
    mockSearchByISBN.mockRejectedValue(new Error('Book not found'));

    const { getByTestId, getByText } = render(<AddBookScreen />);

    fireEvent.changeText(getByTestId('input-isbn-(optional)'), '1234567890');
    fireEvent.press(getByTestId('button-lookup'));

    await waitFor(() => {
      expect(getByText('Book not found')).toBeTruthy();
    });
  });

  it('should handle status selection', () => {
    const { getByTestId } = render(<AddBookScreen />);

    // Select reading status
    fireEvent.press(getByTestId('segment-reading'));
    expect(getByTestId('segment-reading').props['data-selected']).toBe(true);

    // Select completed status
    fireEvent.press(getByTestId('segment-completed'));
    expect(getByTestId('segment-completed').props['data-selected']).toBe(true);
  });

  it('should handle cancel action', () => {
    const { getByTestId } = render(<AddBookScreen />);

    fireEvent.press(getByTestId('button-cancel'));

    expect(router.back).toHaveBeenCalled();
  });

  it('should handle creation error', async () => {
    mockCreateBook.mockRejectedValue(new Error('Failed to create book'));

    const { getByTestId, getByText } = render(<AddBookScreen />);

    fireEvent.changeText(getByTestId('input-title-*'), 'Test Book');
    fireEvent.press(getByTestId('button-add-book'));

    await waitFor(() => {
      expect(getByText('Failed to create book')).toBeTruthy();
    });
  });
});
