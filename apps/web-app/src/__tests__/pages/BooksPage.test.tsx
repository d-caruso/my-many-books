import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import BooksPage from '../../pages/BooksPage';
import { ApiProvider } from '../../contexts/ApiContext';

const mockSetSearchParams = vi.fn();
let currentSearchParams: URLSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [currentSearchParams, mockSetSearchParams],
  useNavigate: () => vi.fn(),
}));

const mockSearchBooks = vi.fn();
const mockClearSearch = vi.fn();
const mockLoadBooks = vi.fn();

vi.mock('../../hooks/useBookSearch', () => ({
  useBookSearch: () => ({
    books: [{ id: 1, title: 'Mock Book', isbn: '123' }],
    loading: false,
    error: null,
    totalCount: 1,
    hasMore: false,
    searchBooks: mockSearchBooks,
    loadMore: vi.fn(),
    clearSearch: mockClearSearch,
  }),
}));

vi.mock('../../hooks/useBooks', () => ({
  useBooks: () => ({
    books: [{ id: 2, title: 'Library Book', isbn: '456' }],
    loading: false,
    error: null,
    totalCount: 1,
    hasMore: false,
    loadBooks: mockLoadBooks,
    loadMore: vi.fn(),
    createBook: vi.fn(),
    updateBook: vi.fn(),
    deleteBook: vi.fn(),
    updateBookStatus: vi.fn(),
    refreshBooks: vi.fn(),
  }),
}));

vi.mock('../../components/Book', () => ({
  BookList: ({ books, onBookSelect }: any) => (
    <div data-testid="book-list">
      {books.map((book: any) => (
        <button key={book.id} onClick={() => onBookSelect(book)}>
          {book.title}
        </button>
      ))}
    </div>
  ),
  BookForm: () => <div data-testid="book-form">Form</div>,
  BookDetails: () => <div data-testid="book-details">Details</div>,
}));

vi.mock('../../components/Search', () => ({
  BookSearchForm: ({ onSearch }: any) => (
    <button data-testid="search-button" onClick={() => onSearch('query', {})}>
      Search
    </button>
  ),
  BookSearchResults: ({ books }: any) => (
    <div data-testid="search-results">{books.length} results</div>
  ),
}));

const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['pages'],
  defaultNS: 'pages',
  resources: {
    en: {
      pages: {
        books: {
          title: 'My Books',
          description: 'Your personal book collection',
          description_with_count_other: '{{count}} books in your library',
          description_with_count_one: '{{count}} book in your library',
          clear_search: 'Clear search',
          books_found: '{{count}} books found',
        },
      },
    },
  },
  interpolation: { escapeValue: false },
});

const mockApiService = {
  getBooks: vi.fn(),
} as any;

const renderBooksPage = () =>
  render(
    <I18nextProvider i18n={testI18n}>
      <ApiProvider apiService={mockApiService}>
        <BooksPage />
      </ApiProvider>
    </I18nextProvider>
  );

describe('BooksPage', () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    mockSearchBooks.mockClear();
    mockClearSearch.mockClear();
    mockLoadBooks.mockClear();
    mockSetSearchParams.mockClear();
  });

  test('renders library view', () => {
    renderBooksPage();
    expect(screen.getByText('My Books')).toBeInTheDocument();
    expect(screen.getByTestId('book-list')).toBeInTheDocument();
    expect(mockLoadBooks).toHaveBeenCalled();
  });

  test('triggers search', () => {
    renderBooksPage();
    fireEvent.click(screen.getByTestId('search-button'));
    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
    const params = mockSetSearchParams.mock.calls[0][0] as URLSearchParams;
    expect(params.get('q')).toBe('query');
  });

  test('shows search results count', () => {
    currentSearchParams = new URLSearchParams([['q', 'query']]);
    renderBooksPage();
    expect(screen.getByText(/books found/)).toBeInTheDocument();
  });
});
