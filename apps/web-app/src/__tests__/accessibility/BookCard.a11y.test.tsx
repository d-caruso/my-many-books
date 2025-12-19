import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, beforeEach, vi } from 'vitest';
import { BookCard } from '../../components/Book/BookCard';
import { expectNoA11yViolations } from '../utils/axe-helper';
import type { Book } from '@my-many-books/types';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { setupMuiMock } from '../test-utils/setupMuiMock';

setupMuiMock();

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
  creationDate: new Date('2023-01-01'),
  updateDate: new Date('2023-01-01'),
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
      status: 'paused',
      isbnCode: '',
      userId: 'user1',
      creationDate: new Date(),
      updateDate: new Date(),
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
      status: 'finished',
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
