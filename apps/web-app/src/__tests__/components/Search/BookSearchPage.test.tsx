import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BookSearchPage } from '../../../components/Search/BookSearchPage';
import { useBookSearch } from '../../../hooks/useBookSearch';
import { Book } from '../../../types';

// Mock the useBookSearch hook
jest.mock('../../../hooks/useBookSearch', () => ({
  useBookSearch: jest.fn(),
}));

// Mock child components
jest.mock('../../../components/Search/BookSearchForm', () => ({
  BookSearchForm: ({ onSearch, loading, initialQuery }: any) => (
    <div data-testid="book-search-form">
      <input
        data-testid="search-input"
        defaultValue={initialQuery}
        onChange={(e) => onSearch(e.target.value, {})}
      />
      <button data-testid="search-button" disabled={loading}>
        Search
      </button>
    </div>
  ),
}));

jest.mock('../../../components/Search/BookSearchResults', () => ({
  BookSearchResults: ({
    books,
    loading,
    error,
    totalCount,
    hasMore,
    onLoadMore,
    onBookSelect,
  }: any) => (
    <div data-testid="book-search-results">
      <div data-testid="results-count">{books.length}</div>
      <div data-testid="total-count">{totalCount}</div>
      <div data-testid="loading-state">{loading.toString()}</div>
      <div data-testid="error-state">{error}</div>
      <div data-testid="has-more">{hasMore.toString()}</div>
      {books.map((book: Book) => (
        <div key={book.id} data-testid={`book-${book.id}`}>
          <button onClick={() => onBookSelect(book)}>
            {book.title}
          </button>
        </div>
      ))}
      {hasMore && (
        <button data-testid="load-more" onClick={onLoadMore}>
          Load More
        </button>
      )}
    </div>
  ),
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, ...props }: any) => (
    <div data-testid="box" {...props}>{children}</div>
  ),
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
  Button: ({ children, onClick, variant, startIcon, disabled, ...props }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {startIcon && <span data-testid="start-icon">{startIcon}</span>}
      {children}
    </button>
  ),
  Grid: ({ children, ...props }: any) => (
    <div data-testid="grid" {...props}>{children}</div>
  ),
  Paper: ({ children, ...props }: any) => (
    <div data-testid="paper" {...props}>{children}</div>
  ),
}));

// Mock Material-UI icons
jest.mock('@mui/icons-material', () => ({
  Close: () => <div data-testid="close-icon">Close</div>,
  Add: () => <div data-testid="add-icon">Add</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  MenuBook: () => <div data-testid="menu-book-icon">Book</div>,
  Person: () => <div data-testid="person-icon">Person</div>,
  FilterList: () => <div data-testid="filter-icon">Filter</div>,
}));

const mockUseBookSearch = useBookSearch as jest.MockedFunction<typeof useBookSearch>;

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'Test Book 1',
    authors: [{ id: 1, name: 'Author', surname: 'One' }],
    isbnCode: '1234567890',
    status: 'finished',
    categories: [],
  },
  {
    id: 2,
    title: 'Test Book 2',
    authors: [{ id: 2, name: 'Author', surname: 'Two' }],
    isbnCode: '0987654321',
    status: 'in progress',
    categories: [],
  },
];

const mockNavigate = jest.fn();

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    new URLSearchParams(),
    jest.fn(),
  ],
}));

