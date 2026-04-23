import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { BookDetails } from '../../../components/Book/BookDetails';
import type { Book } from '@my-many-books/shared-types';

const mockBook: Book = {
  id: 1,
  title: 'Test Book',
  authors: [{ name: 'Jane', surname: 'Doe' }],
  status: 'reading',
  isbnCode: '978-0123456789',
};

describe('BookDetails', () => {
  test('renders cover image when coverImageUrlLarge is provided', () => {
    const bookWithCover = { ...mockBook, coverImageUrlLarge: 'https://covers.openlibrary.org/b/id/1-L.jpg' };
    render(<BookDetails book={bookWithCover} />);

    const coverImg = screen.getByAltText('Test Book');
    expect(coverImg).toBeInTheDocument();
    expect(coverImg).toHaveAttribute('src', 'https://covers.openlibrary.org/b/id/1-L.jpg');
    expect(screen.queryByRole('img', { name: /no cover/i })).not.toBeInTheDocument();
  });

  test('renders cover placeholder when coverImageUrlLarge is absent', () => {
    render(<BookDetails book={mockBook} />);

    expect(screen.getByRole('img', { name: /no cover/i })).toBeInTheDocument();
    expect(screen.queryByAltText('Test Book')).not.toBeInTheDocument();
  });

  test('renders guided tour target ids on detail actions', () => {
    render(<BookDetails book={mockBook} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const editButton = screen.getByRole('button', { name: /edit book/i });
    const deleteButton = screen.getByRole('button', { name: /delete book/i });

    expect(editButton).toHaveAttribute('data-tour-id', 'book-detail-edit-btn');
    expect(deleteButton).toHaveAttribute('data-tour-id', 'book-detail-delete-btn');

    fireEvent.click(deleteButton);

    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: /delete book/i })
    ).toHaveAttribute('data-tour-id', 'delete-confirm-btn');
  });
});
