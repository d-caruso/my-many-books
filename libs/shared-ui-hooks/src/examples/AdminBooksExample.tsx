import React, { useEffect } from 'react';
import { BooksAPI, useBooks } from '../useBooks';
import { Book, BookFormData } from '@my-many-books/shared-types';

interface AdminBooksExampleProps {
  api: BooksAPI<Book, BookFormData>;
}

export const AdminBooksExample: React.FC<AdminBooksExampleProps> = ({ api }) => {
  const {
    books,
    loadBooks,
    loadMore,
    updateBookStatus,
    deleteBook,
  } = useBooks(api, { autoLoad: false, pageSize: 12 });

  useEffect(() => {
    void loadBooks(1);
  }, [loadBooks]);

  return (
    <div>
      <h2>Admin Book Overview</h2>
      <ul>
        {books.map(book => (
          <li key={book.id}>
            <span>{book.title}</span>
            <button onClick={() => void updateBookStatus(book.id, 'finished')}>Mark Done</button>
            <button onClick={() => void deleteBook(book.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <button onClick={() => void loadMore()} disabled={books.length === 0}>
        Load more
      </button>
    </div>
  );
};
