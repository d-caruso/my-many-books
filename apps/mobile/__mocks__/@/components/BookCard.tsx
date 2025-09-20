import React from 'react';

// Simple mock BookCard for testing
export const BookCard = ({ book, onPress, onStatusChange, onDelete, showActions = true }: any) => {
  return (
    <div data-testid="book-card" onClick={onPress}>
      <div data-testid="book-title">{book?.title}</div>
      <div data-testid="book-author">{book?.authors?.map((a: any) => a.name).join(', ') || 'Unknown Author'}</div>
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