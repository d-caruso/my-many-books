import React from 'react';
import { Book } from '../../types';
import { BookCard } from './BookCard';

interface BookListProps {
  books: Book[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  onStatusChange?: (bookId: number, status: Book['status']) => void;
  onBookClick?: (book: Book) => void;
  viewMode?: 'grid' | 'list';
  showActions?: boolean;
}

export const BookList: React.FC<BookListProps> = ({
  books,
  loading = false,
  error = null,
  emptyMessage = 'No books found',
  onEdit,
  onDelete,
  onStatusChange,
  onBookClick,
  viewMode = 'grid',
  showActions = true
}) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text-secondary">Loading books...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-2">
          <span style={{fontSize: '32px'}}>⚠️</span>
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-1">Error Loading Books</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-text-muted mb-4">
          <span style={{fontSize: '64px', display: 'block', marginBottom: '16px'}}>📚</span>
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">{emptyMessage}</h3>
        <p className="text-text-secondary">Start building your library by adding your first book</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onClick={onBookClick}
            showActions={showActions}
            compact={true}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-4 sm:gap-6">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onClick={onBookClick}
          showActions={showActions}
          compact={false}
        />
      ))}
    </div>
  );
};