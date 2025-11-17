import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Mock dependencies - using vi.hoisted to ensure mocks are set up before imports
const { mockUseSearchParams, mockUseNavigate, mockUseBookSearch } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(),
  mockUseNavigate: vi.fn(),
  mockUseBookSearch: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: mockUseSearchParams,
  useNavigate: mockUseNavigate,
}));

vi.mock('../../hooks/useBookSearch', () => ({
  useBookSearch: mockUseBookSearch,
}));

// Import after mocks
import BooksPage from '../../pages/BooksPage';
import { ApiProvider } from '../../contexts/ApiContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBookSearch } from '../../hooks/useBookSearch';

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  Button: ({ children, onClick, startIcon, variant, ...props }: any) => (
    <button data-testid={`button-${variant || 'default'}`} onClick={onClick} {...props}>
      {startIcon && <span data-testid="button-icon">{startIcon}</span>}
      {children}
    </button>
  ),
  IconButton: ({ children, onClick, ...props }: any) => (
    <button data-testid="icon-button" onClick={onClick} {...props}>{children}</button>
  ),
  Chip: ({ label, onDelete, ...props }: any) => (
    <div data-testid="chip" onClick={onDelete} {...props}>{label}</div>
  ),
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
}));

vi.mock('@mui/icons-material/Add', () => ({
  default: () => <span data-testid="add-icon">Add</span>,
}));

vi.mock('@mui/icons-material/Clear', () => ({
  default: () => <span data-testid="clear-icon">Clear</span>,
}));

vi.mock('@mui/icons-material/ViewModule', () => ({
  default: () => <span data-testid="grid-icon">Grid</span>,
}));

vi.mock('@mui/icons-material/ViewList', () => ({
  default: () => <span data-testid="list-icon">List</span>,
}));

// Store callbacks for testing
let mockOnStatusChange: any;
let mockFormCancel: any;
let mockDetailsEdit: any;

// Mock components with better callback handling
vi.mock('../../components/Book', () => ({
  BookList: ({ books, onBookSelect, onBookEdit, onBookDelete, viewMode, onStatusChange }: any) => {
    mockOnStatusChange = onStatusChange;
    return (
      <div data-testid="book-list" data-view-mode={viewMode}>
        {books?.map((book: any) => (
          <div key={book.id} data-testid={`book-item-${book.id}`}>
            <button onClick={() => onBookSelect?.(book)} data-testid={`select-${book.id}`}>Select {book.title}</button>
            <button onClick={() => onBookEdit?.(book)} data-testid={`edit-${book.id}`}>Edit {book.title}</button>
            <button onClick={() => onBookDelete?.(book.id)} data-testid={`delete-${book.id}`}>Delete {book.title}</button>
            <button onClick={() => onStatusChange?.(book.id, 'read')} data-testid={`status-${book.id}`}>Mark Read</button>
          </div>
        ))}
      </div>
    );
  },
  BookForm: ({ book, onSubmit, onCancel, loading }: any) => {
    mockFormCancel = onCancel;
    return (
      <div data-testid="book-form" data-loading={loading} data-book-id={book?.id}>
        <button onClick={() => onSubmit({ title: 'Test Book', isbn: '123' })} data-testid="form-submit">Submit</button>
        <button onClick={onCancel} data-testid="form-cancel">Cancel</button>
      </div>
    );
  },
  BookDetails: ({ book, onEdit, onDelete, onClose }: any) => {
    mockDetailsEdit = onEdit;
    return (
      <div data-testid="book-details" data-book-id={book?.id}>
        <h3>{book?.title}</h3>
        <button onClick={() => onEdit?.(book)} data-testid="details-edit">Edit</button>
        <button onClick={() => onDelete?.(book.id)} data-testid="details-delete">Delete</button>
        <button onClick={onClose} data-testid="details-close">Close</button>
      </div>
    );
  },
}));

// Mock callback references for BookSearchForm
const mockOnSearch = vi.fn();
const mockOnClear = vi.fn();

vi.mock('../../components/Search', () => ({
  BookSearchForm: ({ onSearch, loading }: any) => (
    <div data-testid="search-form" data-loading={loading}>
      <button onClick={() => onSearch('test', {})}>Search</button>
      <button onClick={mockOnClear}>Clear</button>
    </div>
  ),
  BookSearchResults: ({ books }: any) => <div data-testid="search-results">{books?.length} results</div>,
  BookSearchPage: () => <div data-testid="search-page">Search Page</div>,
  AuthorAutocomplete: ({ onChange }: any) => <input data-testid="author-autocomplete" onChange={onChange} />,
}));

