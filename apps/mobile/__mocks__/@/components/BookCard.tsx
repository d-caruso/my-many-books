import React from 'react';

interface Author {
  name: string;
}

interface Book {
  title?: string;
  authors?: Author[];
  status?: string;
  publishedDate?: string;
}

interface BookCardProps {
  book?: Book;
  onPress?: () => void;
  onStatusChange?: (status: string) => void;
  onDelete?: () => void;
  showActions?: boolean;
}

// Simple mock BookCard for testing
export const BookCard = ({ book, onPress, onStatusChange, onDelete, showActions = true }: BookCardProps) => {
  return (
    <div data-testid="book-card" onClick={onPress}>
      <div data-testid="book-title">{book?.title}</div>
      <div data-testid="book-author">{book?.authors?.map((a: Author) => a.name).join(', ') || 'Unknown Author'}</div>
      <div data-testid="book-status">{book?.status === 'completed' ? 'Completed' : book?.status === 'reading' ? 'Reading' : book?.status}</div>
      {book?.publishedDate && (
        <div>Published: {new Date(book.publishedDate).getFullYear()}</div>
      )}
      {showActions && (
        <div data-testid="book-actions">
          <button onClick={() => onStatusChange?.('completed')}>Mark as Completed</button>
          <button onClick={() => onDelete?.()}>Delete</button>
        </div>
      )}
    </div>
  );
};