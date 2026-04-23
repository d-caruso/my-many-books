import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Book } from '@my-many-books/shared-types';
import { BookList } from '../../../components/Book/BookList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../components/Book/BookCard', () => ({
  BookCard: ({
    book,
    dataTourId,
  }: {
    book: Book;
    dataTourId?: string;
  }) => (
    <div data-testid={`book-card-${book.id}`} data-tour-id={dataTourId}>
      {book.title}
    </div>
  ),
}));

describe('BookList', () => {
  test('marks only the first rendered card with the guided tour id', () => {
    render(
      <BookList
        books={[
          { id: 1, title: 'First Book' } as Book,
          { id: 2, title: 'Second Book' } as Book,
        ]}
      />
    );

    expect(screen.getByTestId('book-card-1')).toHaveAttribute('data-tour-id', 'book-card-first');
    expect(screen.getByTestId('book-card-2')).not.toHaveAttribute('data-tour-id');
  });
});