describe('BookSearchPage', () => {
  const mockSearchBooks = jest.fn();
  const mockClearSearch = jest.fn();
  const mockLoadMore = jest.fn();

  const defaultHookState = {
    books: [],
    loading: false,
    error: null,
    hasMore: false,
    totalCount: 0,
    searchBooks: mockSearchBooks,
    clearSearch: mockClearSearch,
    loadMore: mockLoadMore,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBookSearch.mockReturnValue(defaultHookState);
  });

  const renderWithRouter = (searchParams = '') => {
    return render(
      <MemoryRouter initialEntries={[`/search${searchParams}`]}>
        <BookSearchPage />
      </MemoryRouter>
    );
  };

  test('renders search page with header and form', () => {
    renderWithRouter();

    expect(screen.getByText('Search Books')).toBeInTheDocument();
    expect(screen.getByText('Find books in your library or discover new ones to add')).toBeInTheDocument();
    expect(screen.getByTestId('book-search-form')).toBeInTheDocument();
  });

  test('renders empty state when no search performed', () => {
    renderWithRouter();

    expect(screen.getByText('Search Your Library')).toBeInTheDocument();
    expect(screen.getByText('Use the search form above to find books in your collection, or discover new books to add to your library.')).toBeInTheDocument();
    expect(screen.getByText('Search by Title')).toBeInTheDocument();
    expect(screen.getByText('Search by Author')).toBeInTheDocument();
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
  });

  test('shows search results when books are present', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      totalCount: 2,
    });

    renderWithRouter();

    expect(screen.getByTestId('book-search-results')).toBeInTheDocument();
    expect(screen.getByTestId('results-count')).toHaveTextContent('2');
  });

  test('shows clear search button when books are present', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      totalCount: 2,
    });

    renderWithRouter();

    const clearButton = screen.getByText('Clear search');
    expect(clearButton).toBeInTheDocument();
    
    fireEvent.click(clearButton);
    expect(mockClearSearch).toHaveBeenCalledTimes(1);
  });

  test('shows add new book button when books are present', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      totalCount: 2,
    });

    renderWithRouter();

    const addButton = screen.getByText('Add New Book');
    expect(addButton).toBeInTheDocument();
    
    fireEvent.click(addButton);
    expect(mockNavigate).toHaveBeenCalledWith('/?mode=add');
  });

  test('handles search form submission', () => {
    renderWithRouter();

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(mockSearchBooks).toHaveBeenCalledWith('test query', {});
  });

  test('handles book selection', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      totalCount: 2,
    });

    renderWithRouter();

    const bookButton = screen.getByText('Test Book 1');
    fireEvent.click(bookButton);

    expect(mockNavigate).toHaveBeenCalledWith('/books/1');
  });

  test('passes loading state to search results', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      loading: true,
    });

    renderWithRouter();

    expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
  });

  test('passes error state to search results', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      error: 'Search failed',
    });

    renderWithRouter();

    expect(screen.getByTestId('error-state')).toHaveTextContent('Search failed');
  });

  test('handles load more functionality', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      totalCount: 10,
      hasMore: true,
    });

    renderWithRouter();

    const loadMoreButton = screen.getByTestId('load-more');
    fireEvent.click(loadMoreButton);

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  test('shows error state with clear button', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      error: 'Network error',
    });

    renderWithRouter();

    expect(screen.getByText('Clear search')).toBeInTheDocument();
    expect(screen.getByTestId('error-state')).toHaveTextContent('Network error');
  });

  test('does not show clear button when no books and no error', () => {
    renderWithRouter();

    expect(screen.queryByText('Clear search')).not.toBeInTheDocument();
  });

  test('shows empty state icons and content', () => {
    renderWithRouter();

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByTestId('menu-book-icon')).toBeInTheDocument();
    expect(screen.getByTestId('person-icon')).toBeInTheDocument();
    expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
  });

  test('handles initial query from URL parameters', () => {
    const mockSetSearchParams = jest.fn();
    const mockSearchParams = new URLSearchParams('q=initial+query&categoryId=1&sortBy=title');
    
    jest.doMock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
      useSearchParams: () => [mockSearchParams, mockSetSearchParams],
    }));

    // Re-import to get the mocked version
    const { BookSearchPage: MockedBookSearchPage } = require('../../../components/Search/BookSearchPage');
    
    render(
      <MemoryRouter>
        <MockedBookSearchPage />
      </MemoryRouter>
    );

    // The component should call searchBooks with URL parameters
    expect(mockSearchBooks).toHaveBeenCalledWith('initial query', {
      categoryId: 1,
      sortBy: 'title',
    });
  });

  test('updates URL params when search is performed', () => {
    const mockSetSearchParams = jest.fn();
    
    jest.doMock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
      useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
    }));

    renderWithRouter();

    // Simulate search form submission
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'new query' } });

    // Should update search params and perform search
    expect(mockSearchBooks).toHaveBeenCalledWith('new query', {});
  });

  test('clears URL params when clearing search', () => {
    const mockSetSearchParams = jest.fn();
    
    jest.doMock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
      useSearchParams: () => [new URLSearchParams('q=test'), mockSetSearchParams],
    }));

    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
    });

    renderWithRouter();

    const clearButton = screen.getByText('Clear search');
    fireEvent.click(clearButton);

    expect(mockSetSearchParams).toHaveBeenCalledWith({});
    expect(mockClearSearch).toHaveBeenCalledTimes(1);
  });

  test('passes correct props to BookSearchForm', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      loading: true,
    });

    renderWithRouter();

    const searchForm = screen.getByTestId('book-search-form');
    expect(searchForm).toBeInTheDocument();
    
    const searchButton = screen.getByTestId('search-button');
    expect(searchButton).toBeDisabled();
  });

  test('passes correct props to BookSearchResults', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      loading: false,
      error: 'test error',
      totalCount: 5,
      hasMore: true,
    });

    renderWithRouter();

    expect(screen.getByTestId('results-count')).toHaveTextContent('2');
    expect(screen.getByTestId('total-count')).toHaveTextContent('5');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
    expect(screen.getByTestId('error-state')).toHaveTextContent('test error');
    expect(screen.getByTestId('has-more')).toHaveTextContent('true');
  });

  test('handles component mount and unmount cleanly', () => {
    const { unmount } = renderWithRouter();
    
    expect(() => unmount()).not.toThrow();
  });

  test('maintains responsive layout structure', () => {
    renderWithRouter();

    // Check for main container with proper styling
    const pageContainer = screen.getByText('Search Books').closest('div');
    expect(pageContainer).toHaveStyle({
      maxWidth: '1024px',
      margin: '0 auto',
      padding: '2rem 1rem'
    });
  });

  test('shows proper typography hierarchy', () => {
    renderWithRouter();

    // Main heading
    const mainHeading = screen.getByText('Search Books');
    expect(mainHeading).toHaveClass('text-3xl', 'font-bold');

    // Subheading
    const subHeading = screen.getByText('Find books in your library or discover new ones to add');
    expect(subHeading).toHaveClass('text-lg');
  });
});