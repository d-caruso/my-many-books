import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, beforeEach, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { expectNoA11yViolations } from '../utils/axe-helper';

// Mock dependencies
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

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  Button: ({ children, onClick, startIcon, variant, 'aria-label': ariaLabel, ...props }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {startIcon && <span data-testid="button-icon">{startIcon}</span>}
      {children}
    </button>
  ),
  IconButton: ({ children, onClick, 'aria-label': ariaLabel, ...props }: any) => (
    <button
      data-testid="icon-button"
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  ),
  Chip: ({ label, onDelete, ...props }: any) => (
    <div data-testid="chip" {...props}>
      {label}
      {onDelete && <button onClick={onDelete} aria-label="Remove">×</button>}
    </div>
  ),
  Typography: ({ children, variant, component, ...props }: any) => {
    const Component = component || 'div';
    return <Component data-testid={`typography-${variant}`} {...props}>{children}</Component>;
  },
}));

vi.mock('@mui/icons-material', () => ({
  Add: () => <span data-testid="add-icon">Add</span>,
  Clear: () => <span data-testid="clear-icon">Clear</span>,
  ViewModule: () => <span data-testid="grid-icon">Grid</span>,
  ViewList: () => <span data-testid="list-icon">List</span>,
}));

// Mock components
vi.mock('../../components/Book', () => ({
  BookList: ({ books, viewMode }: any) => (
    <div data-testid="book-list" data-view-mode={viewMode} role="list">
      {books?.map((book: any) => (
        <div key={book.id} data-testid={`book-item-${book.id}`} role="listitem">
          {book.title}
        </div>
      ))}
    </div>
  ),
  BookForm: ({ book }: any) => (
    <form data-testid="book-form" aria-label="Book form">
      <input aria-label="Book title" value={book?.title || ''} readOnly />
    </form>
  ),
  BookDetails: ({ book }: any) => (
    <div data-testid="book-details" role="region" aria-label="Book details">
      <h2>{book.title}</h2>
    </div>
  ),
}));

vi.mock('../../components/Search/BookSearchBar', () => ({
  BookSearchBar: ({ onSearch }: any) => (
    <div data-testid="search-bar">
      <label htmlFor="search-input">Search</label>
      <input
        id="search-input"
        type="search"
        onChange={(e) => onSearch?.(e.target.value)}
        aria-label="Search books"
      />
    </div>
  ),
}));

// Import after mocks
import { BooksPage } from '../../pages/BooksPage';
import { ApiProvider } from '../../contexts/ApiContext';

// Setup i18n for tests
i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        books: { add_book: 'Add Book' },
      },
    },
  },
});

describe('BooksPage Accessibility', () => {
  const mockBooks = [
    { id: '1', title: 'Book 1', status: 'read' },
    { id: '2', title: 'Book 2', status: 'reading' },
  ];

  beforeEach(() => {
    const mockSearchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue([mockSearchParams, vi.fn()]);
    mockUseNavigate.mockReturnValue(vi.fn());
    mockUseBookSearch.mockReturnValue({
      books: mockBooks,
      loading: false,
      error: null,
      filters: {},
      handleSearch: vi.fn(),
      clearFilters: vi.fn(),
      setViewMode: vi.fn(),
      viewMode: 'grid',
    });
  });

  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ApiProvider>
          <BooksPage />
        </ApiProvider>
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations in loading state', async () => {
    mockUseBookSearch.mockReturnValue({
      books: [],
      loading: true,
      error: null,
      filters: {},
      handleSearch: vi.fn(),
      clearFilters: vi.fn(),
      setViewMode: vi.fn(),
      viewMode: 'grid',
    });

    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ApiProvider>
          <BooksPage />
        </ApiProvider>
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations with error state', async () => {
    mockUseBookSearch.mockReturnValue({
      books: [],
      loading: false,
      error: 'Failed to load books',
      filters: {},
      handleSearch: vi.fn(),
      clearFilters: vi.fn(),
      setViewMode: vi.fn(),
      viewMode: 'grid',
    });

    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ApiProvider>
          <BooksPage />
        </ApiProvider>
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });
});
