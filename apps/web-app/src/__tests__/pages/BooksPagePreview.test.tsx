import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import BooksPage from '../../pages/BooksPage';
import { ApiProvider } from '../../contexts/ApiContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { useAuth } from '@my-many-books/shared-auth';
import { SAMPLE_PREVIEW_DISMISSED } from '../../constants/sampleBooks';
import type { ApiService } from '../../services/api';
import type { SettingsApi } from '@my-many-books/shared-api';

const mockSetSearchParams = vi.fn();
const mockNavigate = vi.fn();
let currentSearchParams: URLSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [currentSearchParams, mockSetSearchParams],
  useNavigate: () => mockNavigate,
}));

vi.mock('@my-many-books/shared-auth', async () => {
  const actual = await vi.importActual<typeof import('@my-many-books/shared-auth')>('@my-many-books/shared-auth');
  return { ...actual, useAuth: vi.fn() };
});

const emptyBooksState = () => ({
  books: [],
  loading: false,
  error: null,
  totalCount: 0,
  hasMore: false,
  loadBooks: vi.fn().mockResolvedValue(undefined),
  loadMore: vi.fn().mockResolvedValue(undefined),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
  updateBookStatus: vi.fn(),
  refreshBooks: vi.fn(),
});

const emptySearchState = () => ({
  books: [],
  loading: false,
  error: null,
  totalCount: 0,
  hasMore: false,
  searchBooks: vi.fn(),
  loadMore: vi.fn(),
  clearSearch: vi.fn(),
});

vi.mock('../../hooks/useBooks', () => ({ useBooks: () => emptyBooksState() }));
vi.mock('../../hooks/useBookSearch', () => ({ useBookSearch: () => emptySearchState() }));

vi.mock('../../components/Book', () => ({
  BookList: ({ books, emptyMessage }: { books: unknown[]; emptyMessage?: string }) => (
    <div data-testid="book-list">
      {books.length === 0 && <div data-testid="empty-message">{emptyMessage}</div>}
    </div>
  ),
  BookForm: () => <div data-testid="book-form" />,
  BookDetails: () => <div data-testid="book-details" />,
}));

vi.mock('../../components/Search', () => ({
  BookSearchForm: ({ onSearch }: { onSearch: (q: string, f: Record<string, unknown>) => void }) => (
    <button data-testid="search-button" onClick={() => onSearch('query', {})}>Search</button>
  ),
}));

const mockApiService = {
  searchByIsbnDetailed: vi.fn().mockResolvedValue({ found: false }),
} as unknown as ApiService;

const mockSettingsApi = {
  getSettings: vi.fn().mockResolvedValue([]),
  getAllSettingsAdmin: vi.fn().mockResolvedValue([]),
  updateSetting: vi.fn(),
} as unknown as SettingsApi;

const testI18n = i18n.createInstance();
const i18nReady = testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['pages', 'books'],
  defaultNS: 'pages',
  resources: {
    en: {
      books: {
        preview_banner_title: 'Sample library preview',
        preview_banner_description: 'This is what your library could look like. Dismiss to start with your own books.',
        preview_banner_dismiss: 'Dismiss',
        preview_badge: 'Sample',
      },
      pages: {
        books: {
          title: 'My Books',
          description: 'Your personal book collection',
          add_book: 'Add book',
          add: 'Add',
          scan_isbn: 'Scan ISBN',
          grid_view: 'Grid view',
          list_view: 'List view',
          loading: 'Loading books...',
          no_books_empty: 'No books yet',
          no_books_search: 'No books match your search',
          load_more: 'Load more',
        },
      },
    },
  },
  interpolation: { escapeValue: false },
});

const renderBooksPage = () =>
  render(
    <I18nextProvider i18n={testI18n}>
      <ApiProvider apiService={mockApiService}>
        <SettingsProvider settingsApi={mockSettingsApi}>
          <BooksPage />
        </SettingsProvider>
      </ApiProvider>
    </I18nextProvider>
  );

describe('BooksPage — sample preview', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    mockSetSearchParams.mockClear();
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, name: 'Test', surname: 'User', email: 'test@example.com', role: 'user' as const, isActive: true },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true,
    });
  });

  test('shows preview when library is empty and flag is not set', () => {
    renderBooksPage();
    expect(screen.getByText('Sample library preview')).toBeInTheDocument();
  });

  test('does not show preview when flag is already set', () => {
    localStorage.setItem(SAMPLE_PREVIEW_DISMISSED, 'true');
    renderBooksPage();
    expect(screen.queryByText('Sample library preview')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-message')).toBeInTheDocument();
  });

  test('sets flag and hides preview on dismiss', async () => {
    renderBooksPage();
    expect(screen.getByText('Sample library preview')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Dismiss'));

    await waitFor(() => expect(screen.queryByText('Sample library preview')).not.toBeInTheDocument());
    expect(localStorage.getItem(SAMPLE_PREVIEW_DISMISSED)).toBe('true');
  });
});
