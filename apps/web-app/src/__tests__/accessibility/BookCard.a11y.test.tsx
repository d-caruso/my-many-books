import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookCard } from '../../components/Book/BookCard';
import { expectNoA11yViolations } from '../utils/axe-helper';
import type { Book } from '@my-many-books/types';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Card: ({ children, onClick, sx, role, ...props }: any) => (
    <div data-testid="card" onClick={onClick} style={sx} role={role || 'article'} {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, sx }: any) => (
    <div data-testid="card-content" style={sx}>
      {children}
    </div>
  ),
  CardActions: ({ children, sx }: any) => (
    <div data-testid="card-actions" style={sx}>
      {children}
    </div>
  ),
  CardMedia: ({ children, sx, 'aria-label': ariaLabel }: any) => {
    // CardMedia without image should be decorative or have proper role
    if (ariaLabel) {
      return (
        <div data-testid="card-media" style={sx} role="img" aria-label={ariaLabel}>
          {children}
        </div>
      );
    }
    return (
      <div data-testid="card-media" style={sx} aria-hidden="true">
        {children}
      </div>
    );
  },
  Typography: ({ children, variant, component, title, ...props }: any) => {
    const Component = component || 'div';
    return (
      <Component data-testid={`typography-${variant}`} title={title} {...props}>
        {children}
      </Component>
    );
  },
  Chip: ({ label, color, size, ...props }: any) => (
    <span data-testid="chip" data-color={color} data-size={size} role="status" {...props}>
      {label}
    </span>
  ),
  IconButton: ({ children, onClick, 'aria-label': ariaLabel, size, color, ...props }: any) => (
    <button
      data-testid="icon-button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-size={size}
      data-color={color}
      {...props}
    >
      {children}
    </button>
  ),
  MenuItem: ({ children, value, ...props }: any) => (
    <option data-testid="menu-item" value={value} {...props}>
      {children}
    </option>
  ),
  Select: ({ children, value, onChange, onClick, 'aria-label': ariaLabel, label, labelId, ...props }: any) => {
    const ariaLabelValue = ariaLabel || label || 'Select an option';
    return (
      <select
        data-testid="select"
        value={value}
        onChange={onChange}
        onClick={onClick}
        aria-label={ariaLabelValue}
        aria-labelledby={labelId}
        {...props}
      >
        {children}
      </select>
    );
  },
  FormControl: ({ children, ...props }: any) => (
    <div data-testid="form-control" {...props}>
      {children}
    </div>
  ),
  Box: ({ children, ...props }: any) => (
    <div data-testid="box" {...props}>
      {children}
    </div>
  ),
  Stack: ({ children, ...props }: any) => (
    <div data-testid="stack" {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@mui/icons-material', () => ({
  Edit: () => <span data-testid="edit-icon" aria-hidden="true">Edit</span>,
  Delete: () => <span data-testid="delete-icon" aria-hidden="true">Delete</span>,
  MenuBook: () => <span data-testid="book-icon" aria-hidden="true">Book</span>,
}));

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
});

// Setup i18n for tests
i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['translation', 'books', 'accessibility'],
  defaultNS: 'translation',
  resources: {
    en: {
      translation: {},
      books: {},
      accessibility: {
        book_cover: 'Book cover',
        edit_book: 'Edit book',
        delete_book: 'Delete book',
        change_status: 'Change reading status',
      },
    },
  },
});

const mockBook: Book = {
  id: '1',
  title: 'Test Book',
  authors: [{ name: 'John', surname: 'Doe' }],
  status: 'reading',
  isbnCode: '978-0123456789',
  editionNumber: 1,
  editionDate: '2023-01-01',
  notes: 'Great book about testing',
  categories: [
    { id: '1', name: 'Fiction' },
    { id: '2', name: 'Adventure' },
  ],
  userId: 'user1',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

describe('BookCard Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.confirm as any).mockReturnValue(true);
  });

  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <BookCard
          book={mockBook}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onSelect={vi.fn()}
          onStatusChange={vi.fn()}
        />
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations with minimal book data', async () => {
    const minimalBook: Book = {
      id: '2',
      title: 'Minimal Book',
      authors: [],
      status: 'to_read',
      isbnCode: '',
      userId: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <BookCard
          book={minimalBook}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onSelect={vi.fn()}
          onStatusChange={vi.fn()}
        />
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations with completed book', async () => {
    const completedBook: Book = {
      ...mockBook,
      status: 'read',
    };

    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <BookCard
          book={completedBook}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onSelect={vi.fn()}
          onStatusChange={vi.fn()}
        />
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });
});