// Create mock API service
const mockApiService = {
  createBook: vi.fn().mockResolvedValue({ id: 3, title: 'New Book' }),
  updateBook: vi.fn().mockResolvedValue({ id: 1, title: 'Updated Book' }),
  deleteBook: vi.fn().mockResolvedValue({}),
  getBook: vi.fn().mockResolvedValue({ id: 1, title: 'Test Book' }),
  getBooks: vi.fn().mockResolvedValue([]),
  searchBooks: vi.fn(),
  searchByISBN: vi.fn(),
  getCategories: vi.fn(),
  getCategory: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getAuthors: vi.fn(),
  getAuthor: vi.fn(),
  createAuthor: vi.fn(),
  updateAuthor: vi.fn(),
  deleteAuthor: vi.fn(),
  searchAuthors: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
} as any;

describe('BooksPage', () => {
  // Get mocked functions
  const mockUseSearchParams = vi.mocked(useSearchParams);
  const mockUseNavigate = vi.mocked(useNavigate);
  const mockUseBookSearch = vi.mocked(useBookSearch);
  const mockNavigate = vi.fn();
  const mockSetSearchParams = vi.fn();
  const mockSearchParams = new URLSearchParams();

  const mockBookSearchReturn = {
    books: [
      { id: 1, title: 'Test Book 1', isbn: '123' },
      { id: 2, title: 'Test Book 2', isbn: '456' },
    ],
    loading: false,
    error: null,
    totalCount: 2,
    hasMore: false,
    searchBooks: vi.fn(),
    loadMore: vi.fn(),
    clearSearch: vi.fn(),
  };

  // Create test i18n instance
  const testI18n = i18n.createInstance();
  testI18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'pages'],
    defaultNS: 'common',
    resources: {
      en: {
        common: {},
        pages: {
          books: {
            title: 'My Books',
            description: 'Your personal book collection',
            description_with_count_one: '{{count}} book in your library',
            description_with_count_other: '{{count}} books in your library',
            clear_search: 'Clear search',
          },
        },
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });

  // Helper to render with ApiProvider and I18nextProvider
  const renderWithProvider = (ui: React.ReactElement) => {
    return rtlRender(
      <I18nextProvider i18n={testI18n}>
        <ApiProvider apiService={mockApiService}>
          {ui}
        </ApiProvider>
      </I18nextProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseSearchParams.mockReturnValue([mockSearchParams, mockSetSearchParams]);
    
    // Reset to default state
    mockBookSearchReturn.books = [
      { id: 1, title: 'Test Book 1', isbn: '123' },
      { id: 2, title: 'Test Book 2', isbn: '456' },
    ];
    mockBookSearchReturn.loading = false;
    mockBookSearchReturn.error = null;
    mockBookSearchReturn.totalCount = 2;
    mockBookSearchReturn.hasMore = false;
    
    mockUseBookSearch.mockReturnValue(mockBookSearchReturn);
    
    // Mock URLSearchParams methods
    mockSearchParams.get = vi.fn().mockReturnValue(null);
  });

  test('renders books page in list mode by default', () => {
    renderWithProvider(<BooksPage />);
    expect(screen.getByTestId('book-list')).toBeInTheDocument();
    expect(screen.getByTestId('search-form')).toBeInTheDocument();
  });

  test('switches to grid view mode', () => {
    renderWithProvider(<BooksPage />);
    
    const gridButton = screen.getByTestId('grid-icon').closest('button');
    fireEvent.click(gridButton!);
    
    const bookList = screen.getByTestId('book-list');
    expect(bookList).toHaveAttribute('data-view-mode', 'grid');
  });

  test('switches to list view mode', () => {
    renderWithProvider(<BooksPage />);
    
    const listButton = screen.getByTestId('list-icon').closest('button');
    fireEvent.click(listButton!);
    
    const bookList = screen.getByTestId('book-list');
    expect(bookList).toHaveAttribute('data-view-mode', 'list');
  });

  test('opens add book form', () => {
    renderWithProvider(<BooksPage />);
    
    const addButton = screen.getByTestId('add-icon').closest('button');
    fireEvent.click(addButton!);
    
    expect(screen.getByTestId('book-form')).toBeInTheDocument();
    expect(screen.queryByTestId('book-list')).not.toBeInTheDocument();
  });

  test('renders book list with books', () => {
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByText('Select Test Book 1')).toBeInTheDocument();
    expect(screen.getByText('Edit Test Book 1')).toBeInTheDocument();
    expect(screen.getByText('Delete Test Book 1')).toBeInTheDocument();
    expect(screen.getByText('Select Test Book 2')).toBeInTheDocument();
  });

  test('displays book count', () => {
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByText('2 books in your library')).toBeInTheDocument();
  });

  test('performs search', () => {
    renderWithProvider(<BooksPage />);
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);
    
    // Should update search params with query
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.objectContaining({
        get: expect.any(Function),
        set: expect.any(Function),
      })
    );
  });

  test('clears search', () => {
    // Set up search params with a query so the clear chip appears
    const searchParamsWithQuery = new URLSearchParams();
    searchParamsWithQuery.set('q', 'test query');
    mockUseSearchParams.mockReturnValue([searchParamsWithQuery, mockSetSearchParams]);

    renderWithProvider(<BooksPage />);

    // Click the "Clear search" chip
    const clearChip = screen.getByText('Clear search');
    fireEvent.click(clearChip);

    // Should call clearSearch on the hook
    expect(mockBookSearchReturn.clearSearch).toHaveBeenCalled();
    // Should clear search params
    expect(mockSetSearchParams).toHaveBeenCalledWith({});
  });

  test('renders search form', () => {
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByTestId('search-form')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  test('renders view mode controls', () => {
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByTestId('grid-icon')).toBeInTheDocument();
    expect(screen.getByTestId('list-icon')).toBeInTheDocument();
  });

  test('cancels book form', () => {
    renderWithProvider(<BooksPage />);
    
    // Open add form
    const addButton = screen.getByTestId('add-icon').closest('button');
    fireEvent.click(addButton!);
    
    // Cancel form
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(screen.getByTestId('book-list')).toBeInTheDocument();
    expect(screen.queryByTestId('book-form')).not.toBeInTheDocument();
  });

  test('renders page header with title', () => {
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByText('My Books')).toBeInTheDocument();
  });

  test('handles URL search params on mount', () => {
    mockSearchParams.get = vi.fn((key) => {
      if (key === 'mode') return 'add';
      return null;
    });
    
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByTestId('book-form')).toBeInTheDocument();
  });

  test('handles book interactions', async () => {
    renderWithProvider(<BooksPage />);
    
    // Test add book button triggers add mode
    fireEvent.click(screen.getByTestId('add-icon').closest('button')!);
    expect(screen.getByTestId('book-form')).toBeInTheDocument();
  });

  test('handles loading states', () => {
    mockBookSearchReturn.loading = true;
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByTestId('search-form')).toHaveAttribute('data-loading', 'true');
  });

  test('displays error states', () => {
    mockBookSearchReturn.error = 'Search error';
    renderWithProvider(<BooksPage />);
    
    // Component should still render even with error
    expect(screen.getByTestId('book-list')).toBeInTheDocument();
  });

  test('handles empty book list', () => {
    mockBookSearchReturn.books = [];
    mockBookSearchReturn.totalCount = 0;
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByText('Your personal book collection')).toBeInTheDocument();
  });

  test('handles search params with query', () => {
    mockSearchParams.get = vi.fn((key) => {
      if (key === 'q') return 'test query';
      return null;
    });
    
    renderWithProvider(<BooksPage />);
    
    expect(mockBookSearchReturn.searchBooks).toHaveBeenCalledWith('test query', {});
  });

  test('handles search params with filters', () => {
    mockSearchParams.get = vi.fn((key) => {
      if (key === 'categoryId') return '1';
      if (key === 'authorId') return '2';
      if (key === 'sortBy') return 'title';
      return null;
    });
    
    renderWithProvider(<BooksPage />);
    
    expect(mockBookSearchReturn.searchBooks).toHaveBeenCalledWith('', {
      categoryId: 1,
      authorId: 2,
      sortBy: 'title'
    });
  });

  test('loads user books when no search params', () => {
    mockSearchParams.get = vi.fn().mockReturnValue(null);

    renderWithProvider(<BooksPage />);

    expect(mockBookSearchReturn.searchBooks).toHaveBeenCalledWith('', {});
  });

  test('renders with different book counts', () => {
    mockBookSearchReturn.totalCount = 5;
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByText('5 books in your library')).toBeInTheDocument();
  });

  test('renders singular book count', () => {
    mockBookSearchReturn.totalCount = 1;
    mockBookSearchReturn.books = [{ id: 1, title: 'Single Book', isbn: '123' }];
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByText('1 book in your library')).toBeInTheDocument();
  });

  test('handles has more books', () => {
    mockBookSearchReturn.hasMore = true;
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByTestId('book-list')).toBeInTheDocument();
  });

  test('renders when search error occurs', () => {
    mockBookSearchReturn.error = 'Search failed';
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByTestId('book-list')).toBeInTheDocument();
  });

  test('handles no books scenario', () => {
    mockBookSearchReturn.books = [];
    mockBookSearchReturn.totalCount = 0;
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByText('Your personal book collection')).toBeInTheDocument();
  });

  test('handles getBooks API error', async () => {
    mockBookSearchReturn.searchBooks.mockRejectedValueOnce(new Error('API Error'));

    renderWithProvider(<BooksPage />);

    expect(mockBookSearchReturn.searchBooks).toHaveBeenCalledWith('', {});
  });

  test('renders with search query from URL', () => {
    mockSearchParams.get = vi.fn((key) => {
      if (key === 'q') return 'test search';
      return null;
    });
    
    renderWithProvider(<BooksPage />);
    
    expect(mockBookSearchReturn.searchBooks).toHaveBeenCalledWith('test search', {});
  });

  test('calls status change handler', async () => {
    renderWithProvider(<BooksPage />);
    
    // Use the stored callback
    if (mockOnStatusChange) {
      await mockOnStatusChange(1, 'read');
      expect(mockApiService.updateBook).toHaveBeenCalledWith(1, { status: 'read' });
    }
  });

  test('handles different view modes', () => {
    renderWithProvider(<BooksPage />);
    
    // Click list view
    fireEvent.click(screen.getByTestId('list-icon').closest('button')!);
    
    const bookList = screen.getByTestId('book-list');
    expect(bookList).toHaveAttribute('data-view-mode', 'list');
  });

  test('renders multiple books correctly', () => {
    mockBookSearchReturn.books = [
      { id: 1, title: 'Book 1', isbn: '123' },
      { id: 2, title: 'Book 2', isbn: '456' },
      { id: 3, title: 'Book 3', isbn: '789' }
    ];
    mockBookSearchReturn.totalCount = 3;
    
    renderWithProvider(<BooksPage />);
    
    expect(screen.getByText('3 books in your library')).toBeInTheDocument();
    expect(screen.getByTestId('book-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('book-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('book-item-3')).toBeInTheDocument();
  });

  test('handles all search filter combinations', () => {
    mockSearchParams.get = vi.fn((key) => {
      if (key === 'q') return 'fantasy';
      if (key === 'categoryId') return '5';
      if (key === 'authorId') return '10';
      if (key === 'sortBy') return 'author';
      return null;
    });
    
    renderWithProvider(<BooksPage />);
    
    expect(mockBookSearchReturn.searchBooks).toHaveBeenCalledWith('fantasy', {
      categoryId: 5,
      authorId: 10,
      sortBy: 'author'
    });
  });

  test('handles complex search parameters scenario', () => {
    mockSearchParams.get = vi.fn((key) => {
      if (key === 'categoryId') return '3';
      if (key === 'sortBy') return 'date';
      return null;
    });
    
    renderWithProvider(<BooksPage />);
    
    expect(mockBookSearchReturn.searchBooks).toHaveBeenCalledWith('', {
      categoryId: 3,
      sortBy: 'date'
    });
  });

  test('handles author-only search filter', () => {
    mockSearchParams.get = vi.fn((key) => {
      if (key === 'authorId') return '7';
      return null;
    });
    
    renderWithProvider(<BooksPage />);
    
    expect(mockBookSearchReturn.searchBooks).toHaveBeenCalledWith('', {
      authorId: 7
    });
  });

  test('calls loadMore function when available', () => {
    mockBookSearchReturn.hasMore = true;
    renderWithProvider(<BooksPage />);
    
    expect(mockBookSearchReturn.loadMore).toBeDefined();
  });
});